import { createStore } from 'zustand/vanilla';
import { LRUCache } from './lru-cache.js';
import { eventBus } from './event-bus.js';

// --- Type Definitions (moved from state.js) ---
/**
 * @typedef {import('./dom.js').Label} Label
 * @typedef {import('./dom.js').Descriptor} Descriptor
 * @typedef {import('./dom.js').AudioChannelConfiguration} AudioChannelConfiguration
 * @typedef {import('./dom.js').URLType} URLType
 * @typedef {import('./dom.js').FailoverContent} FailoverContent
 * @typedef {import('./dom.js').Representation} Representation
 * @typedef {import('./dom.js').ContentProtection} ContentProtection
 * @typedef {import('./dom.js').AdaptationSet} AdaptationSet
 * @typedef {import('./dom.js').Event} Event
 * @typedef {import('./dom.js').EventStream} EventStream
 * @typedef {import('./dom.js').AssetIdentifier} AssetIdentifier
 * @typedef {import('./dom.js').Subset} Subset
 * @typedef {import('./dom.js').Period} Period
 * @typedef {import('./dom.js').ProgramInformation} ProgramInformation
 * @typedef {import('./dom.js').Metrics} Metrics
 * @typedef {import('./dom.js').VideoTrackSummary} VideoTrackSummary
 * @typedef {import('./dom.js').AudioTrackSummary} AudioTrackSummary
 * @typedef {import('./dom.js').TextTrackSummary} TextTrackSummary
 * @typedef {import('./dom.js').ManifestSummary} ManifestSummary
 * @typedef {import('./dom.js').Manifest} Manifest
 * @typedef {import('./dom.js').MediaPlaylist} MediaPlaylist
 * @typedef {import('./dom.js').FeatureAnalysisResult} FeatureAnalysisResult
 * @typedef {import('./dom.js').FeatureAnalysisState} FeatureAnalysisState
 * @typedef {import('./dom.js').HlsVariantState} HlsVariantState
 * @typedef {import('./dom.js').DashRepresentationState} DashRepresentationState
 * @typedef {import('./dom.js').ManifestUpdate} ManifestUpdate
 * @typedef {import('./dom.js').ComplianceResult} ComplianceResult
 * @typedef {import('./dom.js').DecodedNalUnit} DecodedNalUnit
 * @typedef {import('./dom.js').DecodedH264Sample} DecodedH264Sample
 * @typedef {import('./dom.js').DecodedAacFrame} DecodedAacFrame
 * @typedef {import('./dom.js').DecodedSample} DecodedSample
 * @typedef {import('./dom.js').Stream} Stream
 */

/**
 * @typedef {object} AnalysisState
 * @property {Stream[]} streams
 * @property {number | null} activeStreamId
 * @property {string | null} activeSegmentUrl
 * @property {number} streamIdCounter
 * @property {LRUCache} segmentCache
 * @property {string[]} segmentsForCompare
 * @property {Map<string, DecodedSample>} decodedSamples
 * @property {Map<number, any>} activeByteMap
 */

/**
 * @typedef {object} AnalysisActions
 * @property {() => void} startAnalysis
 * @property {(streams: Stream[]) => void} completeAnalysis
 * @property {(streamId: number) => void} setActiveStreamId
 * @property {(url: string) => void} setActiveSegmentUrl
 * @property {(url: string) => void} addSegmentToCompare
 * @property {(url: string) => void} removeSegmentFromCompare
 * @property {() => void} clearSegmentsToCompare
 * @property {(streamId: number, updatedStreamData: Partial<Stream>) => void} updateStream
 * @property {(streamId: number, direction: number) => void} navigateManifestUpdate
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
    streamIdCounter: 0,
    segmentCache: new LRUCache(SEGMENT_CACHE_SIZE),
    segmentsForCompare: [],
    decodedSamples: new Map(),
    activeByteMap: new Map(),
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
        set({
            streams: streams,
            activeStreamId: streams[0]?.id ?? null,
        });
        // Dispatch an event for non-state side effects
        eventBus.dispatch('state:analysis-complete', { streams });
    },

    setActiveStreamId: (streamId) => set({ activeStreamId: streamId }),
    setActiveSegmentUrl: (url) => set({ activeSegmentUrl: url }),

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

            // If we are moving to the latest update, clear the "new issues" flag
            if (newIndex === 0) {
                updatedStream.manifestUpdates[0].hasNewIssues = false;
            }

            newStreams[streamIndex] = updatedStream;

            return { streams: newStreams };
        });
    },
}));

// --- Exporting Store and Actions ---

export const useStore = store;
export const storeActions = {
    startAnalysis: () => store.getState().startAnalysis(),
    completeAnalysis: (streams) => store.getState().completeAnalysis(streams),
    setActiveStreamId: (id) => store.getState().setActiveStreamId(id),
    setActiveSegmentUrl: (url) => store.getState().setActiveSegmentUrl(url),
    addSegmentToCompare: (url) => store.getState().addSegmentToCompare(url),
    removeSegmentFromCompare: (url) =>
        store.getState().removeSegmentFromCompare(url),
    clearSegmentsToCompare: () => store.getState().clearSegmentsToCompare(),
    updateStream: (id, data) => store.getState().updateStream(id, data),
    navigateManifestUpdate: (id, dir) =>
        store.getState().navigateManifestUpdate(id, dir),
};
