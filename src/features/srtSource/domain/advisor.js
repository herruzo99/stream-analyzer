// SRT link config advisor (capability plan Tier-3 #14).
//
// Pure recommendations derived from observed telemetry, per the SRT draft's
// rules: minimum TSBPD delay 120 ms, recommended 3-4× RTT; inputbw should
// cover the source bitrate with headroom for retransmissions (LiveCC keeps
// ~5-10% overhead for retransmission space).

export const ADVISOR_DEFAULTS = Object.freeze({
    minLatencyMs: 120,
    latencyRttFactor: 4, // draft: "recommended value is 3-4 times RTT"
    headroomFactor: 1.3, // inputbw = peak bitrate × factor (retransmission space)
    defaultPbkeylen: 16,
    highSecurityPbkeylen: 32,
    defaultFC: 25600,
    lossThresholdForAes256: 5, // sustained loss % at/over which AES-256 is suggested
});

const round = (v) => Math.round(v);

/**
 * Compute SRT link recommendations from a telemetry series.
 *
 * @param {Array<object>} series normalized telemetry samples (link stats)
 * @param {object} [options]
 * @param {number} [options.highSecurity] 1 forces AES-256
 * @returns {{latencyMs:number, maxbwBps:number, inputbwBps:number, pbkeylen:number, fc:number, rationale:string[]}}
 */
export function adviseLinkConfig(series, options = {}) {
    const rationale = [];
    if (!series?.length) {
        return {
            latencyMs: 250,
            maxbwBps: 0,
            inputbwBps: 0,
            pbkeylen: options.highSecurity
                ? ADVISOR_DEFAULTS.highSecurityPbkeylen
                : ADVISOR_DEFAULTS.defaultPbkeylen,
            fc: ADVISOR_DEFAULTS.defaultFC,
            rationale: [
                'No telemetry yet; showing conservative defaults (latency 250 ms, AES-128).',
            ],
        };
    }

    const rtts = series.map((s) => Number(s.rttMs ?? 0)).filter((v) => v > 0);
    const rttMax = rtts.length ? Math.max(...rtts) : 0;
    const rttAvg = rtts.length
        ? rtts.reduce((a, b) => a + b, 0) / rtts.length
        : 0;
    const rates = series.map((s) => Number(s.mbpsRecv ?? 0));
    const peakMbps = Math.max(...rates, 0);
    const avgMbps =
        rates.reduce((a, b) => a + b, 0) / Math.max(1, rates.length);

    // Latency: max(120, 4× the worst observed RTT), rounded up to 25 ms.
    const latencyRaw = Math.max(
        ADVISOR_DEFAULTS.minLatencyMs,
        rttMax * ADVISOR_DEFAULTS.latencyRttFactor,
        rttAvg * ADVISOR_DEFAULTS.latencyRttFactor
    );
    // The 120 ms RFC floor is exact; the 25 ms grid applies above it only.
    const latencyMs =
        latencyRaw <= ADVISOR_DEFAULTS.minLatencyMs
            ? ADVISOR_DEFAULTS.minLatencyMs
            : Math.ceil(latencyRaw / 25) * 25;
    if (rttMax > 0) {
        rationale.push(
            `latency=${latencyMs} ms = max(120 ms floor, ${ADVISOR_DEFAULTS.latencyRttFactor}× observed RTT ${rttMax.toFixed(1)} ms)`
        );
    } else {
        rationale.push('latency=120 ms floor applied (no RTT samples yet)');
    }

    // Bandwidth: peak × 1.3 headroom, in bytes/s.
    const inputbwBps = round(
        peakMbps * 1048576 * ADVISOR_DEFAULTS.headroomFactor
    );
    rationale.push(
        `inputbw=${inputbwBps} B/s = peak ${peakMbps.toFixed(2)} Mbps × ${ADVISOR_DEFAULTS.headroomFactor} retransmission headroom`
    );

    // Key length escalation under sustained loss.
    const last = series[series.length - 1];
    const loss = Number(last.lossRate ?? 0);
    const pbkeylen =
        options.highSecurity || loss >= ADVISOR_DEFAULTS.lossThresholdForAes256
            ? ADVISOR_DEFAULTS.highSecurityPbkeylen
            : ADVISOR_DEFAULTS.defaultPbkeylen;
    if (pbkeylen === ADVISOR_DEFAULTS.highSecurityPbkeylen) {
        rationale.push(
            `pbkeylen=32: sustained loss ${loss.toFixed(2)}% (or explicit high-security request) — but note encryption adds overhead; fix loss first`
        );
    } else {
        rationale.push(
            'pbkeylen=16 (AES-128) is the default; 32 only if you need it and loss is fixable'
        );
    }

    if (avgMbps > 0 && peakMbps > 0) {
        rationale.push(
            `Flow window left at library default (${ADVISOR_DEFAULTS.defaultFC} packets); raise with latency if drops persist.`
        );
    }

    return {
        latencyMs,
        maxbwBps: inputbwBps, // also feeds maxbw (LiveCC ceiling) conservatively
        inputbwBps,
        pbkeylen,
        fc: ADVISOR_DEFAULTS.defaultFC,
        rationale,
    };
}

/**
 * Render recommendations as srt:// query parameters (ready to paste).
 * @param {ReturnType<typeof adviseLinkConfig>} advice
 */
export function adviceToQuery(advice) {
    const params = [`latency=${advice.latencyMs}`];
    if (advice.inputbwBps > 0) params.push(`inputbw=${advice.inputbwBps}`);
    if (advice.maxbwBps > 0) params.push(`maxbw=${advice.maxbwBps}`);
    params.push(`pbkeylen=${advice.pbkeylen}`);
    return params.join('&');
}
