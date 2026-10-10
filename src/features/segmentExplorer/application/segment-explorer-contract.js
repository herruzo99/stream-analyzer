const CONTRACT_VERSION = 1;
const MAX_TRACKS = 256;
const MAX_SEGMENTS = 5000;
const MAX_LABEL_LENGTH = 96;

function boundedText(value, fallback = '') {
    const text = String(value ?? fallback).replace(/[\r\n\t]+/g, ' ').trim();
    return text.slice(0, MAX_LABEL_LENGTH);
}

function stableHash(value) {
    let hash = 0x811c9dc5;
    for (const character of String(value)) {
        hash ^= character.codePointAt(0);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(36);
}

function inspectionId(streamId, representationId, segment) {
    const sourceIdentity =
        segment.timelineId ??
        [segment.number ?? 'index', segment.time ?? 0, segment.uniqueId ?? ''].join(
            ':'
        );
    return `sa-inspection:v${CONTRACT_VERSION}:${stableHash(
        `${streamId}:${representationId}:${sourceIdentity}`
    )}`;
}

function cacheState(entry) {
    if (!entry) return 'missing';
    if (entry.status === -1) return 'fetching';
    if (
        entry.status >= 400 ||
        (entry.parsedData && entry.parsedData.error)
    ) {
        return 'error';
    }
    if (entry.status === 200 && entry.parsedData) return 'ready';
    if (entry.status === 200) return 'partial';
    return 'missing';
}

/**
 * Builds the bounded, versioned application-to-view contract for F-021.
 *
 * The caller keeps ownership of parsed streams, bytes, fetches and cache
 * entries. This projection carries opaque inspection IDs and literal display
 * values only.
 *
 * @param {object | null} stream
 * @param {{ tracks?: ReadonlyArray<object>, timeBounds?: object, isLive?: boolean } | null} projection
 * @param {{ activeTab?: string, activeRepresentationId?: string | null, selected?: object | null, targetTime?: Date | null, cacheEntry?: (uniqueId: string) => object | undefined }} [options]
 */
export function buildSegmentExplorerModel(stream, projection, options = {}) {
    if (!stream) {
        return {
            version: CONTRACT_VERSION,
            status: 'empty',
            message: 'Load a stream to inspect its segments.',
            rows: [],
            representations: [],
            selectedId: null,
            targetIndex: -1,
            truncated: false,
        };
    }
    if (!projection || !Array.isArray(projection.tracks)) {
        return {
            version: CONTRACT_VERSION,
            status: 'error',
            message: 'Segment projection is unavailable.',
            rows: [],
            representations: [],
            selectedId: null,
            targetIndex: -1,
            truncated: false,
        };
    }

    const rows = [];
    const representations = [];
    let truncated = projection.tracks.length > MAX_TRACKS;
    const tracks = projection.tracks.slice(0, MAX_TRACKS);

    for (const track of tracks) {
        const representationId = boundedText(track.id, 'unknown');
        representations.push({
            id: representationId,
            label: boundedText(track.label, representationId),
            bandwidth: Number.isFinite(track.bandwidth) ? track.bandwidth : 0,
        });
        const segments = Array.isArray(track.segments) ? track.segments : [];
        for (const segment of segments) {
            if (rows.length >= MAX_SEGMENTS) {
                truncated = true;
                break;
            }
            const id = inspectionId(stream.id, representationId, segment);
            const start = Number.isFinite(segment.start)
                ? segment.start
                : Number(segment.time ?? 0) / Number(segment.timescale || 1);
            const duration = Number.isFinite(segment.durationSec)
                ? segment.durationSec
                : Number(segment.duration ?? 0) /
                  Number(segment.timescale || 1);
            rows.push({
                id,
                representationId,
                segmentUniqueId: String(segment.uniqueId ?? ''),
                number:
                    typeof segment.number === 'number' ? segment.number : null,
                type: boundedText(segment.type, 'Media'),
                start: Number.isFinite(start) ? start : 0,
                duration: Number.isFinite(duration) ? duration : 0,
                stale: segment._isStale === true,
                state: cacheState(options.cacheEntry?.(segment.uniqueId)),
                source: segment,
            });
        }
        if (rows.length >= MAX_SEGMENTS) break;
    }

    const selected = options.selected?.item ?? options.selected;
    const selectedRow =
        rows.find(
            (row) =>
                row.segmentUniqueId === String(selected?.uniqueId ?? '') &&
                (!selected?.repId ||
                    row.representationId === String(selected.repId))
        ) ?? null;
    const targetSeconds =
        options.targetTime instanceof Date
            ? options.targetTime.getTime() / 1000
            : null;
    const targetIndex =
        targetSeconds === null || rows.length === 0
            ? -1
            : rows.reduce(
                  (best, row, index) =>
                      Math.abs(row.start - targetSeconds) <
                      Math.abs(rows[best].start - targetSeconds)
                          ? index
                          : best,
                  0
              );

    return {
        version: CONTRACT_VERSION,
        status: rows.length === 0 ? 'empty' : 'ready',
        message:
            rows.length === 0
                ? `No ${boundedText(options.activeTab, 'media')} segments are available.`
                : '',
        rows,
        representations,
        activeRepresentationId:
            representations.find(
                (item) => item.id === options.activeRepresentationId
            )?.id ??
            representations[0]?.id ??
            null,
        selectedId: selectedRow?.id ?? null,
        targetIndex,
        truncated,
        isLive: projection.isLive === true,
        timeBounds: {
            start: Number(projection.timeBounds?.start ?? 0),
            end: Number(projection.timeBounds?.end ?? 0),
            duration: Number(projection.timeBounds?.duration ?? 0),
        },
    };
}

export const SEGMENT_EXPLORER_CONTRACT_LIMITS = Object.freeze({
    version: CONTRACT_VERSION,
    maxTracks: MAX_TRACKS,
    maxSegments: MAX_SEGMENTS,
});
