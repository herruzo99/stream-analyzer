import { createStore } from 'zustand/vanilla';

/** @returns {import('@/types').PlayerState} */
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
    seekableRange: { start: 0, end: 0 },
});

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
            loadLatency: stats.abr.loadLatency,
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
            seekableRange: { start: 0, end: 0 },
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
                videoCodec: (rep.codecs || []).map((c) => c.value).join(', '),
                frameRate: rep.frameRate,
            }));

        const audioTracks = allAdaptationSets
            .filter((as) => as.contentType === 'audio')
            .flatMap((as) =>
                as.representations.map((rep) => ({
                    id: as.id || rep.id,
                    language: as.lang,
                    label: as.labels?.[0]?.text || as.lang,
                    codecs: (rep.codecs || []).map((c) => c.value).join(', '),
                    roles: as.roles.map((r) => r.value),
                    active: false,
                }))
            );

        let activeAudioTrack = null;
        if (audioTracks.length > 0) {
            const mainTrack = audioTracks.find((t) => t.roles.includes('main'));
            if (mainTrack) {
                mainTrack.active = true;
                activeAudioTrack = mainTrack;
            } else {
                audioTracks[0].active = true;
                activeAudioTrack = audioTracks[0];
            }
        }

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
                    codecs: (rep.codecs || []).map((c) => c.value).join(', '),
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
