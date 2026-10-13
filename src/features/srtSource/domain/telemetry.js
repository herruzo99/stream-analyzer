// SRT telemetry domain: normalization of helper LinkTelemetry samples into
// bounded UI records, derived signals (loss ratio, retransmission ratio),
// and the SRT compliance rule family (analysis doc §5/Phase 3). Pure functions,
// heux-contract tested.

export const TELEMETRY_LIMITS = Object.freeze({
    maxSeries: 1800, // 30 min at 1 Hz
    rttMs: 60000,
    mbps: 100000,
    lossPercent: 100,
});

export const SRT_RULE_IDS = Object.freeze({
    ENCRYPTION_OFF: 'srt.encryption-off',
    LATENCY_LOW: 'srt.latency-below-120ms',
    LATENCY_VS_RTT: 'srt.latency-lt-3x-rtt',
    TOO_LATE_DROPS: 'srt.too-late-drops',
    RETRANS_RATIO: 'srt.retransmission-ratio',
    BUFFER_STARVED: 'srt.buffer-starved',
    LOSS_RATE: 'srt.sustained-loss',
    STREAMID_MISSING: 'srt.streamid-missing',
});

const clamp = (v, max) =>
    Number.isFinite(v) ? Math.min(max, Math.max(0, v)) : 0;
const ratio = (num, den) => (den > 0 ? num / den : 0);

/**
 * Normalize one raw LinkTelemetry sample from the helper into a bounded
 * UI record. Non-finite values become 0 (the helper already does this, but
 * the contract must hold for recordings/replayed telemetry too).
 * @param {Record<string, unknown>} raw
 */
export function normalizeTelemetry(raw) {
    const t = Number(raw.t ?? 0);
    const num = (k) => clamp(Number(raw[k] ?? 0), Number.MAX_SAFE_INTEGER);
    return {
        t: Number.isFinite(t) ? Math.max(0, t) : 0,
        rttMs: clamp(Number(raw.rttMs ?? 0), TELEMETRY_LIMITS.rttMs),
        mbpsSend: clamp(Number(raw.mbpsSendRate ?? 0), TELEMETRY_LIMITS.mbps),
        mbpsRecv: clamp(Number(raw.mbpsRecvRate ?? 0), TELEMETRY_LIMITS.mbps),
        mbpsLink: clamp(
            Number(raw.mbpsLinkCapacity ?? 0),
            TELEMETRY_LIMITS.mbps
        ),
        pktRecv: num('pktRecv'),
        pktRecvUnique: num('pktRecvUnique'),
        pktRecvLoss: num('pktRecvLoss'),
        pktRecvLost: num('pktRecvLost'),
        pktRetrans: num('pktRetrans'),
        pktRecvRetrans: num('pktRecvRetrans'),
        pktRecvDrop: num('pktRecvDrop'),
        pktRecvBelated: num('pktRecvBelated'),
        pktRecvUndecrypt: num('pktRecvUndecrypt'),
        msRecvBuf: num('msRecvBuf'),
        msSendBuf: num('msSendBuf'),
        msRcvTsbpd: num('msRcvTsbpdDelay'),
        msSndTsbpd: num('msSndTsbpdDelay'),
        lossRate: clamp(
            Number(raw.pktRecvLossRate ?? 0),
            TELEMETRY_LIMITS.lossPercent
        ),
        encrypted: Boolean(raw.encrypted),
    };
}

/**
 * Derived analysis signals for one session's telemetry series.
 * @param {Array<ReturnType<typeof normalizeTelemetry>>} series
 */
export function deriveSignals(series) {
    const empty = {
        lossRatio: 0,
        retransRatio: 0,
        dropRatio: 0,
        maxRtt: 0,
        avgRtt: 0,
        lostTotal: 0,
    };
    if (!Array.isArray(series) || series.length === 0) return empty;
    const samples = series.map(normalizeTelemetry);
    const last = samples[samples.length - 1];
    const first = samples[0];
    const pktRecv = Math.max(1, last.pktRecv - first.pktRecv);
    const retrans = last.pktRetrans - first.pktRetrans;
    const drops = last.pktRecvDrop - first.pktRecvDrop;
    const lost = last.pktRecvLost - first.pktRecvLost;
    const rtts = series.map((s) => s.rttMs).filter((v) => v > 0);
    return {
        lossRatio: ratio(lost, pktRecv),
        retransRatio: clamp(Number(ratio(retrans, pktRecv)) * 100, 100),
        dropRatio: clamp(Number(ratio(drops, pktRecv)) * 100, 100),
        maxRtt: rtts.length ? Math.max(...rtts) : 0,
        avgRtt: rtts.length ? rtts.reduce((a, b) => a + b, 0) / rtts.length : 0,
        lostTotal: lost,
    };
}

