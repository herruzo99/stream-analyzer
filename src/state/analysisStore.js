import { createStore } from 'zustand/vanilla';
import { eventBus } from '@/application/event-bus';
import { uiActions } from './uiStore.js';
import { debugLog } from '@/shared/utils/debug';
import {
    prepareForStorage,
    restoreFromStorage,
} from '@/infrastructure/persistence/streamStorage';
import { useMultiPlayerStore } from './multiPlayerStore.js';
import { showToast } from '@/ui/components/toast.js';
import { playerService } from '@/features/playerSimulation/application/playerService.js';
import { usePlayerStore } from './playerStore.js';

// --- Type Definitions ---
/** @typedef {import('@/types.ts').Stream} Stream */
/** @typedef {import('@/types.ts').DecodedSample} DecodedSample */
/** @typedef {import('@/types.ts').Event} Event */
/** @typedef {import('@/types.ts').AuthInfo} AuthInfo */
/** @typedef {import('@/types.ts').DrmAuthInfo} DrmAuthInfo */
/** @typedef {import('@/types.ts').StreamInput} StreamInput */
/** @typedef {{streamId: number, repId: string, segmentUniqueId: string}} SegmentToCompare */
/** @typedef {import('@/types').MediaSegment} MediaSegment */

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
 * @property {(streams: Stream[], urlAuthMapArray: [string, {streamId: number, auth: AuthInfo}][], inputs: Partial<StreamInput>[]) => void} completeAnalysis
 * @property {(streamId: number) => void} setActiveStreamId
 * @property {(updateId: string) => void} setActiveManifestUpdate
 * @property {(id: string) => void} setActiveSegmentUrl
 * @property {() => void} addStreamInput
 * @property {(preset: Partial<StreamInput>) => void} addStreamInputFromPreset
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
 * @property {(streamId: number, isPolling: boolean) => void} setStreamPolling
 * @property {(streamId: number, direction: number) => void} navigateManifestUpdate
 * @property {(payload: {streamId: number, variantUri: string, manifest: object, manifestString: string, segments: object[], currentSegmentUrls: string[], newSegmentUrls: string[]}) => void} updateHlsMediaPlaylist
 * @property {(streamId: number, events: Event[]) => void} addInbandEvents
 * @property {(id: number) => void} setActiveStreamInputId
 * @property {(payload: {streamId: number, segment: MediaSegment}) => void} addDashSegmentFromPlayer
 * @property {(payload: {streamId: number, segmentUrl: string}) => void} addHlsSegmentFromPlayer
 */

