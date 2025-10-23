import { createStore } from 'zustand/vanilla';
import { eventBus } from '@/application/event-bus';
import { uiActions } from './uiStore.js';
// --- Type Definitions ---
/** @typedef {import('@/types.ts').Stream} Stream */
/** @typedef {import('@/types.ts').DecodedSample} DecodedSample */
/** @typedef {import('@/types.ts').Event} Event */
/** @typedef {import('@/types.ts').AuthInfo} AuthInfo */
/** @typedef {import('@/types.ts').DrmAuthInfo} DrmAuthInfo */
/** @typedef {{id: number, url: string, name: string, file: File | null, auth: AuthInfo, drmAuth: DrmAuthInfo}} StreamInput */
/** @typedef {{streamId: number, repId: string, segmentUniqueId: string}} SegmentToCompare */

/**
 * @typedef {object} AnalysisState
 * @property {Stream[]} streams
 * @property {number | null} activeStreamId
 * @property {string | null} activeSegmentUrl
 * @property {number} streamIdCounter
 * @property {StreamInput[]} streamInputs
 * @property {number} activeStreamInputId
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
 * @property {(inputId: number, type: 'headers' | 'queryParams') => void} addDrmAuthParam
 * @property {(inputId: number, type: 'headers' | 'queryParams', paramId: number) => void} removeDrmAuthParam
 * @property {(inputId: number, type: 'headers' | 'queryParams', paramId: number, field: 'key' | 'value', value: string) => void} updateDrmAuthParam
 * @property {(inputId: number, preset: Partial<StreamInput>) => void} populateStreamInput
 * @property {(item: SegmentToCompare) => void} addSegmentToCompare
 * @property {(segmentUniqueId: string) => void} removeSegmentFromCompare
 * @property {() => void} clearSegmentsToCompare
 * @property {(streamId: number, updatedStreamData: Partial<Stream>) => void} updateStream
 * @property {(isPolling: boolean, options?: { fromInactivity?: boolean }) => void} setAllLiveStreamsPolling
 * @property {(streamId: number, direction: number) => void} navigateManifestUpdate
 * @property {(payload: {streamId: number, variantUri: string, manifest: object, manifestString: string, segments: object[], freshSegmentUrls: string[]}) => void} updateHlsMediaPlaylist
 * @property {(streamId: number, events: Event[]) => void} addInbandEvents
 * @property {(id: number) => void} setActiveStreamInputId
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
            drmAuth: {
                licenseServerUrl: '',
                serverCertificate: null,
                headers: [],
                queryParams: [],
            },
        },
    ],
    activeStreamInputId: 0,
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
    setActiveStreamInputId: (id) => set({ activeStreamInputId: id }),
    setActiveSegmentUrl: (id) => {
        set({ activeSegmentUrl: id });
        uiActions.setInteractiveSegmentPage(1);
    },

    addStreamInput: () => {
        set((state) => {
            const newId = state.streamIdCounter;
            return {
                streamInputs: [
                    ...state.streamInputs,
                    {
                        id: newId,
                        url: '',
                        name: '',
                        file: null,
                        auth: { headers: [], queryParams: [] },
                        drmAuth: {
                            licenseServerUrl: '',
                            serverCertificate: null,
                            headers: [],
                            queryParams: [],
                        },
                    },
                ],
                streamIdCounter: newId + 1,
                activeStreamInputId: newId,
            };
        });
    },

    removeStreamInput: (id) => {
        set((state) => {
            const remaining = state.streamInputs.filter((i) => i.id !== id);
            if (remaining.length === 0) {
                return createInitialAnalysisState();
            }

            let newActiveId = state.activeStreamInputId;
            if (state.activeStreamInputId === id) {
                const removedIndex = state.streamInputs.findIndex(
                    (i) => i.id === id
                );
                newActiveId = remaining[Math.max(0, removedIndex - 1)].id;
            }

            return {
                streamInputs: remaining,
                activeStreamInputId: newActiveId,
            };
        });
    },

    clearAllStreamInputs: () => {
        set({ streamInputs: [createInitialAnalysisState().streamInputs[0]], activeStreamInputId: 0 });
    },

    setStreamInputs: (inputs) => {
        const newInputs = inputs.map((input, index) => ({
            id: index,
            url: input.url || '',
            name: input.name || '',
            file: null,
            auth: input.auth || { headers: [], queryParams: [] },
            drmAuth: input.drmAuth || {
                licenseServerUrl: '',
                serverCertificate: null,
                headers: [],
                queryParams: [],
            },
        }));
        set({
            streamInputs: newInputs,
            streamIdCounter: newInputs.length,
            activeStreamInputId: newInputs[0]?.id ?? 0,
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

    addDrmAuthParam: (inputId, type) => {
        set((state) => ({
            streamInputs: state.streamInputs.map((input) => {
                if (input.id === inputId) {
                    const newDrmAuth = { ...input.drmAuth };
                    const newId = Date.now();
                    newDrmAuth[type] = [
                        ...newDrmAuth[type],
                        { id: newId, key: '', value: '' },
                    ];
                    return { ...input, drmAuth: newDrmAuth };
                }
                return input;
            }),
        }));
    },

    removeDrmAuthParam: (inputId, type, paramId) => {
        set((state) => ({
            streamInputs: state.streamInputs.map((input) => {
                if (input.id === inputId) {
                    const newDrmAuth = { ...input.drmAuth };
                    newDrmAuth[type] = newDrmAuth[type].filter(
                        (p) => p.id !== paramId
                    );
                    return { ...input, drmAuth: newDrmAuth };
                }
                return input;
            }),
        }));
    },

    updateDrmAuthParam: (inputId, type, paramId, field, value) => {
        set((state) => ({
            streamInputs: state.streamInputs.map((input) => {
                if (input.id === inputId) {
                    const newDrmAuth = { ...input.drmAuth };
                    newDrmAuth[type] = newDrmAuth[type].map((p) =>
                        p.id === paramId ? { ...p, [field]: value } : p
                    );
                    return { ...input, drmAuth: newDrmAuth };
                }
                return input;
            }),
        }));
    },

    populateStreamInput: (inputId, preset) => {
        set((state) => ({
            streamInputs: state.streamInputs.map((input) => {
                if (input.id === inputId) {
                    // Start with a clean slate for auth to avoid merging issues
                    const pristineAuth = { headers: [], queryParams: [] };
                    const pristineDrmAuth = {
                        licenseServerUrl: '',
                        serverCertificate: null,
                        headers: [],
                        queryParams: [],
                    };

                    return {
                        ...input, // keep the id
                        url: preset.url || '',
                        name: preset.name || '',
                        file: null, // presets are URL-based
                        auth: { ...pristineAuth, ...(preset.auth || {}) },
                        drmAuth: {
                            ...pristineDrmAuth,
                            ...(preset.drmAuth || {}),
                        },
                    };
                }
                return input;
            }),
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

export const analysisActions = useAnalysisStore.getState();