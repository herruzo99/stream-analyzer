import { createStore } from 'zustand/vanilla';
import { eventBus } from '@/application/event-bus';
import { uiActions } from './uiStore.js';
import { debugLog } from '@/shared/utils/debug';

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
 * @property {number} streamIdCounter
 * @property {StreamInput[]} streamInputs
 * @property {number} activeStreamInputId
 * @property {SegmentToCompare[]} segmentsForCompare
 * @property {Map<string, DecodedSample>} decodedSamples
 * @property {Map<string, {streamId: number, auth: AuthInfo}>} urlAuthMap
 */

/**
 * @typedef {object} AnalysisActions
 * @property {() => void} startAnalysis
 * @property {(streams: Stream[], urlAuthMapArray: [string, {streamId: number, auth: AuthInfo}][]) => void} completeAnalysis
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
 * @property {(payload: {streamId: number, variantUri: string, manifest: object, manifestString: string, segments: object[], currentSegmentUrls: string[], newSegmentUrls: string[]}) => void} updateHlsMediaPlaylist
 * @property {(streamId: number, events: Event[]) => void} addInbandEvents
 * @property {(id: number) => void} setActiveStreamInputId
 * @property {(payload: {streamId: number, segmentUrl: string}) => void} addHlsSegmentFromPlayer
 */

const createInitialAnalysisState = () => ({
    streams: [],
    activeStreamId: null,
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
    urlAuthMap: new Map(),
});

