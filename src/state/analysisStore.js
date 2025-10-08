import { createStore } from 'zustand/vanilla';
import { eventBus } from '@/application/event-bus.js';
import { uiActions } from './uiStore.js';
// --- Type Definitions ---
/** @typedef {import('@/types.ts').Stream} Stream */
/** @typedef {import('@/types.ts').DecodedSample} DecodedSample */

/**
 * @typedef {object} AnalysisState
 * @property {Stream[]} streams
 * @property {number | null} activeStreamId
 * @property {string | null} activeSegmentUrl
 * @property {number} streamIdCounter
 * @property {number[]} streamInputIds
 * @property {string[]} segmentsForCompare
 * @property {Map<string, DecodedSample>} decodedSamples
 */

/**
 * @typedef {object} AnalysisActions
 * @property {() => void} startAnalysis
 * @property {(streams: Stream[]) => void} completeAnalysis
 * @property {(streamId: number) => void} setActiveStreamId
 * @property {(url: string) => void} setActiveSegmentUrl
 * @property {() => void} addStreamInputId
 * @property {(id: number) => void} removeStreamInputId
 * @property {() => void} resetStreamInputIds
 * @property {(data: object[]) => void} setStreamInputsFromData
 * @property {(url: string) => void} addSegmentToCompare
 * @property {(url: string) => void} removeSegmentFromCompare
 * @property {() => void} clearSegmentsToCompare
 * @property {(streamId: number, updatedStreamData: Partial<Stream>) => void} updateStream
 * @property {(isPolling: boolean) => void} setAllLiveStreamsPolling
 * @property {(streamId: number, direction: number) => void} navigateManifestUpdate
 */

// --- Main Analysis Store Definition ---

/**
 * Creates the initial state for the main analysis store.
 * @returns {AnalysisState}
 */
const createInitialAnalysisState = () => ({
    streams: [],
    activeStreamId: null,
    activeSegmentUrl: null,
    streamIdCounter: 1,
    streamInputIds: [0],
    segmentsForCompare: [],
    decodedSamples: new Map(),
});

/**
 * The main application state store, powered by Zustand.
 * @type {import('zustand/vanilla').StoreApi<AnalysisState & AnalysisActions & { _reset: () => void }>}
 */
