import { redactPlayerText } from '@/features/playerSimulation/application/player-contract.js';

export const ADVERTISING_CONTRACT_LIMITS = Object.freeze({
    streams: 8,
    opportunities: 200,
    creativesPerOpportunity: 100,
    signalsPerOpportunity: 50,
    label: 160,
    detail: 320,
});

/** @param {unknown} value @param {number} [limit] */
const text = (value, limit = ADVERTISING_CONTRACT_LIMITS.label) =>
    redactPlayerText(value, limit);
const finite = (value, min = 0, max = 86400) =>
    Math.min(
        max,
        Math.max(min, Number.isFinite(Number(value)) ? Number(value) : min)
    );

function stableHash(value) {
    let hash = 2166136261;
    for (const character of String(value)) {
        hash ^= character.codePointAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
}

const stableId = (prefix, value) => `${prefix}-${stableHash(value)}`;

const projectCreative = (creative, streamId, opportunityId, index) =>
    Object.freeze({
        id: stableId(
            'sa-ad-creative',
            `${streamId}:${opportunityId}:${creative?.id ?? index}`
        ),
        label: text(creative?.id ?? `Creative ${index + 1}`),
        duration: finite(creative?.duration),
        mediaAvailable: Boolean(creative?.mediaFileUrl),
        trackerCount: Math.min(
            ADVERTISING_CONTRACT_LIMITS.signalsPerOpportunity,
            Array.from(creative?.trackingUrls?.values?.() ?? []).reduce(
                (count, urls) =>
                    count + (Array.isArray(urls) ? urls.length : 0),
                0
            )
        ),
    });

const projectOpportunity = (avail, streamId, index) => {
    const rawId = avail?.id ?? `${avail?.startTime ?? 0}:${index}`;
    const id = stableId('sa-ad-opportunity', `${streamId}:${rawId}`);
    const creatives = (avail?.creatives ?? [])
        .slice(0, ADVERTISING_CONTRACT_LIMITS.creativesPerOpportunity)
        .map((creative, creativeIndex) =>
            projectCreative(creative, streamId, rawId, creativeIndex)
        );
    const errors = [
        ...(avail?.vmapInfo?.errors ?? []),
        ...(avail?.scte224Signal?.errors ?? []),
    ]
        .slice(0, ADVERTISING_CONTRACT_LIMITS.signalsPerOpportunity)
        .map((error) => text(error, ADVERTISING_CONTRACT_LIMITS.detail));
    const hasExternalDocument = Boolean(avail?.adManifestUrl);
    const state = errors.length
        ? 'malformed'
        : hasExternalDocument && creatives.length === 0
          ? 'partial'
          : creatives.length
            ? 'ready'
            : 'detected';
    return Object.freeze({
        id,
        label: text(rawId),
        detectionMethod: text(avail?.detectionMethod ?? 'UNKNOWN', 64),
        start: finite(avail?.startTime),
        duration: finite(avail?.duration),
        state,
        stateLabel: {
            malformed: 'Malformed external evidence',
            partial: 'Partial external evidence',
            ready: 'Resolved evidence',
            detected: 'Signal detected',
        }[state],
        hasScte35: Boolean(avail?.scte35Signal),
        hasScte224: Boolean(avail?.scte224Signal),
        hasExternalDocument,
        networkEvidenceId: hasExternalDocument
            ? stableId('sa-ad-network', `${streamId}:${rawId}:manifest`)
            : null,
        playbackEvidenceId: stableId(
            'sa-ad-playback',
            `${streamId}:${rawId}:${finite(avail?.startTime)}`
        ),
        creatives: Object.freeze(creatives),
        errors: Object.freeze(errors),
        truncated:
            (avail?.creatives?.length ?? 0) >
                ADVERTISING_CONTRACT_LIMITS.creativesPerOpportunity ||
            (avail?.vmapInfo?.errors?.length ?? 0) +
                (avail?.scte224Signal?.errors?.length ?? 0) >
                ADVERTISING_CONTRACT_LIMITS.signalsPerOpportunity,
    });
};

export function createAdvertisingModel(analysisState) {
    const stream = (analysisState?.streams ?? []).find(
        (candidate) => candidate?.id === analysisState?.activeStreamId
    );
    if (!stream)
        return Object.freeze({
            schemaVersion: 1,
            stream: null,
            opportunities: Object.freeze([]),
            truncated: false,
            limits: ADVERTISING_CONTRACT_LIMITS,
        });
    const all = stream.adAvails ?? [];
    const opportunities = Object.freeze(
        all
            .slice(0, ADVERTISING_CONTRACT_LIMITS.opportunities)
            .map((avail, index) =>
                projectOpportunity(avail, text(stream.id, 96), index)
            )
            .sort((left, right) => left.start - right.start)
    );
    return Object.freeze({
        schemaVersion: 1,
        stream: Object.freeze({
            id: stableId('sa-ad-stream', text(stream.id, 96)),
            label: text(stream.name ?? 'Active stream'),
        }),
        opportunities,
        truncated: all.length > ADVERTISING_CONTRACT_LIMITS.opportunities,
        limits: ADVERTISING_CONTRACT_LIMITS,
    });
}
