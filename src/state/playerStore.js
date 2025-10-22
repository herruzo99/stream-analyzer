import { createStore } from 'zustand/vanilla';

/**
 * @typedef {import('@/types').PlayerStats} PlayerStats
 * @typedef {import('@/types').PlayerEvent} PlayerEvent
 * @typedef {import('@/types').AbrHistoryEntry} AbrHistoryEntry
 */

/**
 * @typedef {object} PlayerState
 * @property {boolean} isLoaded
 * @property {'PLAYING' | 'PAUSED' | 'BUFFERING' | 'ENDED' | 'IDLE'} playbackState
 * @property {object | null} activeVideoTrack
 * @property {object | null} activeAudioTrack
 * @property {object | null} activeTextTrack
 * @property {PlayerStats | null} currentStats
 * @property {PlayerEvent[]} eventLog
 * @property {AbrHistoryEntry[]} abrHistory
 * @property {'stats' | 'log'} activeTab
 */

/**
 * @typedef {object} PlayerActions
 * @property {(isLoaded: boolean) => void} setLoadedState
 * @property {(info: Partial<Pick<PlayerState, 'playbackState' | 'activeVideoTrack' | 'activeAudioTrack' | 'activeTextTrack'>>) => void} updatePlaybackInfo
 * @property {(stats: PlayerStats) => void} updateStats
 * @property {(event: PlayerEvent) => void} logEvent
 * @property {(entry: AbrHistoryEntry) => void} logAbrSwitch
 * @property {(tab: 'stats' | 'log') => void} setActiveTab
 * @property {() => void} reset
 */

/** @returns {PlayerState} */
const createInitialPlayerState = () => ({
    isLoaded: false,
    playbackState: 'IDLE',
    activeVideoTrack: null,
    activeAudioTrack: null,
    activeTextTrack: null,
    currentStats: null,
    eventLog: [],
    abrHistory: [],
    activeTab: 'stats',
});

/**
 * A store for the player simulation's real-time state.
 * @type {import('zustand/vanilla').StoreApi<PlayerState & PlayerActions>}
 */
export const usePlayerStore = createStore((set, get) => ({
    ...createInitialPlayerState(),

    setLoadedState: (isLoaded) => set({ isLoaded }),

    updatePlaybackInfo: (info) => set(info),

    updateStats: (stats) => set({ currentStats: stats }),

    logEvent: (event) => {
        set((state) => ({
            eventLog: [event, ...state.eventLog].slice(0, 100),
        }));
    },

    logAbrSwitch: (entry) => {
        set((state) => ({
            abrHistory: [entry, ...state.abrHistory].slice(0, 100),
        }));
    },

    setActiveTab: (tab) => set({ activeTab: tab }),

    reset: () => set(createInitialPlayerState()),
}));

export const playerActions = usePlayerStore.getState();