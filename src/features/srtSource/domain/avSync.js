// A/V synchronization analysis (capability plan Tier-2 #9).
//
// Pure math over the PTS/PCR data extracted by tsAnalytics:
//   - offset: video PTS vs audio PTS relative to PCR (presentation offset)
//   - drift: per-stream PTS rate vs PCR rate (ppm) — the classic clock
//     mismatch detector; video presenting faster/slower than its timestamps
//     will show up as non-zero drift
// PTS and PCR are 90 kHz ticks here.

const TICKS_PER_MS = 90;

const findStream = (streams, matcher) => (streams ?? []).find(matcher);
const isVideo = (kind) => String(kind).startsWith('video');
const isAudio = (kind) => String(kind).startsWith('audio');

/**
 * Compute A/V offset and per-stream drifts.
 *
 * @param {{ptsStreams?: Array<{pid:number, kind:string, count:number, first:number, last:number}>,
 *          pts?: {streams?: Array<{pid:number, kind:string, count:number, first:number, last:number}>}}} data
 * @returns {{offsetMs: number|null, offsetDirection: string|null, drifts: Array<{pid:number, kind:string, ppm:number}>, warnings: string[]}}
 */
export function analyzeAvSync(data, pcr = {}) {
    const warnings = [];
    const streams = data?.ptsStreams ?? data?.pts?.streams ?? [];
    const video = findStream(streams, (s) => isVideo(s.kind));
    const audio = findStream(streams, (s) => isAudio(s.kind));

    const pcrSpan =
        pcr.last != null && pcr.first != null ? pcr.last - pcr.first : null;

    const drifts = [];
    for (const stream of streams) {
        if (stream.count < 2 || pcrSpan == null || pcrSpan <= 0) continue;
        const ptsSpan = stream.last - stream.first;
        if (ptsSpan <= 0) continue;
        const rate = ptsSpan / pcrSpan;
        const ppm = Math.round((rate - 1) * 1e6);
        drifts.push({ pid: stream.pid, kind: stream.kind, ppm });
        if (Math.abs(ppm) > 1000)
            warnings.push(`${stream.kind} drift ${ppm} ppm exceeds ±1000 ppm`);
    }

    let offsetMs = null;
    let offsetDirection = null;
    if (video && audio) {
        const offsetTicks = video.first - audio.first;
        offsetMs = Math.round((offsetTicks / TICKS_PER_MS) * 100) / 100;
        offsetDirection =
            offsetMs > 0
                ? 'audio early'
                : offsetMs < 0
                  ? 'video early'
                  : 'aligned';
    } else {
        warnings.push(
            'A/V offset needs both video and audio PTS in the window'
        );
    }

    return { offsetMs, offsetDirection, drifts, warnings };
}

/**
 * PTS discontinuity summary from the tsAnalytics export.
 * @param {{pts?: {discontinuities?: number}}} analytics
 */
export function summarizeDiscontinuities(analytics) {
    const d = analytics?.pts?.discontinuities ?? 0;
    return {
        count: d,
        level: d === 0 ? 'ok' : d < 10 ? 'warn' : 'error',
    };
}
