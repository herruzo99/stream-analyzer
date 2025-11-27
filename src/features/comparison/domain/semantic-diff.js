/**
 * @typedef {object} TimelineItem
 * @property {number} start
 * @property {number} duration
 * @property {number} end
 * @property {'segment' | 'period' | 'ad' | 'gap' | 'drift' | 'content'} type
 * @property {string} label
 */

// Helper: safe division preventing NaN/Infinity
const safeDiv = (n, d) => {
    if (n === undefined || n === null) return 0;
    if (d === undefined || d === null || d === 0) return n; // Assume seconds if timescale missing
    return n / d;
};

/**
 * Extracts a flattened list of media segments from the stream's internal state.
 * @param {import('@/types').Stream} stream
 * @returns {TimelineItem[]}
 */
function extractSegments(stream) {
    let rawSegments = [];

    if (stream.protocol === 'hls') {
        const stateMap = stream.hlsVariantState;
        // 1. Try Active Variant
        if (
            stream.activeMediaPlaylistId &&
            stateMap.has(stream.activeMediaPlaylistId)
        ) {
            rawSegments = stateMap.get(stream.activeMediaPlaylistId).segments;
        }
        // 2. Best Effort Fallback
        if ((!rawSegments || rawSegments.length === 0) && stateMap.size > 0) {
            for (const variant of stateMap.values()) {
                if (variant.segments && variant.segments.length > 0) {
                    rawSegments = variant.segments;
                    break;
                }
            }
        }
    } else if (stream.protocol === 'dash') {
        // DASH: Find first populated representation
        for (const state of stream.dashRepresentationState.values()) {
            if (state.segments && state.segments.length > 0) {
                rawSegments = state.segments;
                break;
            }
        }
    }

    if (!rawSegments || rawSegments.length === 0) return [];

    // TS Fix: Explicitly cast the mapped array to TimelineItem[]
    return rawSegments
        .filter((s) => s.type !== 'Init')
        .map((s) => {
            const timescale = s.timescale || 1;
            const start = safeDiv(s.time, timescale);
            const duration = safeDiv(s.duration, timescale);

            if (duration <= 0) return null;

            /** @type {TimelineItem} */
            const item = {
                start,
                duration,
                end: start + duration,
                type: s.gap ? 'gap' : 'segment',
                label: `#${s.number}`,
            };
            return item;
        })
        .filter((item) => item !== null);
}

/**
 * Extracts high-level structure (Periods/Ad Breaks) if segments are missing.
 * @param {import('@/types').Stream} stream
 * @returns {TimelineItem[]}
 */
function extractStructure(stream) {
    /** @type {TimelineItem[]} */
    const items = [];
    const manifest = stream.manifest;

    (stream.adAvails || []).forEach((ad) => {
        items.push({
            start: ad.startTime,
            duration: ad.duration,
            end: ad.startTime + ad.duration,
            type: 'ad',
            label: 'Ad Break',
        });
    });

    const hasMultiplePeriods = manifest.periods && manifest.periods.length > 1;
    if (hasMultiplePeriods) {
        manifest.periods.forEach((p, i) => {
            const start = p.start || 0;
            let duration = p.duration;
            if (duration === null || duration === undefined) {
                duration = (manifest.duration || 0) - start;
            }

            if (duration > 0) {
                items.push({
                    start,
                    duration,
                    end: start + duration,
                    type: 'period',
                    label: `Period ${i + 1}`,
                });
            }
        });
    }

    // Absolute Fallback: Whole Stream Block
    if (items.length === 0) {
        const duration = manifest.duration || 60;
        items.push({
            start: 0,
            duration: duration,
            end: duration,
            type: 'content',
            label: 'Stream Timeline',
        });
    }

    return items;
}

/**
 * Calculates the semantic difference model between two streams.
 * @param {import('@/types').Stream} streamA Reference Stream
 * @param {import('@/types').Stream} streamB Candidate Stream
 */
export function calculateSemanticDiff(streamA, streamB) {
    let itemsA = extractSegments(streamA);
    if (!itemsA || itemsA.length === 0) itemsA = extractStructure(streamA);

    let itemsB = extractSegments(streamB);
    if (!itemsB || itemsB.length === 0) itemsB = extractStructure(streamB);

    const maxDurA = itemsA.length > 0 ? itemsA[itemsA.length - 1].end : 0;
    const maxDurB = itemsB.length > 0 ? itemsB[itemsB.length - 1].end : 0;
    const duration = Math.max(maxDurA, maxDurB, 60);

    const deltaItems = [];

    // Diffing Logic
    const hasSegmentsA = itemsA.some((i) => i.type === 'segment');
    const hasSegmentsB = itemsB.some((i) => i.type === 'segment');

    if (hasSegmentsA && hasSegmentsB) {
        itemsA.forEach((segA) => {
            if (segA.type !== 'segment') return;

            const match = itemsB.find(
                (segB) => Math.abs(segB.start - segA.start) < 0.1
            );

            if (!match) {
                deltaItems.push({
                    start: segA.start,
                    duration: segA.duration,
                    end: segA.end,
                    type: 'gap',
                    label: 'Missing in B',
                });
            } else if (Math.abs(segA.duration - match.duration) > 0.05) {
                deltaItems.push({
                    start: segA.start,
                    duration: segA.duration,
                    end: segA.end,
                    type: 'drift',
                    label: `Δ ${(segA.duration - match.duration).toFixed(2)}s`,
                });
            }
        });
    }

    return {
        trackA: { name: streamA.name, items: itemsA },
        trackB: { name: streamB.name, items: itemsB },
        diffTrack: { name: 'Delta', items: deltaItems },
        duration,
    };
}
