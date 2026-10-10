import { redactNetworkUrl } from '@/features/networkAnalysis/application/network-contract.js';

export const PLAYER_CONTRACT_LIMITS = Object.freeze({
    tracksPerKind: 100,
    events: 100,
    history: 300,
    label: 160,
    detail: 512,
    codec: 160,
    roles: 16,
});

const SECRET_TEXT =
    /\b(authorization|bearer|credential|password|secret|token)\b\s*[:=]?\s*[^\s,;]+/gi;
const URL_TEXT = /https?:\/\/[^\s"'<>]+/gi;

/** @param {number} [limit] */
const boundedText = (value, limit = PLAYER_CONTRACT_LIMITS.label) =>
    String(value ?? '').slice(0, limit);
const finite = (value, maximum = Number.MAX_SAFE_INTEGER) =>
    Math.min(
        maximum,
        Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0)
    );

/** @param {number} [limit] */
export function redactPlayerText(value, limit = PLAYER_CONTRACT_LIMITS.detail) {
    return boundedText(value, limit)
        .replace(URL_TEXT, (url) => redactNetworkUrl(url))
        .replace(SECRET_TEXT, '$1=[redacted]');
}

const projectTrack = (track, kind, index) =>
    Object.freeze({
        id: boundedText(track?.id ?? `${kind}-${index + 1}`, 96),
        kind,
        label: redactPlayerText(
            track?.label ?? track?.language ?? `${kind} ${index + 1}`,
            PLAYER_CONTRACT_LIMITS.label
        ),
        language: boundedText(track?.language ?? 'und', 32),
        codec: boundedText(
            track?.videoCodec ?? track?.audioCodec ?? track?.codecs ?? '',
            PLAYER_CONTRACT_LIMITS.codec
        ),
        resolution:
            finite(track?.width, 16384) && finite(track?.height, 16384)
                ? `${finite(track.width, 16384)}×${finite(track.height, 16384)}`
                : '',
        bandwidth: finite(
            track?.videoBandwidth ?? track?.audioBandwidth ?? track?.bandwidth,
            10 ** 12
        ),
        roles: Object.freeze(
            (Array.isArray(track?.roles) ? track.roles : [])
                .slice(0, PLAYER_CONTRACT_LIMITS.roles)
                .map((role) => boundedText(role, 48))
        ),
        active: track?.active === true,
    });

const projectTracks = (tracks, kind) =>
    Object.freeze(
        (Array.isArray(tracks) ? tracks : [])
            .slice(0, PLAYER_CONTRACT_LIMITS.tracksPerKind)
            .map((track, index) => projectTrack(track, kind, index))
    );

const projectEvent = (event, index) =>
    Object.freeze({
        id: boundedText(event?.id ?? `event-${index + 1}`, 96),
        type: boundedText(event?.type ?? 'status', 32),
        timestamp: boundedText(event?.timestamp ?? '', 48),
        detail: redactPlayerText(event?.details ?? event?.detail ?? ''),
    });

/**
 * @typedef {{ supported?: boolean, status?: string, detail?: string }} PlayerCapability
 * @typedef {{ id?: string, name?: string, patchedManifestUrl?: string, originalUrl?: string }} PlayerStream
 */

/**
 * @param {import('@/types').PlayerState} playerState
 * @param {PlayerCapability} capability
 */
const lifecycleState = (playerState, capability) => {
    if (capability?.supported === false) return 'unsupported';
    if (capability?.status === 'rejected') return 'rejected';
    const lastError = (playerState?.eventLog ?? []).find(
        (event) => event?.type === 'error'
    );
    if (lastError && !playerState?.isLoaded) return 'error';
    if (playerState?.retryCount > 0) return 'retrying';
    if (playerState?.isLoaded) return 'ready';
    return 'idle';
};

/**
 * @param {{ playerState: import('@/types').PlayerState, stream?: PlayerStream | null, capability?: PlayerCapability }} input
 */
export function createPlayerModel({
    playerState,
    stream = null,
    capability = {},
}) {
    const state = lifecycleState(playerState, capability);
    const stats = playerState.currentStats;
    const events = Object.freeze(
        (Array.isArray(playerState.eventLog) ? playerState.eventLog : [])
            .slice(0, PLAYER_CONTRACT_LIMITS.events)
            .map(projectEvent)
    );

    return Object.freeze({
        schemaVersion: 1,
        state,
        stateLabel: state.replace(/^./, (character) => character.toUpperCase()),
        detail:
            events.find((event) => event.type === 'error')?.detail ??
            redactPlayerText(
                capability?.detail ?? 'Player is ready to launch.'
            ),
        stream: stream
            ? Object.freeze({
                  id: boundedText(stream.id, 96),
                  label: redactPlayerText(
                      stream.name ?? 'Active stream',
                      PLAYER_CONTRACT_LIMITS.label
                  ),
                  source: redactNetworkUrl(
                      stream.patchedManifestUrl ?? stream.originalUrl ?? ''
                  ),
              })
            : null,
        playback: Object.freeze({
            status: boundedText(playerState.playbackState ?? 'IDLE', 32),
            loaded: playerState.isLoaded === true,
            muted: playerState.isMuted === true,
            abrEnabled: playerState.isAbrEnabled !== false,
            retryCount: finite(playerState.retryCount, 5),
        }),
        metrics: Object.freeze({
            resolution: boundedText(
                stats?.playbackQuality.resolution ?? '—',
                48
            ),
            droppedFrames: finite(
                stats?.playbackQuality.droppedFrames,
                10 ** 9
            ),
            stalls: finite(stats?.playbackQuality.totalStalls, 10 ** 9),
            bandwidth: finite(stats?.abr.estimatedBandwidth, 10 ** 12),
            bitrate: finite(stats?.abr.currentVideoBitrate, 10 ** 12),
            bufferSeconds: finite(
                stats?.buffer.forwardBuffer ?? stats?.buffer.seconds,
                86400
            ),
        }),
        tracks: Object.freeze({
            video: projectTracks(playerState.videoTracks, 'video'),
            audio: projectTracks(playerState.audioTracks, 'audio'),
            text: projectTracks(playerState.textTracks, 'text'),
        }),
        events,
    });
}
