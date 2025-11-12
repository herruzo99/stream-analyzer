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
 * @property {boolean} isAbrEnabled
 * @property {boolean} isAutoResetEnabled
 * @property {boolean} isPictureInPicture
 * @property {boolean} isPipUnmount - True when the view is unmounted but player persists in PiP.
 * @property {boolean} isMuted
 * @property {'PLAYING' | 'PAUSED' | 'BUFFERING' | 'ENDED' | 'IDLE'} playbackState
 * @property {object[]} videoTracks
 * @property {object[]} audioTracks
 * @property {object[]} textTracks
 * @property {object | null} activeVideoTrack
 * @property {object | null} activeAudioTrack
 * @property {object | null} activeTextTrack
 * @property {PlayerStats | null} currentStats
 * @property {PlayerEvent[]} eventLog
 * @property {boolean} hasUnreadLogs
 * @property {AbrHistoryEntry[]} abrHistory
 * @property {PlaybackHistoryEntry[]} playbackHistory
 * @property {'controls' | 'stats' | 'log' | 'graphs'} activeTab
 * @property {number} retryCount
 */

/**
 * @typedef {object} PlayerActions
 * @property {(isLoaded: boolean) => void} setLoadedState
 * @property {(isEnabled: boolean) => void} setAbrEnabled
 * @property {() => void} toggleAutoReset
 * @property {(isInPiP: boolean) => void} setPictureInPicture
 * @property {(isPipUnmount: boolean) => void} setPipUnmountState
 * @property {(isMuted: boolean) => void} setMutedState
 * @property {(info: Partial<Pick<PlayerState, 'playbackState' | 'activeVideoTrack' | 'activeAudioTrack' | 'activeTextTrack' | 'videoTracks' | 'audioTracks' | 'textTracks'>>) => void} updatePlaybackInfo
 * @property {(stats: PlayerStats) => void} updateStats
 * @property {(event: PlayerEvent) => void} logEvent
 * @property {(entry: AbrHistoryEntry) => void} logAbrSwitch
 * @property {(tab: 'controls' | 'stats' | 'log' | 'graphs') => void} setActiveTab
 * @property {() => void} reset
 * @property {(tracks: {videoTracks: object[], audioTracks: object[], textTracks: object[], isAbrEnabled: boolean}) => void} setPlayerLoadedWithTracks
 * @property {(manifest: import('@/types').Manifest) => void} setInitialTracksFromManifest
 * @property {(count: number) => void} setRetryCount
 */

/** @returns {PlayerState} */
const createInitialPlayerState = () => ({
    isLoaded: false,
    isAbrEnabled: true,
    isAutoResetEnabled: false,
    isPictureInPicture: false,
    isPipUnmount: false,
    isMuted: true,
    playbackState: 'IDLE',
    videoTracks: [],
    audioTracks: [],
    textTracks: [],
    activeVideoTrack: null,
    activeAudioTrack: null,
    activeTextTrack: null,
    currentStats: null,
    eventLog: [],
    hasUnreadLogs: false,
    abrHistory: [],
    playbackHistory: [],
    activeTab: 'stats',
    retryCount: 0,
});

/**
 * A store for the player simulation's real-time state.
 * @type {import('zustand/vanilla').StoreApi<PlayerState & PlayerActions>}
 */
export const usePlayerStore = createStore((set, get) => ({
    ...createInitialPlayerState(),

    setLoadedState: (isLoaded) => set({ isLoaded }),

    setAbrEnabled: (isAbrEnabled) => set({ isAbrEnabled }),

    toggleAutoReset: () =>
        set((state) => ({ isAutoResetEnabled: !state.isAutoResetEnabled })),

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

    setPlayerLoadedWithTracks: ({
        videoTracks,
        audioTracks,
        textTracks,
        isAbrEnabled,
    }) => {
        set({
            isLoaded: true,
            videoTracks,
            audioTracks,
            textTracks,
            isAbrEnabled,
            activeVideoTrack: videoTracks.find((t) => t.active),
            activeAudioTrack: audioTracks.find((t) => t.active),
            activeTextTrack: textTracks.find((t) => t.active),
            retryCount: 0, // Reset retry count on successful load
        });
    },

    setInitialTracksFromManifest: (manifest) => {
        if (!manifest || !manifest.periods) {
            set({ videoTracks: [], audioTracks: [], textTracks: [] });
            return;
        }

        const allAdaptationSets = manifest.periods.flatMap(
            (p) => p.adaptationSets
        );

        const videoTracks = allAdaptationSets
            .filter((as) => as.contentType === 'video')
            .flatMap((as) => as.representations)
            .map((rep) => ({
                id: rep.id,
                active: false,
                type: 'variant',
                bandwidth: rep.bandwidth,
                width: rep.width.value,
                height: rep.height.value,
                videoCodec: rep.codecs.value,
                frameRate: rep.frameRate,
            }));

        const audioTracks = allAdaptationSets
            .filter((as) => as.contentType === 'audio')
            .flatMap((as) =>
                as.representations.map((rep) => ({
                    id: as.id || rep.id,
                    language: as.lang,
                    label: as.labels?.[0]?.text || as.lang,
                    codecs: rep.codecs.value,
                    roles: as.roles.map((r) => r.value),
                    active: false,
                }))
            );

        // --- ARCHITECTURAL FIX: Implement default audio track selection ---
        let activeAudioTrack = null;
        if (audioTracks.length > 0) {
            // Prefer the first track with the 'main' role.
            const mainTrack = audioTracks.find((t) =>
                t.roles.includes('main')
            );
            if (mainTrack) {
                mainTrack.active = true;
                activeAudioTrack = mainTrack;
            } else {
                // Otherwise, fall back to the very first audio track.
                audioTracks[0].active = true;
                activeAudioTrack = audioTracks[0];
            }
        }
        // --- END FIX ---

        const textTracks = allAdaptationSets
            .filter(
                (as) =>
                    as.contentType === 'text' ||
                    as.contentType === 'application'
            )
            .flatMap((as) =>
                as.representations.map((rep) => ({
                    id: as.id || rep.id,
                    language: as.lang,
                    label: as.labels?.[0]?.text || as.lang,
                    mimeType: rep.mimeType,
                    codecs: rep.codecs.value,
                    roles: as.roles.map((r) => r.value),
                    kind: as.roles.find((r) => r.value === 'caption')
                        ? 'caption'
                        : 'subtitle',
                    active: false,
                }))
            );

        set({ videoTracks, audioTracks, textTracks, activeAudioTrack });
    },

    setRetryCount: (count) => set({ retryCount: count }),
}));

export const playerActions = usePlayerStore.getState();