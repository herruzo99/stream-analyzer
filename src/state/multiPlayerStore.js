import { createStore } from 'zustand/vanilla';

/** @typedef {import('@/types.ts').PlayerStats} PlayerStats */
/** @typedef {{time: number, buffer: number}} PlaybackHistoryEntry */
/** @typedef {'healthy' | 'warning' | 'critical'} PlayerHealth */
/** @typedef {{ id: string, timestamp: Date, streamId: number, streamName: string, type: 'stall' | 'error' | 'dropped-frames', details: string, severity: 'warning' | 'critical' }} PlayerEvent */

/**
 * @typedef {object} PlayerInstance
 * @property {number} streamId
 * @property {string} streamName
 * @property {string | null} manifestUrl
 * @property {'live' | 'vod'} streamType
 * @property {'idle' | 'loading' | 'playing' | 'paused' | 'buffering' | 'ended' | 'error'} state
 * @property {string | null} error
 * @property {PlayerStats | null} stats
 * @property {PlaybackHistoryEntry[]} playbackHistory
 * @property {PlayerHealth} health
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
 */

/**
 * @typedef {object} MultiPlayerActions
 * @property {(streamId: number, streamName: string, manifestUrl: string, streamType: 'live' | 'vod') => void} addPlayer
 * @property {(streamId: number) => void} removePlayer
 * @property {(streamId: number, updates: Partial<PlayerInstance>) => void} updatePlayerState
 * @property {(event: Omit<PlayerEvent, 'id' | 'timestamp'>) => void} logEvent
 * @property {() => void} clearPlayers
 * @property {() => void} toggleMuteAll
 * @property {() => void} toggleSync
 * @property {() => void} toggleExpandAll
 * @property {(enabled: boolean) => void} setGlobalAbrEnabled
 * @property {(height: number) => void} setGlobalMaxHeight
 * @property {(goal: number) => void} setGlobalBufferingGoal
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
});

export const useMultiPlayerStore = createStore((set, get) => ({
    ...createInitialState(),
    addPlayer: (streamId, streamName, manifestUrl, streamType) =>
        set((state) => ({
            players: new Map(state.players).set(streamId, {
                streamId,
                streamName,
                manifestUrl,
                streamType,
                state: 'idle',
                error: null,
                stats: null,
                playbackHistory: [],
                health: 'healthy',
            }),
        })),
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
    clearPlayers: () => set({ players: new Map() }),
    toggleMuteAll: () => set((state) => ({ isMutedAll: !state.isMutedAll })),
    toggleSync: () => set((state) => ({ isSyncEnabled: !state.isSyncEnabled })),
    toggleExpandAll: () =>
        set((state) => ({ isAllExpanded: !state.isAllExpanded })),
    setGlobalAbrEnabled: (enabled) => set({ globalAbrEnabled: enabled }),
    setGlobalMaxHeight: (height) => set({ globalMaxHeight: height }),
    setGlobalBufferingGoal: (goal) => set({ globalBufferingGoal: goal }),
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
