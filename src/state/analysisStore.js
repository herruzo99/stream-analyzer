import { createStore } from 'zustand/vanilla';
import { eventBus } from '@/application/event-bus';
import { uiActions } from './uiStore.js';
// --- Type Definitions ---
/** @typedef {import('@/types.ts').Stream} Stream */
/** @typedef {import('@/types.ts').DecodedSample} DecodedSample */
/** @typedef {import('@/types.ts').Event} Event */
/** @typedef {import('@/types.ts').AuthInfo} AuthInfo */
/** @typedef {{id: number, url: string, name: string, file: File | null, auth: AuthInfo}} StreamInput */
/** @typedef {{streamId: number, repId: string, segmentUniqueId: string}} SegmentToCompare */

/**
 * @typedef {object} AnalysisState
 * @property {Stream[]} streams
 * @property {number | null} activeStreamId
 * @property {string | null} activeSegmentUrl
 * @property {number} streamIdCounter
 * @property {StreamInput[]} streamInputs
 * @property {SegmentToCompare[]} segmentsForCompare
 * @property {Map<string, DecodedSample>} decodedSamples
 */

/**
 * @typedef {object} AnalysisActions
 * @property {() => void} startAnalysis
 * @property {(streams: Stream[]) => void} completeAnalysis
 * @property {(streamId: number) => void} setActiveStreamId
 * @property {(id: string) => void} setActiveSegmentUrl
 * @property {() => void} addStreamInput
 * @property {(id: number) => void} removeStreamInput
 * @property {() => void} clearAllStreamInputs
 * @property {(data: object[]) => void} setStreamInputs
 * @property {(id: number, field: keyof StreamInput, value: any) => void} updateStreamInput
 * @property {(inputId: number, type: 'headers' | 'queryParams') => void} addAuthParam
 * @property {(inputId: number, type: 'headers' | 'queryParams', paramId: number) => void} removeAuthParam
 * @property {(inputId: number, type: 'headers' | 'queryParams', paramId: number, field: 'key' | 'value', value: string) => void} updateAuthParam
 * @property {(id: number, url: string, name: string) => void} populateStreamInput
 * @property {(item: SegmentToCompare) => void} addSegmentToCompare
 * @property {(segmentUniqueId: string) => void} removeSegmentFromCompare
 * @property {() => void} clearSegmentsToCompare
 * @property {(streamId: number, updatedStreamData: Partial<Stream>) => void} updateStream
 * @property {(isPolling: boolean, options?: { fromInactivity?: boolean }) => void} setAllLiveStreamsPolling
 * @property {(streamId: number, direction: number) => void} navigateManifestUpdate
 * @property {(payload: {streamId: number, variantUri: string, manifest: object, manifestString: string, segments: object[], freshSegmentUrls: string[]}) => void} updateHlsMediaPlaylist
 * @property {(streamId: number, events: Event[]) => void} addInbandEvents
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
    streamInputs: [
        {
            id: 0,
            url: '',
            name: '',
            file: null,
            auth: { headers: [], queryParams: [] },
        },
    ],
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
            streams: streams.map((s) => ({
                ...s,
                wasStoppedByInactivity: false,
                activeMediaPlaylistUrl: null,
                inbandEvents: [],
                adAvails: [],
                mediaPlaylists:
                    s.protocol === 'hls' && s.manifest?.isMaster
                        ? new Map([
                              [
                                  'master',
                                  {
                                      manifest: s.manifest,
                                      rawManifest: s.rawManifest,
                                      lastFetched: new Date(),
                                  },
                              ],
                          ])
                        : new Map(),
            })),
            activeStreamId: streams[0]?.id ?? null,
        });
        eventBus.dispatch('state:analysis-complete', {
            streams: get().streams,
        });
    },

    setActiveStreamId: (streamId) => set({ activeStreamId: streamId }),
    setActiveSegmentUrl: (id) => {
        set({ activeSegmentUrl: id });
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
                    auth: { headers: [], queryParams: [] },
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
            streamInputs: [
                {
                    id: 0,
                    url: '',
                    name: '',
                    file: null,
                    auth: { headers: [], queryParams: [] },
                },
            ],
            streamIdCounter: 1,
        });
    },

    setStreamInputs: (inputs) => {
        const newInputs = inputs.map((input, index) => ({
            id: index,
            url: input.url || '',
            name: input.name || '',
            file: null, // Files cannot be persisted or set from URLs
            auth: input.auth || { headers: [], queryParams: [] },
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

    addAuthParam: (inputId, type) => {
        set((state) => ({
            streamInputs: state.streamInputs.map((input) => {
                if (input.id === inputId) {
                    const newAuth = { ...input.auth };
                    const newId = Date.now();
                    newAuth[type] = [
                        ...newAuth[type],
                        { id: newId, key: '', value: '' },
                    ];
                    return { ...input, auth: newAuth };
                }
                return input;
            }),
        }));
    },

    removeAuthParam: (inputId, type, paramId) => {
        set((state) => ({
            streamInputs: state.streamInputs.map((input) => {
                if (input.id === inputId) {
                    const newAuth = { ...input.auth };
                    newAuth[type] = newAuth[type].filter(
                        (p) => p.id !== paramId
                    );
                    return { ...input, auth: newAuth };
                }
                return input;
            }),
        }));
    },

    updateAuthParam: (inputId, type, paramId, field, value) => {
        set((state) => ({
            streamInputs: state.streamInputs.map((input) => {
                if (input.id === inputId) {
                    const newAuth = { ...input.auth };
                    newAuth[type] = newAuth[type].map((p) =>
                        p.id === paramId ? { ...p, [field]: value } : p
                    );
                    return { ...input, auth: newAuth };
                }
                return input;
            }),
        }));
    },

    populateStreamInput: (id, url, name) => {
        set((state) => ({
            streamInputs: state.streamInputs.map((input) =>
                input.id === id
                    ? {
                          ...input,
                          url,
                          name,
                          file: null,
                          auth: { headers: [], queryParams: [] },
                      }
                    : input
            ),
        }));
    },

    addSegmentToCompare: (item) => {
        const { segmentsForCompare } = get();
        if (
            segmentsForCompare.length < 10 &&
            !segmentsForCompare.some(
                (s) => s.segmentUniqueId === item.segmentUniqueId
            )
        ) {
            set({ segmentsForCompare: [...segmentsForCompare, item] });
            eventBus.dispatch('state:compare-list-changed', {
                count: get().segmentsForCompare.length,
            });
        }
    },

    removeSegmentFromCompare: (segmentUniqueId) => {
        set((state) => ({
            segmentsForCompare: state.segmentsForCompare.filter(
                (i) => i.segmentUniqueId !== segmentUniqueId
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

    addInbandEvents: (streamId, events) => {
        if (!events || events.length === 0) return;
        set((state) => {
            const newStreams = state.streams.map((s) => {
                if (s.id === streamId) {
                    const newInbandEvents = [
                        ...(s.inbandEvents || []),
                        ...events,
                    ];
                    return { ...s, inbandEvents: newInbandEvents };
                }
                return s;
            });
            return { streams: newStreams };
        });
        eventBus.dispatch('state:inband-events-added', {
            streamId,
            newEvents: events,
        });
    },

    setAllLiveStreamsPolling: (isPolling, options = {}) => {
        set((state) => ({
            streams: state.streams.map((s) => {
                if (s.manifest?.type === 'dynamic') {
                    const newStream = { ...s, isPolling };
                    if (options.fromInactivity && !isPolling) {
                        newStream.wasStoppedByInactivity = true;
                    } else if (isPolling) {
                        newStream.wasStoppedByInactivity = false;
                    }
                    return newStream;
                }
                return s;
            }),
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

    updateHlsMediaPlaylist: ({
        streamId,
        variantUri,
        manifest,
        manifestString,
        segments,
        freshSegmentUrls,
    }) => {
        set((state) => {
            const stream = state.streams.find((s) => s.id === streamId);
            if (!stream) return {};

            const newVariantState = new Map(stream.hlsVariantState);
            const currentState = newVariantState.get(variantUri);
            if (currentState) {
                newVariantState.set(variantUri, {
                    ...currentState,
                    segments: segments,
                    freshSegmentUrls: new Set(freshSegmentUrls),
                    isLoading: false,
                    error: null,
                });
            }

            const newMediaPlaylists = new Map(stream.mediaPlaylists);
            newMediaPlaylists.set(variantUri, {
                manifest,
                rawManifest: manifestString,
                lastFetched: new Date(),
            });

            return {
                streams: state.streams.map((s) =>
                    s.id === streamId
                        ? {
                              ...s,
                              hlsVariantState: newVariantState,
                              mediaPlaylists: newMediaPlaylists,
                          }
                        : s
                ),
            };
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
    setActiveSegmentUrl: (id) =>
        useAnalysisStore.getState().setActiveSegmentUrl(id),
    addStreamInput: () => useAnalysisStore.getState().addStreamInput(),
    removeStreamInput: (id) =>
        useAnalysisStore.getState().removeStreamInput(id),
    clearAllStreamInputs: () =>
        useAnalysisStore.getState().clearAllStreamInputs(),
    setStreamInputs: (data) =>
        useAnalysisStore.getState().setStreamInputs(data),
    updateStreamInput: (id, field, value) =>
        useAnalysisStore.getState().updateStreamInput(id, field, value),
    addAuthParam: (inputId, type) =>
        useAnalysisStore.getState().addAuthParam(inputId, type),
    removeAuthParam: (inputId, type, paramId) =>
        useAnalysisStore.getState().removeAuthParam(inputId, type, paramId),
    updateAuthParam: (inputId, type, paramId, field, value) =>
        useAnalysisStore
            .getState()
            .updateAuthParam(inputId, type, paramId, field, value),
    populateStreamInput: (id, url, name) =>
        useAnalysisStore.getState().populateStreamInput(id, url, name),
    addSegmentToCompare: (item) =>
        useAnalysisStore.getState().addSegmentToCompare(item),
    removeSegmentFromCompare: (id) =>
        useAnalysisStore.getState().removeSegmentFromCompare(id),
    clearSegmentsToCompare: () =>
        useAnalysisStore.getState().clearSegmentsToCompare(),
    updateStream: (id, data) =>
        useAnalysisStore.getState().updateStream(id, data),
    setAllLiveStreamsPolling: (isPolling, options) =>
        useAnalysisStore
            .getState()
            .setAllLiveStreamsPolling(isPolling, options),
    navigateManifestUpdate: (id, dir) =>
        useAnalysisStore.getState().navigateManifestUpdate(id, dir),
    updateHlsMediaPlaylist: (payload) =>
        useAnalysisStore.getState().updateHlsMediaPlaylist(payload),
    addInbandEvents: (streamId, events) =>
        useAnalysisStore.getState().addInbandEvents(streamId, events),
};
