const CONTRACT_VERSION = 1;
const MAX_TRACKS = 64;
const MAX_ITEMS = 2000;
const MAX_LABEL_LENGTH = 96;
const CONNECTION_STATES = new Set([
    'current',
    'stale',
    'reconnecting',
    'error',
]);

function boundedText(value, fallback = '') {
    return String(value ?? fallback)
        .replace(/[\r\n\t]+/g, ' ')
        .trim()
        .slice(0, MAX_LABEL_LENGTH);
}

function finiteNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function stableHash(value) {
    let hash = 0x811c9dc5;
    for (const character of String(value)) {
        hash ^= character.codePointAt(0);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(36);
}

function generationIdentity(stream) {
    const updateIdentity =
        stream.activeManifestUpdateId ??
        stream.manifestUpdates?.[0]?.id ??
        stream.manifest?.publishTime ??
        stream.manifest?.availabilityStartTime ??
        'initial';
    return stableHash(`${stream.id}:${updateIdentity}`);
}

function timelineIdentity(generation, trackId, item, index) {
    const sourceIdentity =
        item.id ??
        item.data?.id ??
        [item.type ?? 'item', item.originalStart ?? item.start, index].join(
            ':'
        );
    return `sa-timeline:v${CONTRACT_VERSION}:${generation}:${stableHash(
        `${trackId}:${sourceIdentity}:${item.start}:${item.end}`
    )}`;
}

function connectionState(stream, requestedState) {
    if (CONNECTION_STATES.has(requestedState)) return requestedState;
    if (stream.wasStoppedByInactivity) return 'stale';
    return 'current';
}

/**
 * Builds the bounded application-owned timing contract consumed by F-023.
 * HEUX receives literal labels, finite timing values and opaque versioned IDs;
 * parser, clock, selection and chart ownership stay in streamAnalyzer.
 *
 * @param {object | null} stream
 * @param {{ tracks?: ReadonlyArray<object>, chartBounds?: { min?: number, max?: number }, isLive?: boolean, driftHistory?: ReadonlyArray<object> } | null} projection
 * @param {{ activeTab?: string, selected?: object | null, connectionState?: string }} [options]
 */
export function buildTimelineModel(stream, projection, options = {}) {
    if (!stream) {
        return {
            version: CONTRACT_VERSION,
            generation: null,
            status: 'empty',
            connectionState: 'current',
            message: 'Load a stream to inspect timing evidence.',
            isLive: false,
            activeTab: 'overview',
            rows: [],
            groups: [],
            selectedId: null,
            bounds: { min: 0, max: 0, duration: 0 },
            drift: null,
            truncated: false,
        };
    }

    if (!projection || !Array.isArray(projection.tracks)) {
        return {
            version: CONTRACT_VERSION,
            generation: generationIdentity(stream),
            status: 'error',
            connectionState: connectionState(stream, options.connectionState),
            message: 'Timeline projection is unavailable.',
            isLive: stream.manifest?.type === 'dynamic',
            activeTab:
                options.activeTab === 'drilldown' ? 'drilldown' : 'overview',
            rows: [],
            groups: [],
            selectedId: null,
            bounds: { min: 0, max: 0, duration: 0 },
            drift: null,
            truncated: false,
        };
    }

    const generation = generationIdentity(stream);
    const tracks = projection.tracks.slice(0, MAX_TRACKS);
    const rows = [];
    const groups = [];
    const min = finiteNumber(projection.chartBounds?.min);
    const max = Math.max(min, finiteNumber(projection.chartBounds?.max, min));
    const boundsDuration = Math.max(0, max - min);
    let truncated = projection.tracks.length > MAX_TRACKS;

    for (const track of tracks) {
        const trackId = boundedText(track.id, 'track');
        const group = {
            id: trackId,
            label: boundedText(track.label, trackId),
            rowIds: [],
        };
        const items = Array.isArray(track.items) ? track.items : [];
        for (const [index, item] of items.entries()) {
            if (rows.length >= MAX_ITEMS) {
                truncated = true;
                break;
            }
            const start = finiteNumber(item.start);
            const end = Math.max(start, finiteNumber(item.end, start));
            const duration = Math.max(
                0,
                finiteNumber(item.duration, end - start)
            );
            const id = timelineIdentity(generation, trackId, item, index);
            rows.push({
                id,
                generation,
                trackId,
                trackLabel: group.label,
                type: boundedText(item.type, 'event'),
                label: boundedText(item.label, item.type ?? 'Event'),
                start,
                end,
                duration,
                offsetPercent:
                    boundsDuration === 0
                        ? 0
                        : Math.min(
                              100,
                              Math.max(
                                  0,
                                  ((start - min) / boundsDuration) * 100
                              )
                          ),
                widthPercent:
                    boundsDuration === 0
                        ? 1
                        : Math.min(
                              100,
                              Math.max(0.5, (duration / boundsDuration) * 100)
                          ),
                source: item,
            });
            group.rowIds.push(id);
        }
        groups.push(group);
        if (rows.length >= MAX_ITEMS) break;
    }

    for (const row of rows) {
        row.widthPercent = Math.min(100 - row.offsetPercent, row.widthPercent);
    }

    const selectedContractId = options.selected?._timelineContractId;
    const selectedId = rows.some((row) => row.id === selectedContractId)
        ? selectedContractId
        : null;
    const driftHistory = Array.isArray(projection.driftHistory)
        ? projection.driftHistory
        : [];
    const latestDrift = driftHistory.at(-1)?.drift;

    return {
        version: CONTRACT_VERSION,
        generation,
        status: rows.length === 0 ? 'empty' : 'ready',
        connectionState: connectionState(stream, options.connectionState),
        message:
            rows.length === 0
                ? 'No bounded timing events are available for this stream.'
                : '',
        isLive: projection.isLive === true,
        activeTab: options.activeTab === 'drilldown' ? 'drilldown' : 'overview',
        rows,
        groups,
        selectedId,
        bounds: { min, max, duration: boundsDuration },
        drift: Number.isFinite(latestDrift) ? latestDrift : null,
        truncated,
    };
}

export const TIMELINE_CONTRACT_LIMITS = Object.freeze({
    version: CONTRACT_VERSION,
    maxTracks: MAX_TRACKS,
    maxItems: MAX_ITEMS,
    maxLabelLength: MAX_LABEL_LENGTH,
});