export const useAnalysisStore = createStore((set, get) => ({
    ...createInitialAnalysisState(),

    // --- Actions ---
    _reset: () => {
        set(createInitialAnalysisState());
    },

    startAnalysis: () => {
        const initialState = createInitialAnalysisState();
        set({
            streams: initialState.streams,
            activeStreamId: initialState.activeStreamId,
            segmentsForCompare: initialState.segmentsForCompare,
            decodedSamples: initialState.decodedSamples,
            urlAuthMap: initialState.urlAuthMap,
        });
        uiActions.reset();
    },

    completeAnalysis: (streams, urlAuthMapArray) => {
        const fullyFormedStreams = streams.map((s) => {
            const newStream = { ...s };

            const newDashRepState = new Map();
            if (s.dashRepresentationState) {
                for (const [key, value] of s.dashRepresentationState) {
                    newDashRepState.set(key, {
                        ...value,
                        currentSegmentUrls: new Set(
                            value.currentSegmentUrls || []
                        ),
                        newlyAddedSegmentUrls: new Set(
                            value.newlyAddedSegmentUrls || []
                        ),
                    });
                }
            }
            newStream.dashRepresentationState = newDashRepState;

            const newHlsVariantState = new Map();
            if (s.hlsVariantState) {
                for (const [key, value] of s.hlsVariantState) {
                    newHlsVariantState.set(key, {
                        ...value,
                        currentSegmentUrls: new Set(
                            value.currentSegmentUrls || []
                        ),
                        newlyAddedSegmentUrls: new Set(
                            value.newlyAddedSegmentUrls || []
                        ),
                    });
                }
            }
            newStream.hlsVariantState = newHlsVariantState;

            newStream.wasStoppedByInactivity = false;
            newStream.activeMediaPlaylistUrl = null;
            newStream.inbandEvents = [];
            newStream.adAvails = [];
            newStream.mediaPlaylists =
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
                    : new Map();
            return newStream;
        });

        set({
            streams: fullyFormedStreams,
            activeStreamId: fullyFormedStreams[0]?.id ?? null,
            urlAuthMap: new Map(urlAuthMapArray),
        });
        eventBus.dispatch('state:analysis-complete', {
            streams: get().streams,
        });
    },

    setActiveStreamId: (streamId) => set({ activeStreamId: streamId }),
    setActiveStreamInputId: (id) => set({ activeStreamInputId: id }),
    setActiveSegmentUrl: (id) => {
        console.warn(
            'setActiveSegmentUrl is deprecated in analysisStore. Use uiActions.navigateToInteractiveSegment instead.'
        );
        uiActions.navigateToInteractiveSegment(id);
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
        const initialState = createInitialAnalysisState();
        set({
            streamInputs: initialState.streamInputs,
            streamIdCounter: initialState.streamIdCounter,
            activeStreamInputId: initialState.activeStreamInputId,
        });
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
                    const pristineAuth = { headers: [], queryParams: [] };
                    const pristineDrmAuth = {
                        licenseServerUrl: '',
                        serverCertificate: null,
                        headers: [],
                        queryParams: [],
                    };

                    return {
                        ...input,
                        url: preset.url || '',
                        name: preset.name || '',
                        file: null,
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
        set((state) => {
            const stream = state.streams.find((s) => s.id === streamId);
            if (!stream) return state;

            const newUrlAuthMap = new Map(state.urlAuthMap);
            const authContext = { streamId, auth: stream.auth };
            let segmentsWereUpdated = false;

            const newDashState = new Map(stream.dashRepresentationState);
            if (updatedStreamData.dashRepresentationState) {
                for (const [
                    key,
                    value,
                ] of updatedStreamData.dashRepresentationState) {
                    const newSegmentUrls = value.newlyAddedSegmentUrls;
                    if (newSegmentUrls && newSegmentUrls.size > 0) {
                        segmentsWereUpdated = true;
                        for (const segUrl of newSegmentUrls) {
                            newUrlAuthMap.set(segUrl, authContext);
                        }
                    }
                    newDashState.set(key, {
                        ...value,
                        segments: value.segments || [],
                        currentSegmentUrls: new Set(value.currentSegmentUrls),
                        newlyAddedSegmentUrls: new Set(newSegmentUrls),
                    });
                }
            }

            const newHlsState = new Map(stream.hlsVariantState);
            if (updatedStreamData.hlsVariantState) {
                for (const [key, value] of updatedStreamData.hlsVariantState) {
                    const newSegmentUrls = value.newlyAddedSegmentUrls;
                    if (newSegmentUrls && newSegmentUrls.size > 0) {
                        segmentsWereUpdated = true;
                        for (const segUrl of newSegmentUrls) {
                            newUrlAuthMap.set(segUrl, authContext);
                        }
                    }
                    newHlsState.set(key, {
                        ...value,
                        segments: value.segments || [],
                        currentSegmentUrls: new Set(value.currentSegmentUrls),
                        newlyAddedSegmentUrls: new Set(newSegmentUrls),
                    });
                }
            }

            const newStreamState = {
                ...stream,
                ...updatedStreamData,
                dashRepresentationState: newDashState,
                hlsVariantState: newHlsState,
            };

            const newStreams = state.streams.map((s) =>
                s.id === streamId ? newStreamState : s
            );

            debugLog(
                'AnalysisStore',
                `State updated for stream ${streamId}. Segments updated: ${segmentsWereUpdated}`,
                {
                    newState: newStreamState,
                    newUrlAuthMapSize: newUrlAuthMap.size,
                }
            );

            if (segmentsWereUpdated) {
                eventBus.dispatch('stream:segments-updated', { streamId });
            }
            eventBus.dispatch('state:stream-updated', { streamId });

            return { streams: newStreams, urlAuthMap: newUrlAuthMap };
        });
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
        currentSegmentUrls,
        newSegmentUrls,
    }) => {
        set((state) => {
            const stream = state.streams.find((s) => s.id === streamId);
            if (!stream) return {};

            const newUrlAuthMap = new Map(state.urlAuthMap);
            const newVariantState = new Map(stream.hlsVariantState);
            const currentState = newVariantState.get(variantUri);

            if (currentState) {
                const oldSegments = currentState.segments || [];
                const newSegmentsFromManifest = segments || [];

                const segmentMap = new Map(
                    oldSegments.map((seg) => [seg.uniqueId, seg])
                );
                newSegmentsFromManifest.forEach((seg) => {
                    segmentMap.set(seg.uniqueId, seg);
                    newUrlAuthMap.set(seg.resolvedUrl, {
                        streamId,
                        auth: stream.auth,
                    });
                });
                const mergedSegments = Array.from(segmentMap.values());

                newVariantState.set(variantUri, {
                    ...currentState,
                    segments: mergedSegments,
                    currentSegmentUrls: new Set(currentSegmentUrls),
                    newlyAddedSegmentUrls: new Set(newSegmentUrls),
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
                urlAuthMap: newUrlAuthMap,
            };
        });
    },

    addHlsSegmentFromPlayer: ({ streamId, segmentUrl }) => {
        set((state) => {
            const stream = state.streams.find((s) => s.id === streamId);
            if (!stream || stream.protocol !== 'hls') return {};

            const newVariantState = new Map(stream.hlsVariantState);
            let updated = false;

            for (const [
                variantUri,
                variantState,
            ] of newVariantState.entries()) {
                const baseDir = variantUri.substring(
                    0,
                    variantUri.lastIndexOf('/') + 1
                );

                if (
                    segmentUrl.startsWith(baseDir) &&
                    !(variantState.segments || []).some(
                        (s) => s.resolvedUrl === segmentUrl
                    )
                ) {
                    const filename = segmentUrl.split('/').pop().split('?')[0];
                    const match = filename.match(/(\d+)\.(m4s|ts)/);
                    const sequenceNumber = match ? parseInt(match[1], 10) : -1;

                    if (sequenceNumber !== -1) {
                        /** @type {import('@/types').HlsSegment} */
                        const newSegment = {
                            repId: 'hls-media',
                            type: 'Media',
                            number: sequenceNumber,
                            uniqueId: segmentUrl,
                            resolvedUrl: segmentUrl,
                            template: filename,
                            time: 0,
                            duration: 0, // Duration is unknown for segments discovered this way
                            timescale: 90000,
                            gap: false,
                            flags: [],
                            title: '',
                            tags: [],
                            parts: [],
                            bitrate: null,
                            extinfLineNumber: -1,
                        };
                        const updatedSegments = [
                            ...(variantState.segments || []),
                            newSegment,
                        ].sort((a, b) => a.number - b.number);

                        variantState.segments = updatedSegments;
                        variantState.newlyAddedSegmentUrls.add(
                            newSegment.uniqueId
                        );
                        updated = true;
                        break; // Stop after finding the correct variant
                    }
                }
            }

            if (updated) {
                eventBus.dispatch('stream:segments-updated', { streamId });
                return {
                    streams: state.streams.map((s) =>
                        s.id === streamId
                            ? { ...s, hlsVariantState: newVariantState }
                            : s
                    ),
                };
            }
            return {}; // No change
        });
    },
}));

export const analysisActions = useAnalysisStore.getState();
