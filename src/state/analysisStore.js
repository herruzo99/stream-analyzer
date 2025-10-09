import { createStore } from 'zustand/vanilla';
import { eventBus } from '@/application/event-bus';
import { uiActions } from './uiStore.js';
// --- Type Definitions ---
/** @typedef {import('@/types.ts').Stream} Stream */
/** @typedef {import('@/types.ts').DecodedSample} DecodedSample */
/** @typedef {{id: number, url: string, name: string, file: File | null}} StreamInput */

/**
 * @typedef {object} AnalysisState
 * @property {Stream[]} streams
 * @property {number | null} activeStreamId
 * @property {string | null} activeSegmentUrl
 * @property {number} streamIdCounter
 * @property {StreamInput[]} streamInputs
 * @property {string[]} segmentsForCompare
 * @property {Map<string, DecodedSample>} decodedSamples
 */

/**
 * @typedef {object} AnalysisActions
 * @property {() => void} startAnalysis
 * @property {(streams: Stream[]) => void} completeAnalysis
 * @property {(streamId: number) => void} setActiveStreamId
 * @property {(url: string) => void} setActiveSegmentUrl
 * @property {() => void} addStreamInput
 * @property {(id: number) => void} removeStreamInput
 * @property {() => void} clearAllStreamInputs
 * @property {(data: object[]) => void} setStreamInputs
 * @property {(id: number, field: keyof StreamInput, value: string | File | null) => void} updateStreamInput
 * @property {(id: number, url: string, name: string) => void} populateStreamInput
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
    streamInputs: [{ id: 0, url: '', name: '', file: null }],
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
        get()._reset();
        uiActions.reset();
    },

    completeAnalysis: (streams) => {
        set({
            streams: streams,
            activeStreamId: streams[0]?.id ?? null,
        });
        eventBus.dispatch('state:analysis-complete', { streams });
    },

    setActiveStreamId: (streamId) => set({ activeStreamId: streamId }),
    setActiveSegmentUrl: (url) => {
        set({ activeSegmentUrl: url });
        uiActions.setInteractiveSegmentPage(1);
    },

    addStreamInput: () => {
        set((state) => ({
            streamInputs: [
                ...state.streamInputs,
                {
                    id: state.streamIdCounter,
                    url: '',
                    name: '',
                    file: null,
                },
            ],
            streamIdCounter: state.streamIdCounter + 1,
        }));
    },

    removeStreamInput: (id) => {
        set((state) => ({
            streamInputs: state.streamInputs.filter((i) => i.id !== id),
        }));
    },

    clearAllStreamInputs: () => {
        set({
            streamInputs: [{ id: 0, url: '', name: '', file: null }],
            streamIdCounter: 1,
        });
    },

    setStreamInputs: (inputs) => {
        const newInputs = inputs.map((input, index) => ({
            id: index,
            url: input.url || '',
            name: input.name || '',
            file: null, // Files cannot be persisted or set from URLs
        }));
        set({
            streamInputs: newInputs,
            streamIdCounter: newInputs.length,
        });
    },

    updateStreamInput: (id, field, value) => {
        set((state) => ({
            streamInputs: state.streamInputs.map((input) =>
                input.id === id ? { ...input, [field]: value } : input
            ),
        }));
    },

    populateStreamInput: (id, url, name) => {
        set((state) => ({
            streamInputs: state.streamInputs.map((input) =>
                input.id === id
                    ? { ...input, url, name, file: null }
                    : input
            ),
        }));
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
    addStreamInput: () => useAnalysisStore.getState().addStreamInput(),
    removeStreamInput: (id) =>
        useAnalysisStore.getState().removeStreamInput(id),
    clearAllStreamInputs: () =>
        useAnalysisStore.getState().clearAllStreamInputs(),
    setStreamInputs: (data) =>
        useAnalysisStore.getState().setStreamInputs(data),
    updateStreamInput: (id, field, value) =>
        useAnalysisStore.getState().updateStreamInput(id, field, value),
    populateStreamInput: (id, url, name) =>
        useAnalysisStore.getState().populateStreamInput(id, url, name),
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