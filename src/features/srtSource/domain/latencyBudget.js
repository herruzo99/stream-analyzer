// Latency budget breakdown (capability plan Tier-2 #10).
//
// Combines the measurable stages of an SRT-to-browser path:
//   1. link half-RTT (SRT RTT/2 — the fixed component per the SRT draft)
//   2. negotiated TSBPD delay (recovery buffer)
//   3. helper retention (live window: segments × target duration × 2 reloads)
//   4. player jitter buffer (shaka/WebCodecs when a session is loaded)
// Unknown stages are reported as null with a reason — never fabricated.

export const BUDGET_DEFAULTS = Object.freeze({
    playlistTargetSec: 2,
    windowSegments: 96,
    playlistReloads: 2, // edge→player re-request margin
});

/**
 * @param {object} input
 * @param {number|null} [input.rttMs]       SRT RTT
 * @param {number|null} [input.tsbpdMs]     negotiated receiver TSBPD delay
 * @param {number|null} [input.playerBufMs] player jitter buffer (null = unknown)
 * @param {number} [input.windowSegments]
 * @param {number} [input.playlistTargetSec]
 * @returns {{stages: Array<{id:string,label:string,ms:number|null,reason?:string}>, totalMs:number|null, unknown:number}}
 */
export function latencyBudget({
    rttMs = null,
    tsbpdMs = null,
    playerBufMs = null,
    windowSegments = BUDGET_DEFAULTS.windowSegments,
    playlistTargetSec = BUDGET_DEFAULTS.playlistTargetSec,
}) {
    const stages = [
        {
            id: 'link',
            label: 'Link half-RTT (fixed)',
            ms: rttMs != null && rttMs > 0 ? Math.round(rttMs / 2) : null,
            ...(rttMs ? {} : { reason: 'no RTT sample yet' }),
        },
        {
            id: 'tsbpd',
            label: 'SRT TSBPD delay (recovery buffer)',
            ms: tsbpdMs != null && tsbpdMs > 0 ? tsbpdMs : null,
            ...(tsbpdMs ? {} : { reason: 'not negotiated yet' }),
        },
        {
            id: 'helper',
            label: `Helper window (${windowSegments} × ${playlistTargetSec}s × ${BUDGET_DEFAULTS.playlistReloads} reloads)`,
            ms: Math.round(
                windowSegments *
                    playlistTargetSec *
                    1000 *
                    BUDGET_DEFAULTS.playlistReloads
            ),
        },
        {
            id: 'player',
            label: 'Player jitter buffer',
            ms: playerBufMs != null ? playerBufMs : null,
            ...(playerBufMs != null
                ? {}
                : { reason: 'no player session loaded' }),
        },
    ];
    const known = stages.filter((s) => s.ms != null);
    const unknown = stages.length - known.length;
    return {
        stages,
        totalMs: unknown === 0 ? known.reduce((sum, s) => sum + s.ms, 0) : null,
        unknown,
    };
}

/**
 * Fixed end-to-end estimate per the SRT draft: RTT/2 + SRT latency.
 * Useful even without helper/player stages.
 * @param {number|null} rttMs
 * @param {number|null} latencyMs negotiated SRT latency
 */
export function srtFixedLatency(rttMs, latencyMs) {
    if (!rttMs || !latencyMs) return null;
    return Math.round(rttMs / 2) + latencyMs;
}