const createInitialAnalysisState = () => ({
    streams: [],
    activeStreamId: null,
    streamIdCounter: 1,
    streamInputs: [],
    activeStreamInputId: null,
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
        set(createInitialAnalysisState());
        uiActions.reset();
    },

    completeAnalysis: (streams, urlAuthMapArray, inputs) => {
        const hydratedInputs = inputs.map(
            (input) =>
                /** @type {StreamInput} */ ({
                    ...input,
                    detectedDrm: null,
                    isDrmInfoLoading: false,
                })
        );

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

            if (s.manifest?.hlsDefinedVariables) {
                s.manifest.hlsDefinedVariables = new Map(
                    s.manifest.hlsDefinedVariables
                );
            }

            newStream.wasStoppedByInactivity = false;
            newStream.activeMediaPlaylistUrl = null;
            newStream.inbandEvents = [];
            newStream.adAvails = s.adAvails || [];
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
            newStream.activeManifestUpdateId = s.manifestUpdates[0]?.id || null;
            return newStream;
        });

        set({
            streams: fullyFormedStreams,
            activeStreamId: fullyFormedStreams[0]?.id ?? null,
            urlAuthMap: new Map(urlAuthMapArray),
            streamInputs: hydratedInputs,
            activeStreamInputId:
                hydratedInputs.length > 0 ? hydratedInputs[0].id : null,
        });

        useMultiPlayerStore.getState().initializePlayers(fullyFormedStreams);

        eventBus.dispatch('state:analysis-complete', {
            streams: get().streams,
        });
    },

    setActiveStreamId: (streamId) => set({ activeStreamId: streamId }),
    setActiveManifestUpdate: (streamId, updateId) => {
        set((state) => ({
            streams: state.streams.map((s) => {
                if (s.id === streamId) {
                    return { ...s, activeManifestUpdateId: updateId };
                }
                return s;
            }),
        }));
    },
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
            const newStreamInput = {
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
                detectedDrm: null,
                isDrmInfoLoading: false,
            };
            return {
                streamInputs: [...state.streamInputs, newStreamInput],
                streamIdCounter: newId + 1,
                activeStreamInputId: newId,
            };
        });
    },

    addStreamInputFromPreset: (preset) => {
        const state = get();

        // Create a canonical, comparable object from the new preset.
        const getComparable = (input) => {
            const storable = prepareForStorage(input);
            // Delete client-side and transient state properties before comparison
            delete storable.id;
            delete storable.detectedDrm;
            delete storable.isDrmInfoLoading;
            return JSON.stringify(storable);
        };

        const newComparable = getComparable({
            url: preset.url || '',
            name: preset.name || '',
            file: null,
            auth: preset.auth || { headers: [], queryParams: [] },
            drmAuth: preset.drmAuth || {
                licenseServerUrl: '',
                serverCertificate: null,
                headers: [],
                queryParams: [],
            },
        });

        const existingInput = state.streamInputs.find(
            (input) => getComparable(input) === newComparable
        );

        if (existingInput) {
            showToast({
                message:
                    'This stream configuration already exists in the workspace.',
                type: 'warn',
            });
            set({ activeStreamInputId: existingInput.id }); // Focus the existing one
            return;
        }

        set({
            streamInputs: [
                ...state.streamInputs,
                {
                    id: state.streamIdCounter,
                    url: preset.url || '',
                    name: preset.name || '',
                    file: null,
                    auth: preset.auth
                        ? JSON.parse(JSON.stringify(preset.auth))
                        : { headers: [], queryParams: [] },
                    drmAuth: preset.drmAuth
                        ? restoreFromStorage(prepareForStorage(preset.drmAuth))
                        : {
                              licenseServerUrl: '',
                              serverCertificate: null,
                              headers: [],
                              queryParams: [],
                          },
                    detectedDrm: null,
                    isDrmInfoLoading: !!preset.url,
                },
            ],
            streamIdCounter: state.streamIdCounter + 1,
            activeStreamInputId: state.streamIdCounter,
        });
    },

    removeStreamInput: (id) => {
        set((state) => {
            const remaining = state.streamInputs.filter((i) => i.id !== id);

            let newActiveId = state.activeStreamInputId;
            if (remaining.length === 0) {
                newActiveId = null;
            } else if (state.activeStreamInputId === id) {
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
        set({
            streamInputs: [],
            activeStreamInputId: null,
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
            detectedDrm: null,
            isDrmInfoLoading: !!input.url,
        }));
        set({
            streamInputs: newInputs,
            streamIdCounter: newInputs.length,
            activeStreamInputId: newInputs[0]?.id ?? 0,
        });
    },

    updateStreamInput: (id, field, value) => {
        set((state) => {
            const updatedInputs = state.streamInputs.map((input) => {
                if (input.id === id) {
                    const updatedInput = { ...input, [field]: value };
                    if (field === 'url') {
                        updatedInput.isDrmInfoLoading = !!value; // Start loading on URL change
                        updatedInput.detectedDrm = null;
                    }
                    return updatedInput;
                }
                return input;
            });
            return { streamInputs: updatedInputs };
        });
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
                        detectedDrm: null,
                        isDrmInfoLoading: !!preset.url,
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
            streams: state.streams.map((s) => {
                if (s.id === streamId) {
                    const hydratedUpdate = { ...updatedStreamData };

                    if (hydratedUpdate.dashRepresentationState) {
                        const newDashState = new Map();
                        for (const [
                            key,
                            value,
                        ] of hydratedUpdate.dashRepresentationState.entries()) {
                            newDashState.set(key, {
                                ...value,
                                currentSegmentUrls: new Set(
                                    value.currentSegmentUrls || []
                                ),
                                newlyAddedSegmentUrls: new Set(
                                    value.newlyAddedSegmentUrls || []
                                ),
                            });
                        }
                        hydratedUpdate.dashRepresentationState = newDashState;
                    }

                    if (hydratedUpdate.hlsVariantState) {
                        const newHlsState = new Map();
                        for (const [
                            key,
                            value,
                        ] of hydratedUpdate.hlsVariantState.entries()) {
                            const existingState =
                                s.hlsVariantState.get(key) || {};
                            newHlsState.set(key, {
                                ...existingState,
                                ...value,
                                currentSegmentUrls: new Set(
                                    value.currentSegmentUrls || []
                                ),
                                newlyAddedSegmentUrls: new Set(
                                    value.newlyAddedSegmentUrls || []
                                ),
                            });
                        }
                        hydratedUpdate.hlsVariantState = newHlsState;
                    }

                    const newStream = { ...s, ...hydratedUpdate };

                    // --- ARCHITECTURAL FIX: "Follow Live" Mode ---
                    const oldLatestUpdateId = s.manifestUpdates[0]?.id;
                    const newLatestUpdateId = newStream.manifestUpdates[0]?.id;
                    if (s.activeManifestUpdateId === oldLatestUpdateId) {
                        newStream.activeManifestUpdateId = newLatestUpdateId;
                    }
                    // --- END FIX ---

                    return newStream;
                }
                return s;
            }),
        }));
        debugLog('AnalysisStore', `State updated for stream ${streamId}.`, {
            updatedData: updatedStreamData,
        });
        eventBus.dispatch('state:stream-updated', { streamId });
    },

    addInbandEvents: (streamId, events) => {
        if (!events || events.length === 0) return;
        set((state) => ({
            streams: state.streams.map((s) => {
                if (s.id === streamId) {
                    const newStream = { ...s };
                    newStream.inbandEvents = [
                        ...(s.inbandEvents || []),
                        ...events,
                    ];
                    return newStream;
                }
                return s;
            }),
        }));
        eventBus.dispatch('state:inband-events-added', {
            streamId,
            newEvents: events,
        });
    },

    setAllLiveStreamsPolling: (isPolling, options = {}) => {
        if (options.fromInactivity && !isPolling) {
            const { isLoaded } = usePlayerStore.getState();
            if (isLoaded) {
                playerService.destroy();
            }
        }

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

    setStreamPolling: (streamId, isPolling) => {
        set((state) => ({
            streams: state.streams.map((s) => {
                if (s.id === streamId) {
                    const newStream = { ...s, isPolling };
                    if (isPolling) {
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
        set((state) => ({
            streams: state.streams.map((s) => {
                if (s.id === streamId && s.manifestUpdates.length > 0) {
                    const currentIndex = s.manifestUpdates.findIndex(
                        (u) => u.id === s.activeManifestUpdateId
                    );
                    let newIndex = currentIndex + direction;
                    newIndex = Math.max(
                        0,
                        Math.min(newIndex, s.manifestUpdates.length - 1)
                    );

                    if (newIndex === currentIndex) return s;

                    const newActiveId = s.manifestUpdates[newIndex].id;
                    const newStream = {
                        ...s,
                        activeManifestUpdateId: newActiveId,
                    };

                    if (newIndex === 0) {
                        newStream.manifestUpdates[0].hasNewIssues = false;
                    }
                    return newStream;
                }
                return s;
            }),
        }));
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
        debugLog(
            'AnalysisStore',
            `updateHlsMediaPlaylist action called for stream ${streamId}`,
            { variantUri }
        );
        set((state) => {
            const stream = state.streams.find((s) => s.id === streamId);
            if (!stream) return {};

            const newUrlAuthMap = new Map(state.urlAuthMap);

            const newVariantState = new Map(stream.hlsVariantState);
            const newMediaPlaylists = new Map(stream.mediaPlaylists);

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

    addDashSegmentFromPlayer: ({ streamId, segment }) => {
        set((state) => {
            const stream = state.streams.find((s) => s.id === streamId);
            if (!stream || !segment || !segment.repId) return {};

            const newDashRepState = new Map(stream.dashRepresentationState);
            let updated = false;

            for (const [key, repState] of newDashRepState.entries()) {
                if (key.endsWith(`-${segment.repId}`)) {
                    const existingSegments = new Map(
                        (repState.segments || []).map((s) => [s.uniqueId, s])
                    );
                    if (!existingSegments.has(segment.uniqueId)) {
                        existingSegments.set(segment.uniqueId, segment);

                        const newSegments = Array.from(
                            existingSegments.values()
                        );

                        const newCurrentUrls = new Set(
                            repState.currentSegmentUrls
                        );
                        newCurrentUrls.add(segment.uniqueId);
                        const newNewlyAddedUrls = new Set(
                            repState.newlyAddedSegmentUrls
                        );
                        newNewlyAddedUrls.add(segment.uniqueId);

                        newDashRepState.set(key, {
                            ...repState,
                            segments: newSegments,
                            currentSegmentUrls: newCurrentUrls,
                            newlyAddedSegmentUrls: newNewlyAddedUrls,
                        });
                        updated = true;
                        break;
                    }
                }
            }

            if (updated) {
                eventBus.dispatch('stream:segments-updated', { streamId });
                return {
                    streams: state.streams.map((s) =>
                        s.id === streamId
                            ? { ...s, dashRepresentationState: newDashRepState }
                            : s
                    ),
                };
            }
            return {};
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
                            duration: 0, // Duration is unknown
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

                        newVariantState.set(variantUri, {
                            ...variantState,
                            segments: updatedSegments,
                            newlyAddedSegmentUrls: new Set([
                                ...variantState.newlyAddedSegmentUrls,
                                newSegment.uniqueId,
                            ]),
                        });
                        updated = true;
                        break;
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
            return {};
        });
    },
}));

export const analysisActions = useAnalysisStore.getState();
