import { createStore } from 'zustand/vanilla';
import { LRUCache } from './lru-cache.js';
import { eventBus } from './event-bus.js';

// --- Type Definitions ---
/** @typedef {import('./types.js').Stream} Stream */
/** @typedef {import('./types.js').DecodedSample} DecodedSample */
/** @typedef {import('lit-html').TemplateResult} TemplateResult */

/**
 * @typedef {object} ModalState
 * @property {boolean} isModalOpen
 * @property {string} modalTitle
 * @property {string} modalUrl
 * @property {TemplateResult | null} modalContentTemplate
 */

/**
 * @typedef {object} AnalysisState
 * @property {Stream[]} streams
 * @property {number | null} activeStreamId
 * @property {string | null} activeSegmentUrl
 * @property {number} streamIdCounter
 * @property {number[]} streamInputIds
 * @property {LRUCache} segmentCache
 * @property {string[]} segmentsForCompare
 * @property {Map<string, DecodedSample>} decodedSamples
 * @property {number} interactiveManifestCurrentPage
 * @property {number} interactiveSegmentCurrentPage
 * @property {'input' | 'results'} viewState
 * @property {string} activeTab
 * @property {ModalState} modalState
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
 * @property {(streamId: number, direction: number) => void} navigateManifestUpdate
 * @property {(page: number) => void} setInteractiveManifestPage
 * @property {(page: number) => void} setInteractiveSegmentPage
 * @property {(view: 'input' | 'results') => void} setViewState
 * @property {(tabName: string) => void} setActiveTab
 * @property {(modalState: Partial<ModalState>) => void} setModalState
 */

// --- Store Definition ---

const SEGMENT_CACHE_SIZE = 200;

/**
 * Creates the initial state for the Zustand store.
 * @returns {AnalysisState}
 */
const createInitialState = () => ({
    streams: [],
    activeStreamId: null,
    activeSegmentUrl: null,
    streamIdCounter: 1, // Start counter at 1
    streamInputIds: [0], // Default to one input field
    segmentCache: new LRUCache(SEGMENT_CACHE_SIZE),
    segmentsForCompare: [],
    decodedSamples: new Map(),
    interactiveManifestCurrentPage: 1,
    interactiveSegmentCurrentPage: 1,
    viewState: 'input',
    activeTab: 'summary', // Default to summary for single stream
    modalState: {
        isModalOpen: false,
        modalTitle: '',
        modalUrl: '',
        modalContentTemplate: null,
    },
});

/**
 * The main application state store, powered by Zustand.
 * @type {import('zustand/vanilla').StoreApi<AnalysisState & AnalysisActions>}
 */
const store = createStore((set, get) => ({
    ...createInitialState(),

    // --- Actions ---
    startAnalysis: () => set(createInitialState()),

    completeAnalysis: (streams) => {
        const defaultTab = streams.length > 1 ? 'comparison' : 'summary';
        set({
            streams: streams,
            activeStreamId: streams[0]?.id ?? null,
            viewState: 'results',
            activeTab: defaultTab, // Set default tab based on stream count
        });
        // Dispatch an event for non-state side effects
        eventBus.dispatch('state:analysis-complete', { streams });
    },

    setActiveStreamId: (streamId) => set({ activeStreamId: streamId }),
    setActiveSegmentUrl: (url) =>
        set({ activeSegmentUrl: url, interactiveSegmentCurrentPage: 1 }),

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
        get().startAnalysis(); // Resetting inputs is the same as starting a new analysis.
    },

    setStreamInputsFromData: (data) => {
        const newIds = [];
        let counter = 0;
        for (let i = 0; i < data.length; i++) {
            newIds.push(counter);
            counter++;
        }
        set({
            streamInputIds: newIds,
            streamIdCounter: counter,
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
        if (updatedStreamData.hlsVariantState) {
            eventBus.dispatch('state:stream-variant-changed', { streamId });
        }
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

    setInteractiveManifestPage: (page) =>
        set({ interactiveManifestCurrentPage: page }),
    setInteractiveSegmentPage: (page) =>
        set({ interactiveSegmentCurrentPage: page }),

    setViewState: (view) => set({ viewState: view }),

    setActiveTab: (tabName) => set({ activeTab: tabName }),

    setModalState: (newModalState) => {
        set((state) => ({
            modalState: { ...state.modalState, ...newModalState },
        }));
    },
}));

// --- Exporting Store and Actions ---

export const useStore = store;
export const storeActions = {
    startAnalysis: () => store.getState().startAnalysis(),
    completeAnalysis: (streams) => store.getState().completeAnalysis(streams),
    setActiveStreamId: (id) => store.getState().setActiveStreamId(id),
    setActiveSegmentUrl: (url) => store.getState().setActiveSegmentUrl(url),
    addStreamInputId: () => store.getState().addStreamInputId(),
    removeStreamInputId: (id) => store.getState().removeStreamInputId(id),
    resetStreamInputIds: () => store.getState().resetStreamInputIds(),
    setStreamInputsFromData: (data) =>
        store.getState().setStreamInputsFromData(data),
    addSegmentToCompare: (url) => store.getState().addSegmentToCompare(url),
    removeSegmentFromCompare: (url) =>
        store.getState().removeSegmentFromCompare(url),
    clearSegmentsToCompare: () => store.getState().clearSegmentsToCompare(),
    updateStream: (id, data) => store.getState().updateStream(id, data),
    navigateManifestUpdate: (id, dir) =>
        store.getState().navigateManifestUpdate(id, dir),
    setInteractiveManifestPage: (page) =>
        store.getState().setInteractiveManifestPage(page),
    setInteractiveSegmentPage: (page) =>
        store.getState().setInteractiveSegmentPage(page),
    setViewState: (view) => store.getState().setViewState(view),
    setActiveTab: (tabName) => store.getState().setActiveTab(tabName),
    setModalState: (state) => store.getState().setModalState(state),
};