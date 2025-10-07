import { createStore } from 'zustand/vanilla';
import { LRUCache } from './lru-cache.js';
import { eventBus } from './event-bus.js';
// --- Type Definitions ---
/** @typedef {import('./types.ts').Stream} Stream */
/** @typedef {import('./types.ts').DecodedSample} DecodedSample */

/**
 * @typedef {object} ModalState
 * @property {boolean} isModalOpen
 * @property {string} modalTitle
 * @property {string} modalUrl
 * @property {{ type: string; data: any; } | null} modalContent
 */

/**
 * @typedef {object} AnalysisState
 * @property {Stream[]} streams
 * @property {number | null} activeStreamId
 * @property {string | null} activeSegmentUrl
 * @property {number} streamIdCounter
 * @property {number[]} streamInputIds
 * @property {string[]} segmentsForCompare
 * @property {Map<string, DecodedSample>} decodedSamples
 * @property {number} interactiveManifestCurrentPage
 * @property {number} interactiveSegmentCurrentPage
 * @property {'input' | 'results'} viewState
 * @property {string} activeTab
 * @property {ModalState} modalState
 * @property {boolean} isCmafSummaryExpanded
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
 * @property {(page: number) => void} setInteractiveManifestPage
 * @property {(page: number) => void} setInteractiveSegmentPage
 * @property {(view: 'input' | 'results') => void} setViewState
 * @property {(tabName: string) => void} setActiveTab
 * @property {(modalState: Partial<ModalState>) => void} setModalState
 * @property {() => void} toggleCmafSummary
 */

// --- Segment Cache Store (New) ---

const SEGMENT_CACHE_SIZE = 200;

/**
 * @typedef {object} SegmentCacheState
 * @property {LRUCache} cache
 */

/**
 * @typedef {object} SegmentCacheActions
 * @property {(url: string, entry: any) => void} set
 * @property {(url: string) => any} get
 * @property {() => void} clear
 */

/**
 * A dedicated store for managing the segment cache.
 * @type {import('zustand/vanilla').StoreApi<SegmentCacheState & SegmentCacheActions>}
 */
export const useSegmentCacheStore = createStore((set, get) => ({
    cache: new LRUCache(SEGMENT_CACHE_SIZE),
    set: (url, entry) => {
        const currentCache = get().cache;
        currentCache.set(url, entry);
        // Create a new object reference to trigger Zustand's shallow comparison
        set({ cache: currentCache.clone() });
    },
    get: (url) => get().cache.get(url),
    clear: () => set({ cache: new LRUCache(SEGMENT_CACHE_SIZE) }),
}));

// --- Main Analysis Store Definition ---

/**
 * Creates the initial state for the main analysis store.
 * @returns {AnalysisState}
 */
const createInitialState = () => ({
    streams: [],
    activeStreamId: null,
    activeSegmentUrl: null,
    streamIdCounter: 1,
    streamInputIds: [0],
    segmentsForCompare: [],
    decodedSamples: new Map(),
    interactiveManifestCurrentPage: 1,
    interactiveSegmentCurrentPage: 1,
    viewState: 'input',
    activeTab: 'summary',
    modalState: {
        isModalOpen: false,
        modalTitle: '',
        modalUrl: '',
        modalContent: null,
    },
    isCmafSummaryExpanded: false,
});

/**
 * The main application state store, powered by Zustand.
 * @type {import('zustand/vanilla').StoreApi<AnalysisState & AnalysisActions>}
 */
const store = createStore((set, get) => ({
    ...createInitialState(),

    // --- Actions ---
    startAnalysis: () => {
        useSegmentCacheStore.getState().clear(); // Also clear segment cache on new analysis
        set(createInitialState());
    },

    completeAnalysis: (streams) => {
        const defaultTab = streams.length > 1 ? 'comparison' : 'summary';
        set({
            streams: streams,
            activeStreamId: streams[0]?.id ?? null,
            viewState: 'results',
            activeTab: defaultTab,
        });
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

    toggleCmafSummary: () => {
        set((state) => ({
            isCmafSummaryExpanded: !state.isCmafSummaryExpanded,
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
    setAllLiveStreamsPolling: (isPolling) =>
        store.getState().setAllLiveStreamsPolling(isPolling),
    navigateManifestUpdate: (id, dir) =>
        store.getState().navigateManifestUpdate(id, dir),
    setInteractiveManifestPage: (page) =>
        store.getState().setInteractiveManifestPage(page),
    setInteractiveSegmentPage: (page) =>
        store.getState().setInteractiveSegmentPage(page),
    setViewState: (view) => store.getState().setViewState(view),
    setActiveTab: (tabName) => store.getState().setActiveTab(tabName),
    setModalState: (state) => store.getState().setModalState(state),
    toggleCmafSummary: () => store.getState().toggleCmafSummary(),
};
