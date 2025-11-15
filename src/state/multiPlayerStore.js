import { createStore } from 'zustand/vanilla';

/** @typedef {import('@/types.ts').PlayerStats} PlayerStats */
/** @typedef {{time: number, buffer: number}} PlaybackHistoryEntry */
/** @typedef {'healthy' | 'warning' | 'critical'} PlayerHealth */
/** @typedef {{ id: string, timestamp: Date, streamId: number, streamName: string, type: 'stall' | 'error' | 'dropped-frames', details: string, severity: 'warning' | 'critical' }} PlayerEvent */

/**
 * @typedef {object} PlayerInstance
 * @property {number} streamId
 * @property {number} sourceStreamId
 * @property {string} streamName
 * @property {string | null} manifestUrl
 * @property {'live' | 'vod'} streamType
 * @property {'idle' | 'loading' | 'playing' | 'paused' | 'buffering' | 'ended' | 'error'} state
 * @property {string | null} error
 * @property {PlayerStats} stats
 * @property {PlaybackHistoryEntry[]} playbackHistory
 * @property {PlayerHealth} health
 * @property {boolean} selectedForAction
 * @property {boolean | null} abrOverride
 * @property {number | null} maxHeightOverride
 * @property {number | null} bufferingGoalOverride
 * @property {{currentTime: number, paused: boolean} | null} initialState
 * @property {object[]} variantTracks
 * @property {object[]} audioTracks
 * @property {object[]} textTracks
 * @property {object | null} activeVideoTrack
 * @property {{start: number, end: number}} seekableRange
 * @property {number} normalizedPlayheadTime
 * @property {number} retryCount
 */

/**
 * @typedef {object} MultiPlayerState
 * @property {Map<number, PlayerInstance>} players
 * @property {Map<number, 'stats' | 'controls'>} playerCardTabs
 * @property {boolean} isMutedAll
 * @property {boolean} isAutoResetEnabled
 * @property {PlayerEvent[]} eventLog
 * @property {boolean} globalAbrEnabled
 * @property {number} globalMaxHeight
 * @property {number} globalBufferingGoal
 * @property {number} globalBandwidthCap
 * @property {number} streamIdCounter
 * @property {number | null} hoveredStreamId
 */

/**
 * @typedef {object} MultiPlayerActions
 * @property {(streams: import('@/types').Stream[]) => void} initializePlayers
 * @property {(sourceStreamId: number, streamName: string, manifestUrl: string, streamType: 'live' | 'vod') => number} addPlayer
 * @property {(streamId: number) => void} removePlayer
 * @property {(streamId: number, updates: Partial<PlayerInstance>) => void} updatePlayerState
 * @property {(updates: {streamId: number, updates: Partial<PlayerInstance>}[]) => void} batchUpdatePlayerState
 * @property {(event: Omit<PlayerEvent, 'id' | 'timestamp'>) => void} logEvent
 * @property {() => void} clearPlayersAndLogs
 * @property {(isMuted: boolean) => void} setMuteAll
 * @property {() => void} toggleMuteAll
 * @property {() => void} toggleAutoReset
 * @property {(streamId: number, tab: 'stats' | 'controls') => void} setPlayerCardTab
 * @property {(enabled: boolean) => void} setGlobalAbrEnabled
 * @property {(height: number) => void} setGlobalMaxHeight
 * @property {(goal: number) => void} setGlobalBufferingGoal
 * @property {(bps: number) => void} setGlobalBandwidthCap
 * @property {(streamId: number) => void} toggleStreamSelection
 * @property {() => void} selectAllStreams
 * @property {() => void} deselectAllStreams
 * @property {(streamId: number, override: { abr?: boolean, maxHeight?: number, bufferingGoal?: number }) => void} setStreamOverride
 * @property {(sourceStreamId: number, initialState?: {currentTime: number, paused: boolean}) => number} duplicateStream
 * @property {(streamId: number | null) => void} setHoveredStreamId
 * @property {() => void} reset
 */