/**
 * Evaluate the SRT compliance rule family over a session's telemetry.
 * Rules reference the SRT RFC draft (min TSBPD 120 ms, 3-4x RTT
 * recommendation) and operational heuristics.
 *
 * @param {object} session  { encrypted, streamId }
 * @param {Array<ReturnType<typeof normalizeTelemetry>>} series Newest last.
 * @returns {Array<{id: string, severity: 'info'|'warn'|'error', message: string}>}
 */
export function evaluateSrtRules(session, series) {
    /** @type {{id: string, severity: 'info'|'warn'|'error', message: string}[]} */
    const issues = [];
    const s = session ?? {};
    const samples = (Array.isArray(series) ? series : []).map(
        normalizeTelemetry
    );
    const latest = samples.length > 0 ? samples[samples.length - 1] : null;
    const sig = deriveSignals(samples);

    if (latest && !latest.encrypted) {
        issues.push({
            id: SRT_RULE_IDS.ENCRYPTION_OFF,
            severity: 'warn',
            message:
                'SRT link is unencrypted; any observer on the path can read the stream.',
        });
    }
    if (!s.streamId) {
        issues.push({
            id: SRT_RULE_IDS.STREAMID_MISSING,
            severity: 'info',
            message:
                'No streamid set; publishing without one limits routing/interop options.',
        });
    }
    if (latest && latest.msRcvTsbpd > 0 && latest.msRcvTsbpd < 120) {
        issues.push({
            id: SRT_RULE_IDS.LATENCY_LOW,
            severity: 'error',
            message: `Negotiated receiver TSBPD delay is ${latest.msRcvTsbpd} ms; the SRT minimum is 120 ms.`,
        });
    }
    if (
        latest &&
        sig.avgRtt > 0 &&
        latest.msRcvTsbpd > 0 &&
        latest.msRcvTsbpd < sig.avgRtt * 3
    ) {
        issues.push({
            id: SRT_RULE_IDS.LATENCY_VS_RTT,
            severity: 'warn',
            message: `Latency ${latest.msRcvTsbpd} ms is below 3x measured RTT (${sig.avgRtt.toFixed(1)} ms); retransmissions will have little room.`,
        });
    }
    if (sig.dropRatio > 0.5) {
        issues.push({
            id: SRT_RULE_IDS.TOO_LATE_DROPS,
            severity: sig.dropRatio > 2 ? 'error' : 'warn',
            message: `${sig.dropRatio.toFixed(2)}% of packets were dropped as too late; increase latency or reduce jitter.`,
        });
    }
    if (sig.retransRatio > 5) {
        issues.push({
            id: SRT_RULE_IDS.RETRANS_RATIO,
            severity: sig.retransRatio > 15 ? 'error' : 'warn',
            message: `Retransmission ratio ${sig.retransRatio.toFixed(2)}% is high for a live link.`,
        });
    }
    // Buffer starved: recent samples with empty receiver buffer while receiving.
    const recent = samples.slice(-10);
    const starved = recent.filter(
        (x) => x.msRecvBuf === 0 && x.pktRecv > 0
    ).length;
    if (recent.length >= 5 && starved >= 4) {
        issues.push({
            id: SRT_RULE_IDS.BUFFER_STARVED,
            severity: 'warn',
            message:
                'Receiver buffer frequently empty; the source is not sustaining the configured rate.',
        });
    }
    if (sig.lossRatio > 0.02) {
        issues.push({
            id: SRT_RULE_IDS.LOSS_RATE,
            severity: sig.lossRatio > 0.05 ? 'error' : 'warn',
            message: `Sustained packet loss ${(sig.lossRatio * 100).toFixed(2)}% (${sig.lostTotal} packets).`,
        });
    }
    return issues;
}

/**
 * Correlate transport telemetry with TS-level continuity errors (Phase 3).
 * The TS side comes from the analyzer's existing continuity analysis of the
 * façade segments; here we align both timelines by wall-clock time.
 *
 * @param {Array<{t:number, continuityErrors:number}>} tsEvents
 * @param {Array<ReturnType<typeof normalizeTelemetry>>} series
 */
export function correlateLoss(tsEvents, series) {
    if (!tsEvents?.length || !series?.length) return [];
    const samples = series.map(normalizeTelemetry);
    const out = [];
    for (const ev of tsEvents) {
        let nearest = null;
        let best = Infinity;
        for (const s of samples) {
            const d = Math.abs(s.t - ev.t);
            if (d < best) {
                best = d;
                nearest = s;
            }
        }
        if (nearest) {
            out.push({
                t: ev.t,
                continuityErrors: ev.continuityErrors,
                rttMs: nearest.rttMs,
                pktRecvLost: nearest.pktRecvLost,
                pktRecvDrop: nearest.pktRecvDrop,
                alignedWithinMs: best,
            });
        }
    }
    return out;
}
