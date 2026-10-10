import { redactPlayerText } from '@/features/playerSimulation/application/player-contract.js';

export const COMPARISON_LIMITS = Object.freeze({
    streams: 8,
    variantsPerStream: 32,
    rows: 64,
    segmentsPerTrack: 200,
    label: 120,
    detail: 240,
});

/** @param {unknown} value @param {number} [limit] */
const text = (value, limit = COMPARISON_LIMITS.label) =>
    redactPlayerText(value, limit);

const finite = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

function stableHash(value) {
    let hash = 2166136261;
    for (const character of String(value)) {
        hash ^= character.codePointAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
}

const stableId = (prefix, value) => `${prefix}-${stableHash(value)}`;

const streamKey = (stream) => text(stream?.id, 96);

function projectVariants(stream) {
    return Object.freeze(
        (stream?.manifest?.variants ?? [])
            .slice(0, COMPARISON_LIMITS.variantsPerStream)
            .map((variant, index) => {
                const key = text(variant?.stableId ?? variant?.id ?? index, 96);
                return Object.freeze({
                    key,
                    id: stableId(
                        'sa-comparison-variant',
                        `${streamKey(stream)}:${key}`
                    ),
                    label: text(
                        variant?.attributes?.RESOLUTION ??
                            variant?.name ??
                            `Variant ${index + 1}`
                    ),
                });
            })
    );
}

function projectStream(stream) {
    const key = streamKey(stream);
    return Object.freeze({
        key,
        id: stableId('sa-comparison-stream', key),
        label: text(stream?.name ?? 'Unnamed stream'),
        protocol: text(stream?.protocol ?? 'unknown', 16).toUpperCase(),
        kind:
            stream?.manifest?.type === 'dynamic'
                ? 'Live'
                : stream?.manifest?.type === 'static'
                  ? 'VOD'
                  : 'Unknown',
        variants: projectVariants(stream),
    });
}

/**
 * @param {import('@/types').Stream} stream
 * @param {string[]} path
 * @param {unknown} [fallback]
 */
const summaryValue = (stream, path, fallback = 'Unavailable') => {
    /** @type {unknown} */
    let value = stream?.manifest?.summary;
    for (const part of path) {
        if (!value || typeof value !== 'object') {
            value = undefined;
            break;
        }
        value = /** @type {Record<string, unknown>} */ (value)[part];
    }
    if (value === undefined || value === null || value === '')
        return text(fallback, COMPARISON_LIMITS.detail);
    if (Array.isArray(value))
        return text(
            value
                .slice(0, 12)
                .map((item) => item?.value ?? item?.label ?? item)
                .join(', '),
            COMPARISON_LIMITS.detail
        );
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return 'Available';
    return text(value, COMPARISON_LIMITS.detail);
};

/** @type {ReadonlyArray<readonly [string, string[], unknown]>} */
const ROW_DEFINITIONS = Object.freeze([
    ['Protocol', ['general', 'protocol'], 'Unavailable'],
    ['Presentation type', ['general', 'streamType'], 'Unavailable'],
    ['Duration', ['general', 'duration'], 'Unavailable'],
    ['Video tracks', ['content', 'totalVideoTracks'], 0],
    ['Audio tracks', ['content', 'totalAudioTracks'], 0],
    ['Text tracks', ['content', 'totalTextTracks'], 0],
    ['Low latency', ['lowLatency', 'isLowLatency'], false],
    ['Encrypted', ['security', 'isEncrypted'], false],
]);

function comparisonRows(reference, candidate) {
    return Object.freeze(
        ROW_DEFINITIONS.slice(0, COMPARISON_LIMITS.rows).map(
            ([label, path, fallback]) => {
                const referenceValue = summaryValue(reference, path, fallback);
                const candidateValue = summaryValue(candidate, path, fallback);
                return Object.freeze({
                    id: stableId('sa-comparison-row', label),
                    label,
                    referenceValue,
                    candidateValue,
                    status:
                        referenceValue === candidateValue
                            ? 'same'
                            : 'different',
                });
            }
        )
    );
}

function rawSegments(stream, variantKey) {
    if (stream?.protocol === 'hls') {
        const states = stream.hlsVariantState;
        if (!(states instanceof Map)) return [];
        const selected = variantKey ? states.get(variantKey) : null;
        if (selected?.segments) return selected.segments;
        for (const state of states.values())
            if (state?.segments?.length) return state.segments;
    }
    if (stream?.protocol === 'dash') {
        const states = stream.dashRepresentationState;
        if (!(states instanceof Map)) return [];
        for (const state of states.values())
            if (state?.segments?.length) return state.segments;
    }
    return [];
}

function timelineItems(stream, variantKey, identity) {
    const all = rawSegments(stream, variantKey).filter(
        (segment) => segment?.type !== 'Init'
    );
    return Object.freeze(
        all
            .slice(0, COMPARISON_LIMITS.segmentsPerTrack)
            .map((segment, index) => {
                const scale = finite(segment?.timescale, 1) || 1;
                return Object.freeze({
                    id: stableId(
                        'sa-comparison-segment',
                        `${identity}:${segment?.number ?? index}`
                    ),
                    label: text(segment?.number ?? `Segment ${index + 1}`, 48),
                    start: finite(segment?.time) / scale,
                    duration: Math.max(0, finite(segment?.duration) / scale),
                    gap: Boolean(segment?.gap),
                });
            })
    );
}

export function createComparisonModel(analysisState, uiState) {
    const rawStreams = (analysisState?.streams ?? []).slice(
        0,
        COMPARISON_LIMITS.streams
    );
    const streams = Object.freeze(rawStreams.map(projectStream));
    const requestedReference = uiState?.comparisonReferenceStreamId;
    const requestedCandidate = uiState?.comparisonCandidateStreamId;
    const reference =
        rawStreams.find(
            (stream) => String(stream?.id) === String(requestedReference)
        ) ??
        rawStreams[0] ??
        null;
    const candidate =
        rawStreams.find(
            (stream) => String(stream?.id) === String(requestedCandidate)
        ) ??
        rawStreams.find(
            (stream) => String(stream?.id) !== String(reference?.id)
        ) ??
        null;
    const referenceVariant = text(
        uiState?.comparisonReferenceVariantId ?? '',
        96
    );
    const candidateVariant = text(
        uiState?.comparisonCandidateVariantId ?? '',
        96
    );
    let state = 'ready';
    let message = 'Comparison is ready.';
    if (rawStreams.length < 2) {
        state = 'ineligible';
        message = 'Load two analyzed streams to compare them.';
    } else if (!reference || !candidate) {
        state = 'partial';
        message = 'Reference or candidate analysis is unavailable.';
    } else if (String(reference.id) === String(candidate.id)) {
        state = 'incompatible';
        message = 'Reference and candidate must be different streams.';
    } else if (!reference.manifest?.summary || !candidate.manifest?.summary) {
        state = 'partial';
        message = 'Comparison is partial while analysis data is unavailable.';
    }
    const referenceIdentity = reference
        ? stableId(
              'sa-comparison-selection',
              `${streamKey(reference)}:${referenceVariant || 'master'}`
          )
        : null;
    const candidateIdentity = candidate
        ? stableId(
              'sa-comparison-selection',
              `${streamKey(candidate)}:${candidateVariant || 'master'}`
          )
        : null;
    const rows =
        state === 'ready'
            ? comparisonRows(reference, candidate)
            : Object.freeze([]);
    const tracks = Object.freeze([
        Object.freeze({
            id: referenceIdentity,
            label: reference ? projectStream(reference).label : 'Reference',
            items: reference
                ? timelineItems(reference, referenceVariant, referenceIdentity)
                : Object.freeze([]),
        }),
        Object.freeze({
            id: candidateIdentity,
            label: candidate ? projectStream(candidate).label : 'Candidate',
            items: candidate
                ? timelineItems(candidate, candidateVariant, candidateIdentity)
                : Object.freeze([]),
        }),
    ]);
    return Object.freeze({
        schemaVersion: 1,
        state,
        message,
        streams,
        referenceKey: reference ? streamKey(reference) : '',
        candidateKey: candidate ? streamKey(candidate) : '',
        referenceId: referenceIdentity,
        candidateId: candidateIdentity,
        rows,
        tracks,
        truncated: Object.freeze({
            streams:
                (analysisState?.streams?.length ?? 0) >
                COMPARISON_LIMITS.streams,
            timeline: tracks.some(
                (track, index) =>
                    rawSegments(
                        index === 0 ? reference : candidate,
                        index === 0 ? referenceVariant : candidateVariant
                    ).length > COMPARISON_LIMITS.segmentsPerTrack
            ),
        }),
        limits: COMPARISON_LIMITS,
    });
}