const defaultStats = {
    playheadTime: 0,
    manifestTime: 0,
    playbackQuality: {
        resolution: 'N/A',
        droppedFrames: 0,
        corruptedFrames: 0,
        totalStalls: 0,
        totalStallDuration: 0,
        timeToFirstFrame: 0,
    },
    abr: {
        currentVideoBitrate: 0,
        estimatedBandwidth: 0,
        switchesUp: 0,
        switchesDown: 0,
    },
    buffer: { label: 'Buffer Health', seconds: 0, totalGaps: 0 },
    session: { totalPlayTime: 0, totalBufferingTime: 0 },
};

/** @returns {MultiPlayerState} */
const createInitialState = () => ({
    players: new Map(),
    playerCardTabs: new Map(),
    isMutedAll: true,
    isAutoResetEnabled: false,
    eventLog: [],
    globalAbrEnabled: true,
    globalMaxHeight: Infinity,
    globalBufferingGoal: 10,
    globalBandwidthCap: Infinity,
    streamIdCounter: 0,
    hoveredStreamId: null,
});

export const useMultiPlayerStore = createStore((set, get) => ({
    ...createInitialState(),

    initializePlayers: (streams) => {
        const newPlayers = new Map();
        const newTabs = new Map();
        let streamIdCounter = 0;
        for (const stream of streams) {
            const streamId = streamIdCounter++;
            const streamType =
                stream.manifest?.type === 'dynamic' ? 'live' : 'vod';

            const variantTracks = [];
            const audioTracks = [];
            const textTracks = [];

            newPlayers.set(streamId, {
                streamId: streamId,
                sourceStreamId: stream.id,
                streamName: stream.name,
                manifestUrl: stream.originalUrl,
                streamType,
                state: 'idle',
                error: null,
                stats: defaultStats,
                playbackHistory: [],
                health: 'healthy',
                selectedForAction: true,
                abrOverride: null,
                maxHeightOverride: null,
                bufferingGoalOverride: null,
                initialState: null,
                variantTracks,
                audioTracks,
                textTracks,
                activeVideoTrack: null,
                seekableRange: { start: 0, end: 0 },
                normalizedPlayheadTime: 0,
                retryCount: 0,
            });
            newTabs.set(streamId, 'stats');
        }
        set({
            players: newPlayers,
            playerCardTabs: newTabs,
            streamIdCounter: streamIdCounter,
        });
    },

    addPlayer: (sourceStreamId, streamName, manifestUrl, streamType) => {
        const newStreamId = get().streamIdCounter;
        set((state) => {
            const newPlayers = new Map(state.players).set(newStreamId, {
                streamId: newStreamId,
                sourceStreamId,
                streamName,
                manifestUrl,
                streamType,
                state: 'idle',
                error: null,
                stats: defaultStats,
                playbackHistory: [],
                health: 'healthy',
                selectedForAction: true,
                abrOverride: null,
                maxHeightOverride: null,
                bufferingGoalOverride: null,
                initialState: null,
                variantTracks: [],
                audioTracks: [],
                textTracks: [],
                activeVideoTrack: null,
                seekableRange: { start: 0, end: 0 },
                normalizedPlayheadTime: 0,
                retryCount: 0,
            });
            const newTabs = new Map(state.playerCardTabs).set(
                newStreamId,
                'stats'
            );
            return {
                players: newPlayers,
                playerCardTabs: newTabs,
                streamIdCounter: newStreamId + 1,
            };
        });
        return newStreamId;
    },
    removePlayer: (streamId) =>
        set((state) => {
            const newPlayers = new Map(state.players);
            const newTabs = new Map(state.playerCardTabs);
            newPlayers.delete(streamId);
            newTabs.delete(streamId);
            return { players: newPlayers, playerCardTabs: newTabs };
        }),
    updatePlayerState: (streamId, updates) =>
        set((state) => {
            const newPlayers = new Map(state.players);
            const player = newPlayers.get(streamId);
            if (player) newPlayers.set(streamId, { ...player, ...updates });
            return { players: newPlayers };
        }),
    batchUpdatePlayerState: (updates) => {
        set((state) => {
            const newPlayers = new Map(state.players);
            for (const { streamId, updates: playerUpdates } of updates) {
                const player = newPlayers.get(streamId);
                if (player) {
                    newPlayers.set(streamId, { ...player, ...playerUpdates });
                }
            }
            return { players: newPlayers };
        });
    },
    logEvent: (event) =>
        set((state) => ({
            eventLog: [
                { ...event, id: crypto.randomUUID(), timestamp: new Date() },
                ...state.eventLog,
            ].slice(0, 100),
        })),
    clearPlayersAndLogs: () =>
        set({
            players: new Map(),
            playerCardTabs: new Map(),
            streamIdCounter: 0,
            eventLog: [],
            hoveredStreamId: null,
        }),
    setMuteAll: (isMuted) => set({ isMutedAll: isMuted }),
    toggleMuteAll: () => set((state) => ({ isMutedAll: !state.isMutedAll })),
    toggleAutoReset: () =>
        set((state) => ({ isAutoResetEnabled: !state.isAutoResetEnabled })),
    setPlayerCardTab: (streamId, tab) =>
        set((state) => ({
            playerCardTabs: new Map(state.playerCardTabs).set(streamId, tab),
        })),
    setGlobalAbrEnabled: (enabled) => set({ globalAbrEnabled: enabled }),
    setGlobalMaxHeight: (height) => set({ globalMaxHeight: height }),
    setGlobalBufferingGoal: (goal) => set({ globalBufferingGoal: goal }),
    setGlobalBandwidthCap: (bps) => set({ globalBandwidthCap: bps }),
    toggleStreamSelection: (streamId) => {
        set((state) => {
            const newPlayers = new Map(state.players);
            const player = newPlayers.get(streamId);
            if (player) {
                newPlayers.set(streamId, {
                    ...player,
                    selectedForAction: !player.selectedForAction,
                });
            }
            return { players: newPlayers };
        });
    },
    selectAllStreams: () => {
        set((state) => {
            const newPlayers = new Map();
            state.players.forEach((player, key) => {
                newPlayers.set(key, { ...player, selectedForAction: true });
            });
            return { players: newPlayers };
        });
    },
    deselectAllStreams: () => {
        set((state) => {
            const newPlayers = new Map();
            state.players.forEach((player, key) => {
                newPlayers.set(key, { ...player, selectedForAction: false });
            });
            return { players: newPlayers };
        });
    },
    setStreamOverride: (streamId, override) => {
        set((state) => {
            const newPlayers = new Map(state.players);
            const player = newPlayers.get(streamId);
            if (player) {
                newPlayers.set(streamId, {
                    ...player,
                    abrOverride:
                        override.abr !== undefined
                            ? override.abr
                            : player.abrOverride,
                    maxHeightOverride:
                        override.maxHeight !== undefined
                            ? override.maxHeight
                            : player.maxHeightOverride,
                    bufferingGoalOverride:
                        override.bufferingGoal !== undefined
                            ? override.bufferingGoal
                            : player.bufferingGoalOverride,
                });
            }
            return { players: newPlayers };
        });
    },
    duplicateStream: (sourceStreamId, initialState = null) => {
        const state = get();
        const sourcePlayer = state.players.get(sourceStreamId);
        if (!sourcePlayer) return -1;

        const newId = state.streamIdCounter;
        set({
            players: new Map(state.players).set(newId, {
                ...sourcePlayer,
                streamId: newId,
                streamName: `${sourcePlayer.streamName} (Copy)`,
                state: 'idle',
                error: null,
                stats: defaultStats,
                playbackHistory: [],
                health: 'healthy',
                selectedForAction: true,
                initialState,
                variantTracks: [],
                audioTracks: [],
                textTracks: [],
                activeVideoTrack: null,
                seekableRange: { start: 0, end: 0 },
                normalizedPlayheadTime: 0,
                retryCount: 0,
            }),
            playerCardTabs: new Map(state.playerCardTabs).set(newId, 'stats'),
            streamIdCounter: newId + 1,
        });
        return newId;
    },
    setHoveredStreamId: (streamId) => set({ hoveredStreamId: streamId }),
    reset: () => set(createInitialState()),
}));

export const selectIsPlayingAll = () => {
    const { players } = useMultiPlayerStore.getState();
    if (players.size === 0) return false;
    for (const player of players.values()) {
        if (player.state === 'playing' || player.state === 'buffering')
            return true;
    }
    return false;
};