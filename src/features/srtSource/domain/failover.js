// Multi-session failover comparison (capability plan Tier-2 #8).
//
// Pure alignment of N telemetry series onto a common time axis so main and
// backup links can be overlaid, plus the derived comparison signals a
// redundancy engineer looks at: rate delta, RTT delta, loss delta.

/**
 * Align series by relative time (t - sessionStart), sampled at 1 Hz.
 * @param {Array<{id: string, start: number, series: Array<object>}>} sessions
 * @returns {Array<{tSec: number, values: Record<string, number | null>}>}
 */
export function alignSeries(sessions, field) {
    if (!sessions?.length) return [];
    /** @type {Array<{tSec: number, values: Record<string, number | null>}>} */
    const out = [];
    const aligned = sessions.map(({ id, start, series }) => {
        /** @type {Map<number, number>} */
        const bySec = new Map();
        for (const s of series ?? []) {
            const sec = Math.round((Number(s.t ?? 0) - start) / 1000);
            bySec.set(sec, Number(s[field] ?? 0));
        }
        return { id, bySec };
    });
    const maxLen = Math.max(
        ...aligned.map((a) => (a.bySec.size ? Math.max(...a.bySec.keys()) : 0))
    );
    for (let t = 0; t <= maxLen; t++) {
        /** @type {Record<string, number | null>} */
        const values = {};
        for (const a of aligned) values[a.id] = a.bySec.get(t) ?? null;
        out.push({ tSec: t, values });
    }
    return out;
}

/**
 * Pairwise comparison of exactly two sessions (main/backup).
 * @param {object} a {id, start, series}
 * @param {object} b {id, start, series}
 * @returns {{rateDeltaMbps: number, rttDeltaMs: number, lossDeltaPct: number, betterRate: string|null, betterRtt: string|null, samples: number}}
 */
export function compareTwo(a, b) {
    const rate = alignSeries([a, b], 'mbpsRecv').filter(
        (p) => p.values[a.id] != null && p.values[b.id] != null
    );
    const rtt = alignSeries([a, b], 'rttMs').filter(
        (p) => p.values[a.id] != null && p.values[b.id] != null
    );
    const loss = alignSeries([a, b], 'lossRate').filter(
        (p) => p.values[a.id] != null && p.values[b.id] != null
    );

    const avg = (rows, id) =>
        rows.length
            ? rows.reduce((s, r) => s + Number(r.values[id] ?? 0), 0) /
              rows.length
            : 0;

    const rateA = avg(rate, a.id);
    const rateB = avg(rate, b.id);
    const rttA = avg(rtt, a.id);
    const rttB = avg(rtt, b.id);
    const lossA = avg(loss, a.id);
    const lossB = avg(loss, b.id);

    return {
        rateDeltaMbps: Math.round((rateA - rateB) * 100) / 100,
        rttDeltaMs: Math.round((rttA - rttB) * 100) / 100,
        lossDeltaPct: Math.round((lossA - lossB) * 1000) / 1000,
        betterRate: rateA === rateB ? null : rateA > rateB ? a.id : b.id,
        betterRtt: rttA === rttB ? null : rttA < rttB ? a.id : b.id,
        samples: Math.min(rate.length, rtt.length, loss.length),
    };
}
