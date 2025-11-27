import { createStore } from 'zustand/vanilla';

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

/** @returns {import('@/types').MultiPlayerState} */
const createInitialState = () => ({
    players: new Map(),
    isMutedAll: true,
    isAutoResetEnabled: false,
    eventLog: [],
    streamIdCounter: 0,
    hoveredStreamId: null,
    layoutMode: 'grid',
    gridColumns: 'auto',
    focusedStreamId: null,
    showGlobalHud: true,
});

export const useMultiPlayerStore = createStore((set, get) => ({
    ...createInitialState(),

    initializePlayers: (streams) => {
        const newPlayers = new Map();
        let streamIdCounter = 0;
        for (const stream of streams) {
            const streamId = streamIdCounter++;
            const streamType =
                stream.manifest?.type === 'dynamic' ? 'live' : 'vod';

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
                selectedForAction: true, // Default to TRUE as requested
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
                isHudVisible: true,
                isBasePlayer: true,
            });
        }
        set({
            players: newPlayers,
            streamIdCounter: streamIdCounter,
            focusedStreamId: null,
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
                selectedForAction: true, // Default to TRUE
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
                isHudVisible: true,
                isBasePlayer: true,
            });
            return {
                players: newPlayers,
                streamIdCounter: newStreamId + 1,
            };
        });
        return newStreamId;
    },

    removePlayer: (streamId) =>
        set((state) => {
            const newPlayers = new Map(state.players);
            newPlayers.delete(streamId);

            let newFocusedId = state.focusedStreamId;
            if (state.focusedStreamId === streamId) {
                newFocusedId = null;
                // If removing the focused item, revert to grid
                if (state.layoutMode === 'focus') state.layoutMode = 'grid';
            }

            return { players: newPlayers, focusedStreamId: newFocusedId };
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
            streamIdCounter: 0,
            eventLog: [],
            hoveredStreamId: null,
            focusedStreamId: null,
        }),

    setMuteAll: (isMuted) => set({ isMutedAll: isMuted }),
    toggleMuteAll: () => set((state) => ({ isMutedAll: !state.isMutedAll })),
    toggleAutoReset: () =>
        set((state) => ({ isAutoResetEnabled: !state.isAutoResetEnabled })),

    // --- Selection Logic ---
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
                isHudVisible: true,
                isBasePlayer: false, // Duplicates are not base players
            }),
            streamIdCounter: newId + 1,
        });
        return newId;
    },

    setHoveredStreamId: (streamId) => set({ hoveredStreamId: streamId }),

    setLayoutMode: (mode) => set({ layoutMode: mode }),
    setGridColumns: (columns) => set({ gridColumns: columns }),

    setFocusedStreamId: (id) =>
        set({
            focusedStreamId: id,
            layoutMode: id !== null ? 'focus' : 'grid',
        }),

    toggleGlobalHud: () =>
        set((state) => ({ showGlobalHud: !state.showGlobalHud })),
    togglePlayerHud: (streamId) =>
        set((state) => {
            const newPlayers = new Map(state.players);
            const player = newPlayers.get(streamId);
            if (player) {
                newPlayers.set(streamId, {
                    ...player,
                    isHudVisible: !player.isHudVisible,
                });
            }
            return { players: newPlayers };
        }),

    reset: () => set(createInitialState()),
}));
