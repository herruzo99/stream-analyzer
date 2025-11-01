import { createStore } from 'zustand/vanilla';

/**
 * @typedef {import('@/types').PlayerStats} PlayerStats
 * @typedef {import('@/types').PlayerEvent} PlayerEvent
 * @typedef {import('@/types').AbrHistoryEntry} AbrHistoryEntry
 */

/**
 * @typedef {object} PlaybackHistoryEntry
 * @property {number} time
 * @property {number} bufferHealth
 * @property {number} bandwidth
 * @property {number} bitrate
 */

/**
 * @typedef {object} PlayerState
 * @property {boolean} isLoaded
 * @property {boolean} isPictureInPicture
 * @property {boolean} isPipUnmount - True when the view is unmounted but player persists in PiP.
 * @property {boolean} isMuted
 * @property {'PLAYING' | 'PAUSED' | 'BUFFERING' | 'ENDED' | 'IDLE'} playbackState
 * @property {object | null} activeVideoTrack
 * @property {object | null} activeAudioTrack
 * @property {object | null} activeTextTrack
 * @property {PlayerStats | null} currentStats
 * @property {PlayerEvent[]} eventLog
 * @property {boolean} hasUnreadLogs
 * @property {AbrHistoryEntry[]} abrHistory
 * @property {PlaybackHistoryEntry[]} playbackHistory
 * @property {'controls' | 'stats' | 'log' | 'graphs'} activeTab
 */

/**
 * @typedef {object} PlayerActions
 * @property {(isLoaded: boolean) => void} setLoadedState
 * @property {(isInPiP: boolean) => void} setPictureInPicture
 * @property {(isPipUnmount: boolean) => void} setPipUnmountState
 * @property {(isMuted: boolean) => void} setMutedState
 * @property {(info: Partial<Pick<PlayerState, 'playbackState' | 'activeVideoTrack' | 'activeAudioTrack' | 'activeTextTrack'>>) => void} updatePlaybackInfo
 * @property {(stats: PlayerStats) => void} updateStats
 * @property {(event: PlayerEvent) => void} logEvent
 * @property {(entry: AbrHistoryEntry) => void} logAbrSwitch
 * @property {(tab: 'controls' | 'stats' | 'log' | 'graphs') => void} setActiveTab
 * @property {() => void} reset
 */

/** @returns {PlayerState} */
const createInitialPlayerState = () => ({
    isLoaded: false,
    isPictureInPicture: false,
    isPipUnmount: false,
    isMuted: true,
    playbackState: 'IDLE',
    activeVideoTrack: null,
    activeAudioTrack: null,
    activeTextTrack: null,
    currentStats: null,
    eventLog: [],
    hasUnreadLogs: false,
    abrHistory: [],
    playbackHistory: [],
    activeTab: 'stats',
});

/**
 * A store for the player simulation's real-time state.
 * @type {import('zustand/vanilla').StoreApi<PlayerState & PlayerActions>}
 */
export const usePlayerStore = createStore((set, get) => ({
    ...createInitialPlayerState(),

    setLoadedState: (isLoaded) => set({ isLoaded }),

    setPictureInPicture: (isInPiP) => set({ isPictureInPicture: isInPiP }),

    setPipUnmountState: (isPipUnmount) => set({ isPipUnmount }),

    setMutedState: (isMuted) => set({ isMuted }),

    updatePlaybackInfo: (info) => set(info),

    updateStats: (stats) => {
        const history = get().playbackHistory;
        const newEntry = {
            time: stats.playheadTime,
            bufferHealth: stats.buffer.seconds,
            bandwidth: stats.abr.estimatedBandwidth,
            bitrate: stats.abr.currentVideoBitrate,
        };

        set({
            currentStats: stats,
            playbackHistory: [...history, newEntry].slice(-300), // Keep last 300 points
        });
    },

    logEvent: (event) => {
        set((state) => ({
            eventLog: [event, ...state.eventLog].slice(0, 100),
            hasUnreadLogs: true,
        }));
    },

    logAbrSwitch: (entry) => {
        set((state) => ({
            abrHistory: [entry, ...state.abrHistory].slice(0, 100),
        }));
    },

    setActiveTab: (tab) => {
        const newState = { activeTab: tab };
        if (tab === 'log') {
            newState.hasUnreadLogs = false;
        }
        set(newState);
    },

    reset: () => set(createInitialPlayerState()),
}));

export const playerActions = usePlayerStore.getState();
