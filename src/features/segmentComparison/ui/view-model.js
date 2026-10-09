/**
 * Segment-comparison view-model: selects the two segments under comparison.
 *
 * Reconstructed for the port (imported but never committed). Contract,
 * derived from the index call sites: `selectSegmentComparisonState()`
 * returns `{ availableSegments, segmentA, segmentB }` where each entry
 * wraps the analysis-store segment (`{ segment, label, repId }`), and
 * selection resolves through `uiStore.segmentComparisonSelection`
 * (`{ idA, idB }` uniqueIds, wired by the header callbacks).
 */
import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore } from '@/state/uiStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore.js';
import { createComparisonModel } from '../domain/comparisonEngine.js';

const collectSegments = (stream) => {
    if (!stream) return [];
    const out = [];
    const maps = [stream.dashRepresentationState, stream.hlsVariantState];
    for (const stateMap of maps) {
        if (!stateMap || typeof stateMap.forEach !== 'function') continue;
        stateMap.forEach((repState, repId) => {
            const segments = repState?.segments;
            if (!Array.isArray(segments)) return;
            segments.forEach((segment, index) => {
                if (!segment?.uniqueId) return;
                const label =
                    segment.label ||
                    (typeof segment.url === 'string'
                        ? segment.url.split('/').pop()
                        : null) ||
                    `${repId}#${index}`;
                out.push({ segment, label, repId });
            });
        });
    }
    return out;
};

export const selectSegmentComparisonState = () => {
    const { streams, activeStreamId } = useAnalysisStore.getState();
    const { segmentComparisonSelection } = useUiStore.getState();
    const stream = streams.find((s) => s.id === activeStreamId);
    const availableSegments = collectSegments(stream);
    const byId = new Map(
        availableSegments.map((entry) => [entry.segment.uniqueId, entry])
    );
    const segmentA =
        byId.get(segmentComparisonSelection?.idA) ||
        availableSegments[0] ||
        null;
    const segmentB =
        byId.get(segmentComparisonSelection?.idB) ||
        availableSegments[1] ||
        null;
    return {
        availableSegments,
        segmentA,
        segmentB,
        isEmpty: availableSegments.length === 0,
        structuralDiff: buildStructuralDiff(stream, segmentA, segmentB),
    };
}

const formatForUrl = (url) => {
    const lower = String(url || '').toLowerCase();
    if (lower.endsWith('.ts')) return 'ts';
    if (lower.endsWith('.vtt')) return 'vtt';
    return 'isobmff';
};

const enrichSegment = (stream, entry) => {
    if (!entry?.segment) return null;
    const url =
        entry.segment.resolvedUrl || entry.segment.url || entry.segment.uniqueId;
    let parsedData = null;
    try {
        const cache = useSegmentCacheStore.getState();
        parsedData =
            cache.get(url)?.parsedData ||
            cache.get(entry.segment.uniqueId)?.parsedData ||
            null;
    } catch {
        parsedData = null;
    }
    const boxes = parsedData?.data?.boxes;
    if (!Array.isArray(boxes)) return null;
    return {
        format: formatForUrl(url),
        stream: { name: stream?.name || stream?.id || 'Stream' },
        segment: { ...entry.segment, data: { boxes } },
    };
};

/**
 * Best-effort structural diff via the comparison engine. Returns [] when
 * either side lacks parsed box data (the diff tree renders an empty
 * state), so the view stays robust.
 */
const buildStructuralDiff = (stream, segmentA, segmentB) => {
    try {
        const enriched = [segmentA, segmentB]
            .map((entry) => enrichSegment(stream, entry))
            .filter(Boolean);
        if (enriched.length < 2) return [];
        const model = createComparisonModel(enriched);
        return Array.isArray(model?.structuralDiff)
            ? model.structuralDiff
            : [];
    } catch {
        return [];
    }
};
