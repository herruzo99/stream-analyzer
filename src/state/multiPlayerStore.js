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
 * @property {PlayerStats | null} stats
 * @property {PlaybackHistoryEntry[]} playbackHistory
 * @property {PlayerHealth} health
 * @property {boolean} selectedForAction
 * @property {boolean | null} abrOverride
 * @property {number | null} maxHeightOverride
 * @property {number | null} bufferingGoalOverride
 * @property {{currentTime: number, paused: boolean} | null} initialState
 */

/**
 * @typedef {object} MultiPlayerState
 * @property {Map<number, PlayerInstance>} players
 * @property {boolean} isMutedAll
 * @property {boolean} isSyncEnabled
 * @property {boolean} isAllExpanded
 * @property {PlayerEvent[]} eventLog
 * @property {boolean} globalAbrEnabled
 * @property {number} globalMaxHeight
 * @property {number} globalBufferingGoal
 * @property {number} globalBandwidthCap
 * @property {'auto' | 'grid-2' | 'grid-1'} activeLayout
 * @property {number} streamIdCounter
 * @property {number | null} hoveredStreamId
 */

/**
 * @typedef {object} MultiPlayerActions
 * @property {(sourceStreamId: number, streamName: string, manifestUrl: string, streamType: 'live' | 'vod') => number} addPlayer
 * @property {(streamId: number) => void} removePlayer
 * @property {(streamId: number, updates: Partial<PlayerInstance>) => void} updatePlayerState
 * @property {(event: Omit<PlayerEvent, 'id' | 'timestamp'>) => void} logEvent
 * @property {() => void} clearPlayersAndLogs
 * @property {(isMuted: boolean) => void} setMuteAll
 * @property {() => void} toggleMuteAll
 * @property {() => void} toggleSync
 * @property {() => void} toggleExpandAll
 * @property {(enabled: boolean) => void} setGlobalAbrEnabled
 * @property {(height: number) => void} setGlobalMaxHeight
 * @property {(goal: number) => void} setGlobalBufferingGoal
 * @property {(bps: number) => void} setGlobalBandwidthCap
 * @property {(layout: 'auto' | 'grid-2' | 'grid-1') => void} setActiveLayout
 * @property {(streamId: number) => void} toggleStreamSelection
 * @property {() => void} selectAllStreams
 * @property {() => void} deselectAllStreams
 * @property {(streamId: number, override: { abr?: boolean, maxHeight?: number, bufferingGoal?: number }) => void} setStreamOverride
 * @property {(sourceStreamId: number, initialState?: {currentTime: number, paused: boolean}) => number} duplicateStream
 * @property {(streamId: number | null) => void} setHoveredStreamId
 * @property {() => void} reset
 */

/** @returns {MultiPlayerState} */
const createInitialState = () => ({
    players: new Map(),
    isMutedAll: true,
    isSyncEnabled: false,
    isAllExpanded: false,
    eventLog: [],
    globalAbrEnabled: true,
    globalMaxHeight: Infinity,
    globalBufferingGoal: 10,
    globalBandwidthCap: Infinity,
    activeLayout: 'auto',
    streamIdCounter: 0,
    hoveredStreamId: null,
});

export const useMultiPlayerStore = createStore((set, get) => ({
    ...createInitialState(),
    addPlayer: (sourceStreamId, streamName, manifestUrl, streamType) => {
        const newStreamId = get().streamIdCounter;
        set((state) => ({
            players: new Map(state.players).set(newStreamId, {
                streamId: newStreamId,
                sourceStreamId,
                streamName,
                manifestUrl,
                streamType,
                state: 'idle',
                error: null,
                stats: null,
                playbackHistory: [],
                health: 'healthy',
                selectedForAction: true,
                abrOverride: null,
                maxHeightOverride: null,
                bufferingGoalOverride: null,
                initialState: null,
            }),
            streamIdCounter: newStreamId + 1,
        }));
        return newStreamId;
    },
    removePlayer: (streamId) =>
        set((state) => {
            const newPlayers = new Map(state.players);
            newPlayers.delete(streamId);
            return { players: newPlayers };
        }),
    updatePlayerState: (streamId, updates) =>
        set((state) => {
            const newPlayers = new Map(state.players);
            const player = newPlayers.get(streamId);
            if (player) newPlayers.set(streamId, { ...player, ...updates });
            return { players: newPlayers };
        }),
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
            streamIdCounter: 0,
            eventLog: [],
            hoveredStreamId: null,
        }),
    setMuteAll: (isMuted) => set({ isMutedAll: isMuted }),
    toggleMuteAll: () => set((state) => ({ isMutedAll: !state.isMutedAll })),
    toggleSync: () => set((state) => ({ isSyncEnabled: !state.isSyncEnabled })),
    toggleExpandAll: () =>
        set((state) => ({ isAllExpanded: !state.isAllExpanded })),
    setGlobalAbrEnabled: (enabled) => set({ globalAbrEnabled: enabled }),
    setGlobalMaxHeight: (height) => set({ globalMaxHeight: height }),
    setGlobalBufferingGoal: (goal) => set({ globalBufferingGoal: goal }),
    setGlobalBandwidthCap: (bps) => set({ globalBandwidthCap: bps }),
    setActiveLayout: (layout) => set({ activeLayout: layout }),
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
            const newPlayers = new Map(state.players);
            newPlayers.forEach((player) => {
                player.selectedForAction = true;
            });
            return { players: newPlayers };
        });
    },
    deselectAllStreams: () => {
        set((state) => {
            const newPlayers = new Map(state.players);
            newPlayers.forEach((player) => {
                player.selectedForAction = false;
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
                stats: null,
                playbackHistory: [],
                health: 'healthy',
                selectedForAction: true,
                initialState,
            }),
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