export const useAnalysisStore = createStore((set, get) => ({
    ...createInitialAnalysisState(),

    // --- Actions ---
    _reset: () => {
        set(createInitialAnalysisState());
    },

    startAnalysis: () => {
        // This is now the single point of entry for a full reset.
        // It's the responsibility of the caller to clear other stores (like segment cache).
        get()._reset();
        uiActions.reset();
    },

    completeAnalysis: (streams) => {
        set({
            streams: streams,
            activeStreamId: streams[0]?.id ?? null,
        });
        // Dispatch event for UI store to react to
        eventBus.dispatch('state:analysis-complete', { streams });
    },

    setActiveStreamId: (streamId) => set({ activeStreamId: streamId }),
    setActiveSegmentUrl: (url) => {
        set({ activeSegmentUrl: url });
        // Also reset the segment page in the UI store
        uiActions.setInteractiveSegmentPage(1);
    },

    addStreamInputId: () => {
        set((state) => ({
            streamInputIds: [...state.streamInputIds, state.streamIdCounter],
            streamIdCounter: state.streamIdCounter + 1,
        }));
    },

    removeStreamInputId: (id) => {
        set((state) => ({
            streamInputIds: state.streamInputIds.filter((i) => i !== id),
        }));
    },

    resetStreamInputIds: () => {
        get().startAnalysis();
    },

    setStreamInputsFromData: (data) => {
        const newIds = Array.from({ length: data.length }, (_, i) => i);
        set({
            streamInputIds: newIds,
            streamIdCounter: data.length,
        });
    },

    addSegmentToCompare: (url) => {
        const { segmentsForCompare } = get();
        if (
            segmentsForCompare.length < 2 &&
            !segmentsForCompare.includes(url)
        ) {
            set({ segmentsForCompare: [...segmentsForCompare, url] });
            eventBus.dispatch('state:compare-list-changed', {
                count: get().segmentsForCompare.length,
            });
        }
    },

    removeSegmentFromCompare: (url) => {
        set((state) => ({
            segmentsForCompare: state.segmentsForCompare.filter(
                (u) => u !== url
            ),
        }));
        eventBus.dispatch('state:compare-list-changed', {
            count: get().segmentsForCompare.length,
        });
    },

    clearSegmentsToCompare: () => {
        set({ segmentsForCompare: [] });
        eventBus.dispatch('state:compare-list-changed', { count: 0 });
    },

    updateStream: (streamId, updatedStreamData) => {
        set((state) => ({
            streams: state.streams.map((s) =>
                s.id === streamId ? { ...s, ...updatedStreamData } : s
            ),
        }));
        eventBus.dispatch('state:stream-updated', { streamId });
    },

    setAllLiveStreamsPolling: (isPolling) => {
        set((state) => ({
            streams: state.streams.map((s) =>
                s.manifest?.type === 'dynamic' ? { ...s, isPolling } : s
            ),
        }));
        // Notify the monitor service to react to the global state change immediately.
        eventBus.dispatch('state:stream-updated');
    },

    navigateManifestUpdate: (streamId, direction) => {
        set((state) => {
            const streamIndex = state.streams.findIndex(
                (s) => s.id === streamId
            );
            if (streamIndex === -1) return {};

            const stream = state.streams[streamIndex];
            if (stream.manifestUpdates.length === 0) return {};

            let newIndex = stream.activeManifestUpdateIndex + direction;
            newIndex = Math.max(
                0,
                Math.min(newIndex, stream.manifestUpdates.length - 1)
            );

            if (newIndex === stream.activeManifestUpdateIndex) return {};

            const newStreams = [...state.streams];
            const updatedStream = {
                ...stream,
                activeManifestUpdateIndex: newIndex,
            };

            if (newIndex === 0) {
                updatedStream.manifestUpdates[0].hasNewIssues = false;
            }

            newStreams[streamIndex] = updatedStream;

            return { streams: newStreams };
        });
    },
}));

// --- Exporting Store and Actions ---

export const analysisActions = {
    startAnalysis: () => useAnalysisStore.getState().startAnalysis(),
    completeAnalysis: (streams) =>
        useAnalysisStore.getState().completeAnalysis(streams),
    setActiveStreamId: (id) =>
        useAnalysisStore.getState().setActiveStreamId(id),
    setActiveSegmentUrl: (url) =>
        useAnalysisStore.getState().setActiveSegmentUrl(url),
    addStreamInputId: () => useAnalysisStore.getState().addStreamInputId(),
    removeStreamInputId: (id) =>
        useAnalysisStore.getState().removeStreamInputId(id),
    resetStreamInputIds: () =>
        useAnalysisStore.getState().resetStreamInputIds(),
    setStreamInputsFromData: (data) =>
        useAnalysisStore.getState().setStreamInputsFromData(data),
    addSegmentToCompare: (url) =>
        useAnalysisStore.getState().addSegmentToCompare(url),
    removeSegmentFromCompare: (url) =>
        useAnalysisStore.getState().removeSegmentFromCompare(url),
    clearSegmentsToCompare: () =>
        useAnalysisStore.getState().clearSegmentsToCompare(),
    updateStream: (id, data) =>
        useAnalysisStore.getState().updateStream(id, data),
    setAllLiveStreamsPolling: (isPolling) =>
        useAnalysisStore.getState().setAllLiveStreamsPolling(isPolling),
    navigateManifestUpdate: (id, dir) =>
        useAnalysisStore.getState().navigateManifestUpdate(id, dir),
};