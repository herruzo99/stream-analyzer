// Threshold alerting over transport telemetry (capability plan Tier-2 #7).
//
// Pure: given a threshold config and a new sample, decide whether the state
// is healthy/warn/critical and whether a *transition* happened (so the UI can
// record events without spamming). Hysteresis: clearing requires the metric
// to fall back below (threshold - hysteresis) — prevents flapping.

export const DEFAULT_THRESHOLDS = Object.freeze({
    maxRttMs: 80, // warn above; 3× below is critical
    rttCriticalMs: 250,
    maxLossPercent: 1, // sustained loss ratio %
    lossCriticalPercent: 5,
    maxRetransPercent: 5,
    retransCriticalPercent: 15,
    maxDropPercent: 0.5,
    dropCriticalPercent: 2,
    minMbpsRecv: 1, // warn when the receive rate falls below
    hysteresis: 0.2, // fraction of the threshold band
});

const pct = (value, base) => (base > 0 ? (value / base) * 100 : 0);

/**
 * Derive window ratios for a series (uses first/last counters).
 * @param {Array<object>} series
 */
export function windowRatios(series) {
    if (!series?.length) {
        return {
            lossPercent: 0,
            retransPercent: 0,
            dropPercent: 0,
            mbpsRecv: 0,
            rttMs: 0,
        };
    }
    const first = series[0];
    const last = series[series.length - 1];
    const recv = Math.max(1, last.pktRecv - first.pktRecv);
    return {
        lossPercent: pct(last.pktRecvLost - first.pktRecvLost, recv),
        retransPercent: pct(last.pktRetrans - first.pktRetrans, recv),
        dropPercent: pct(last.pktRecvDrop - first.pktRecvDrop, recv),
        mbpsRecv: last.mbpsRecv ?? 0,
        rttMs: last.rttMs ?? 0,
    };
}

/**
 * Evaluate one sample against thresholds.
 * @param {object} sample normalized telemetry sample
 * @param {object} thresholds config (DEFAULT_THRESHOLDS shape)
 * @returns {{level: 'ok'|'warn'|'critical', breaches: Array<{metric:string, value:number, threshold:number, level:string}>}}
 */
export function evaluateAlerts(sample, thresholds = DEFAULT_THRESHOLDS) {
    if (!sample) return { level: 'ok', breaches: [] };
    const breaches = [];

    const check = (metric, value, warnAt, criticalAt, invert = false) => {
        // invert: breach when value < threshold (e.g. minimum rate).
        const severity = invert
            ? value < criticalAt
                ? 'critical'
                : value < warnAt
                  ? 'warn'
                  : null
            : value >= criticalAt
              ? 'critical'
              : value >= warnAt
                ? 'warn'
                : null;
        if (severity) {
            breaches.push({
                metric,
                value,
                threshold: invert ? warnAt : criticalAt,
                level: severity,
            });
        }
    };

    check(
        'rttMs',
        Number(sample.rttMs ?? 0),
        thresholds.maxRttMs,
        thresholds.rttCriticalMs
    );
    check(
        'lossPercent',
        Number(sample.lossRate ?? 0),
        thresholds.maxLossPercent,
        thresholds.lossCriticalPercent
    );
    check(
        'retransPercent',
        Number(sample.retransPercent ?? 0),
        thresholds.maxRetransPercent,
        thresholds.retransCriticalPercent
    );
    check(
        'dropPercent',
        Number(sample.dropPercent ?? 0),
        thresholds.maxDropPercent,
        thresholds.dropCriticalPercent
    );
    check(
        'mbpsRecv',
        Number(sample.mbpsRecv ?? 0),
        thresholds.minMbpsRecv,
        thresholds.minMbpsRecv * 0.2,
        true
    );

    const level = breaches.some((b) => b.level === 'critical')
        ? 'critical'
        : breaches.length > 0
          ? 'warn'
          : 'ok';
    return { level, breaches };
}

/**
 * Hysteresis gate: true when an alert should newly fire (state ok→breach) —
 * transitions only, so history records each breach once per excursion.
 * @param {string} prevLevel previous level ('ok'|'warn'|'critical'|null)
 * @param {string} nextLevel new level
 */
export function shouldFire(prevLevel, nextLevel) {
    if (!prevLevel) return false;
    if (prevLevel === 'ok') return nextLevel !== 'ok';
    // Escalation to critical always fires; warn↔warn doesn't re-fire.
    if (prevLevel === 'warn') return nextLevel === 'critical';
    return false;
}

/** Cleared when a critical/warn state returns to ok. */
export function shouldClear(prevLevel, nextLevel) {
    return prevLevel !== null && prevLevel !== 'ok' && nextLevel === 'ok';
}

const METRIC_LABELS = {
    rttMs: 'RTT',
    lossPercent: 'Loss',
    retransPercent: 'Retransmissions',
    dropPercent: 'Drops',
    mbpsRecv: 'Receive rate',
};

/**
 * Compose a human-readable alert message.
 * @param {{metric:string, value:number, threshold:number, level:string}} breach
 */
export function describeBreach(breach) {
    const label = METRIC_LABELS[breach.metric] ?? breach.metric;
    if (breach.metric === 'mbpsRecv') {
        return `${label} ${breach.value.toFixed(2)} Mbps below minimum ${breach.threshold} Mbps`;
    }
    return `${label} ${breach.value.toFixed(2)} at/over ${breach.threshold}`;
}
