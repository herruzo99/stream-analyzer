import { redactPlayerText } from '@/features/playerSimulation/application/player-contract.js';

export const MULTI_PLAYER_CONTRACT_LIMITS = Object.freeze({
    players: 16,
    tracksPerKind: 50,
    events: 100,
    label: 160,
    detail: 512,
});

/** @param {unknown} value @param {number} [limit] */
const boundedText = (value, limit = MULTI_PLAYER_CONTRACT_LIMITS.label) =>
    redactPlayerText(value, limit);
const finite = (value, maximum = Number.MAX_SAFE_INTEGER) =>
    Math.min(
        maximum,
        Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0)
    );

const projectTracks = (tracks) =>
    Object.freeze(
        (Array.isArray(tracks) ? tracks : [])
            .slice(0, MULTI_PLAYER_CONTRACT_LIMITS.tracksPerKind)
            .map((track, index) =>
                Object.freeze({
                    id: boundedText(track?.id ?? `track-${index + 1}`, 96),
                    label: boundedText(
                        track?.label ??
                            track?.language ??
                            track?.height ??
                            `Track ${index + 1}`
                    ),
                    active: track?.active === true,
                })
            )
    );

const projectPlayer = (player) =>
    Object.freeze({
        id: finite(player?.streamId, Number.MAX_SAFE_INTEGER),
        sourceId: boundedText(player?.sourceStreamId ?? '', 96),
        label: boundedText(player?.streamName ?? 'Unnamed player'),
        state: boundedText(player?.state ?? 'idle', 32),
        stateLabel: boundedText(
            player?.error
                ? `Error: ${player.error}`
                : player?.state ?? 'idle',
            MULTI_PLAYER_CONTRACT_LIMITS.detail
        ),
        selected: player?.selectedForAction === true,
        base: player?.isBasePlayer === true,
        live: player?.streamType === 'live',
        retryCount: finite(player?.retryCount, 5),
        playhead: finite(player?.stats?.playheadTime, 60 * 60 * 24 * 365),
        duration: finite(player?.stats?.manifestTime, 60 * 60 * 24 * 365),
        normalizedPlayhead: Math.min(
            1,
            finite(player?.normalizedPlayheadTime, 1)
        ),
        metrics: Object.freeze({
            resolution: boundedText(
                player?.stats?.playbackQuality?.resolution ?? 'N/A',
                48
            ),
            droppedFrames: finite(
                player?.stats?.playbackQuality?.droppedFrames,
                Number.MAX_SAFE_INTEGER
            ),
            stalls: finite(
                player?.stats?.playbackQuality?.totalStalls,
                Number.MAX_SAFE_INTEGER
            ),
            bandwidth: finite(
                player?.stats?.abr?.estimatedBandwidth,
                10 ** 12
            ),
            bufferSeconds: finite(player?.stats?.buffer?.seconds, 86400),
        }),
        tracks: Object.freeze({
            variants: projectTracks(player?.variantTracks),
            audio: projectTracks(player?.audioTracks),
            text: projectTracks(player?.textTracks),
        }),
    });

const projectEvent = (event, index) =>
    Object.freeze({
        id: boundedText(event?.id ?? `event-${index + 1}`, 96),
        playerId: finite(event?.streamId, Number.MAX_SAFE_INTEGER),
        playerLabel: boundedText(event?.streamName ?? 'Player'),
        type: boundedText(event?.type ?? 'status', 32),
        detail: boundedText(
            event?.details ?? '',
            MULTI_PLAYER_CONTRACT_LIMITS.detail
        ),
    });

export function createMultiPlayerModel(state) {
    const sourcePlayers = Array.from(state?.players?.values?.() ?? []);
    const players = Object.freeze(
        sourcePlayers
            .slice(0, MULTI_PLAYER_CONTRACT_LIMITS.players)
            .map(projectPlayer)
    );
    const playerIds = new Set(players.map((player) => player.id));
    const focusedId =
        state?.focusedStreamId === null || state?.focusedStreamId === undefined
            ? null
            : finite(state.focusedStreamId, Number.MAX_SAFE_INTEGER);

    return Object.freeze({
        schemaVersion: 1,
        mode: state?.layoutMode === 'focus' ? 'focus' : 'grid',
        focusedId: playerIds.has(focusedId) ? focusedId : null,
        muted: state?.isMutedAll === true,
        autoReset: state?.isAutoResetEnabled === true,
        selectedCount: players.filter((player) => player.selected).length,
        totalCount: sourcePlayers.length,
        truncated:
            sourcePlayers.length > MULTI_PLAYER_CONTRACT_LIMITS.players,
        players,
        events: Object.freeze(
            (Array.isArray(state?.eventLog) ? state.eventLog : [])
                .slice(0, MULTI_PLAYER_CONTRACT_LIMITS.events)
                .map(projectEvent)
        ),
    });
}
