import { createStore } from 'zustand/vanilla';
import { eventBus } from '@/application/event-bus';
import { uiActions } from './uiStore.js';
import { appLog } from '@/shared/utils/debug';
import {
    prepareForStorage,
    restoreFromStorage,
} from '@/infrastructure/persistence/streamStorage';
import { useMultiPlayerStore } from './multiPlayerStore.js';
import { showToast } from '@/ui/components/toast.js';
import { playerService } from '@/features/playerSimulation/application/playerService.js';
import { usePlayerStore } from './playerStore.js';
import { useSegmentCacheStore } from './segmentCacheStore.js';
import { EVENTS } from '@/types/events';
import {
    applyPatches,
    generateBlobUrl,
} from '@/features/manifestPatcher/domain/patchService';
import { parseManifest as parseHls } from '@/infrastructure/parsing/hls/index.js';
import { parseManifest as parseDash } from '@/infrastructure/parsing/dash/parser.js';
import { generateDashSummary } from '@/infrastructure/parsing/dash/summary-generator.js';
import { generateHlsSummary } from '@/infrastructure/parsing/hls/summary-generator.js';
import { rebaseManifest } from '@/infrastructure/parsing/utils/manifest-rebaser.js';

// --- Type Definitions ---
/** @typedef {import('@/types.ts').Stream} Stream */
/** @typedef {import('@/types.ts').DecodedSample} DecodedSample */
/** @typedef {import('@/types.ts').Event} Event */
/** @typedef {import('@/types.ts').AuthInfo} AuthInfo */
/** @typedef {import('@/types.ts').DrmAuthInfo} DrmAuthInfo */
/** @typedef {import('@/types.ts').StreamInput} StreamInput */
/** @typedef {{streamId: number, repId: string, segmentUniqueId: string}} SegmentToCompare */
/** @typedef {import('@/types').MediaSegment} MediaSegment */

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

const hydrateStream = (s) => {
    const newStream = { ...s };
    newStream.originalSerializedManifest = JSON.parse(
        JSON.stringify(s.manifest.serializedManifest)
    );

    const newDashRepState = new Map();
    if (s.dashRepresentationState) {
        for (const [key, value] of s.dashRepresentationState) {
            newDashRepState.set(key, {
                ...value,
                currentSegmentUrls: new Set(value.currentSegmentUrls || []),
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
                currentSegmentUrls: new Set(value.currentSegmentUrls || []),
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
    newStream.activeMediaPlaylistBaseUrl = null;
    newStream.activeMediaPlaylistId = null;
    newStream.adAvails = s.adAvails || [];

    newStream.mediaPlaylists = new Map(s.mediaPlaylists || []);
    if (s.protocol === 'hls' && s.manifest?.isMaster) {
        if (!newStream.mediaPlaylists.has('master')) {
            newStream.mediaPlaylists.set('master', {
                manifest: s.manifest,
                rawManifest: s.rawManifest,
                lastFetched: new Date(),
                updates: s.manifestUpdates,
                activeUpdateId: s.manifestUpdates[0]?.id || null,
            });
        }
        newStream.activeMediaPlaylistId = 'master';
    } else if (s.protocol === 'hls' && !s.manifest?.isMaster) {
        newStream.activeMediaPlaylistId = s.originalUrl;
        newStream.activeMediaPlaylistUrl = s.originalUrl;
    }

    newStream.activeManifestUpdateId = s.manifestUpdates[0]?.id || null;
    newStream.segmentPollingReps = new Set(s.segmentPollingReps || []);
    newStream.patchRules = s.patchRules || [];
    newStream.patchedRawManifest = s.patchedRawManifest || s.rawManifest;
    newStream.patchedManifestUrl = s.patchedManifestUrl || null;

    return newStream;
};

export const useAnalysisStore = createStore((set, get) => ({
    ...createInitialAnalysisState(),

    // --- Actions ---
    _reset: () => {
        set(createInitialAnalysisState());
    },

    startAnalysis: () => {
        set(createInitialAnalysisState());
        uiActions.reset();
        useSegmentCacheStore.getState().clear();
    },

    completeAnalysis: (streams, urlAuthMapArray, inputs) => {
        const hydratedInputs = inputs.map((input) => ({
            ...input,
            detectedDrm: null,
            isDrmInfoLoading: false,
        }));

        const fullyFormedStreams = streams.map(hydrateStream);

        set({
            streams: fullyFormedStreams,
            activeStreamId: fullyFormedStreams[0]?.id ?? null,
            urlAuthMap: new Map(urlAuthMapArray),
            streamInputs: hydratedInputs,
            activeStreamInputId:
                hydratedInputs.length > 0 ? hydratedInputs[0].id : null,
        });

        useMultiPlayerStore.getState().initializePlayers(fullyFormedStreams);

        eventBus.dispatch(EVENTS.STATE.ANALYSIS_COMPLETE, {
            streams: get().streams,
        });
    },

    appendStreams: (newStreams, newUrlAuthMapArray) => {
        const currentStreams = get().streams;
        const fullyFormedNewStreams = newStreams.map(hydrateStream);

        // Merge Auth Map
        const currentAuthMap = get().urlAuthMap;
        const newAuthMap = new Map(newUrlAuthMapArray);
        for (const [key, val] of newAuthMap.entries()) {
            currentAuthMap.set(key, val);
        }

        // Append Streams
        const updatedStreams = [...currentStreams, ...fullyFormedNewStreams];

        set({
            streams: updatedStreams,
            urlAuthMap: new Map(currentAuthMap), // Trigger update
            // Set active stream to the first of the newly added streams
            activeStreamId:
                fullyFormedNewStreams[0]?.id ?? get().activeStreamId,
        });

        // Initialize players for ONLY the new streams
        fullyFormedNewStreams.forEach((stream) => {
            useMultiPlayerStore
                .getState()
                .addPlayer(
                    stream.id,
                    stream.name,
                    stream.originalUrl,
                    stream.manifest?.type === 'dynamic' ? 'live' : 'vod'
                );
        });

        eventBus.dispatch(EVENTS.STATE.ANALYSIS_COMPLETE, {
            streams: updatedStreams,
        });
    },

    setActiveStreamId: (streamId) => set({ activeStreamId: streamId }),
    setActiveStreamInputId: (id) => set({ activeStreamInputId: id }),
    setActiveManifestUpdate: (streamId, updateId) => {
        set((state) => ({
            streams: state.streams.map((s) => {
                if (s.id !== streamId) return s;

                const activeId =
                    s.activeMediaPlaylistId ||
                    (s.protocol === 'hls' ? 'master' : null);
                if (activeId) {
                    const newMediaPlaylists = new Map(s.mediaPlaylists);
                    const playlistData = newMediaPlaylists.get(activeId);
                    if (playlistData) {
                        newMediaPlaylists.set(activeId, {
                            ...playlistData,
                            activeUpdateId: updateId,
                        });
                        return { ...s, mediaPlaylists: newMediaPlaylists };
                    }
                }
                return { ...s, activeManifestUpdateId: updateId };
            }),
        }));
    },
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
                url: null,
                name: null,
                file: null,
                auth: { headers: [], queryParams: [] },
                drmAuth: {
                    licenseServerUrl: null,
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

        const getComparable = (input) => {
            const storable = prepareForStorage(input);
            delete storable.id;
            delete storable.detectedDrm;
            delete storable.isDrmInfoLoading;
            return JSON.stringify(storable);
        };

        const newComparable = getComparable({
            url: preset.url || null,
            name: preset.name || null,
            file: null,
            auth: preset.auth || { headers: [], queryParams: [] },
            drmAuth: preset.drmAuth || {
                licenseServerUrl: null,
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
            set({ activeStreamInputId: existingInput.id });
            return;
        }

        set({
            streamInputs: [
                ...state.streamInputs,
                {
                    id: state.streamIdCounter,
                    url: preset.url || null,
                    name: preset.name || null,
                    file: null,
                    auth: preset.auth
                        ? JSON.parse(JSON.stringify(preset.auth))
                        : { headers: [], queryParams: [] },
                    drmAuth: preset.drmAuth
                        ? restoreFromStorage(prepareForStorage(preset.drmAuth))
                        : {
                              licenseServerUrl: null,
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
        // Clean up associated player resources
        useMultiPlayerStore.getState().removePlayer(id);

        set((state) => {
            // Filter inputs
            const remainingInputs = state.streamInputs.filter(
                (i) => i.id !== id
            );

            // Filter active analyzed streams
            const remainingStreams = state.streams.filter((s) => s.id !== id);

            // Remove any segments queued for comparison from this stream
            const remainingComparisons = state.segmentsForCompare.filter(
                (s) => s.streamId !== id
            );

            // Determine new active input ID
            let newActiveInputId = state.activeStreamInputId;
            if (state.activeStreamInputId === id) {
                if (remainingInputs.length === 0) {
                    newActiveInputId = null;
                } else {
                    // Fallback to the first available input
                    newActiveInputId = remainingInputs[0].id;
                }
            }

            // Determine new active stream ID
            let newActiveStreamId = state.activeStreamId;
            if (state.activeStreamId === id) {
                if (remainingStreams.length === 0) {
                    newActiveStreamId = null;
                } else {
                    // Fallback to the first available stream
                    newActiveStreamId = remainingStreams[0].id;
                }
            }

            return {
                streamInputs: remainingInputs,
                streams: remainingStreams,
                activeStreamInputId: newActiveInputId,
                activeStreamId: newActiveStreamId,
                segmentsForCompare: remainingComparisons,
            };
        });

        // Trigger event to notify UI components that rely on the stream list (e.g. MultiPlayer, Comparison)
        eventBus.dispatch(EVENTS.STATE.STREAM_UPDATED, { streamId: -1 });
        eventBus.dispatch(EVENTS.STATE.COMPARE_LIST_CHANGED, {
            count: get().segmentsForCompare.length,
        });
    },

    clearAllStreamInputs: () => {
        useMultiPlayerStore.getState().clearPlayersAndLogs();
        set({
            streamInputs: [],
            streams: [],
            segmentsForCompare: [],
            activeStreamInputId: null,
            activeStreamId: null,
        });
    },

    setStreamInputs: (inputs) => {
        const newInputs = inputs.map((input, index) => ({
            id: index,
            url: input.url || null,
            name: input.name || null,
            file: null,
            auth: input.auth || { headers: [], queryParams: [] },
            drmAuth: input.drmAuth || {
                licenseServerUrl: null,
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
                    let normalizedValue = value;
                    if (field === 'url' || field === 'name') {
                        normalizedValue = value.trim() === '' ? null : value;
                    }
                    const updatedInput = { ...input, [field]: normalizedValue };
                    if (field === 'url') {
                        updatedInput.isDrmInfoLoading = !!value;
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
                    const presetDrmAuth = preset.drmAuth || {};
                    return {
                        ...input,
                        url: preset.url || null,
                        name: preset.name || null,
                        file: null,
                        auth: {
                            headers: [],
                            queryParams: [],
                            ...(preset.auth || {}),
                        },
                        drmAuth: {
                            licenseServerUrl:
                                presetDrmAuth.licenseServerUrl || null,
                            serverCertificate:
                                presetDrmAuth.serverCertificate || null,
                            headers: presetDrmAuth.headers || [],
                            queryParams: presetDrmAuth.queryParams || [],
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
            eventBus.dispatch(EVENTS.STATE.COMPARE_LIST_CHANGED, {
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
        eventBus.dispatch(EVENTS.STATE.COMPARE_LIST_CHANGED, {
            count: get().segmentsForCompare.length,
        });
    },

    clearSegmentsToCompare: () => {
        set({ segmentsForCompare: [] });
        eventBus.dispatch(EVENTS.STATE.COMPARE_LIST_CHANGED, { count: 0 });
    },

    updateStream: (streamId, updatedStreamData) => {
        appLog(
            'AnalysisStore',
            'info',
            `[updateStream] Received update for stream ${streamId}.`,
            updatedStreamData
        );
        set((state) => ({
            streams: state.streams.map((s) => {
                if (s.id !== streamId) return s;

                const newStream = { ...s, ...updatedStreamData };

                if (updatedStreamData.dashRepresentationState) {
                    const rehydrated = new Map();
                    for (const [
                        key,
                        value,
                    ] of updatedStreamData.dashRepresentationState.entries()) {
                        rehydrated.set(key, {
                            ...value,
                            currentSegmentUrls: new Set(
                                value.currentSegmentUrls || []
                            ),
                            newlyAddedSegmentUrls: new Set(
                                value.newlyAddedSegmentUrls || []
                            ),
                        });
                    }
                    newStream.dashRepresentationState = rehydrated;
                }

                if (updatedStreamData.hlsVariantState) {
                    const rehydrated = new Map();
                    for (const [
                        key,
                        value,
                    ] of updatedStreamData.hlsVariantState.entries()) {
                        rehydrated.set(key, {
                            ...value,
                            currentSegmentUrls: new Set(
                                value.currentSegmentUrls || []
                            ),
                            newlyAddedSegmentUrls: new Set(
                                value.newlyAddedSegmentUrls || []
                            ),
                        });
                    }
                    newStream.hlsVariantState = rehydrated;
                }

                if (updatedStreamData.inbandEventsToAdd?.length > 0) {
                    const newEvents = updatedStreamData.inbandEventsToAdd;
                    newStream.inbandEvents = [
                        ...(s.inbandEvents || []),
                        ...newEvents,
                    ];

                    const eventsBySegmentId = newEvents.reduce((acc, event) => {
                        const id = event.sourceSegmentId;
                        if (id) (acc[id] = acc[id] || []).push(event);
                        return acc;
                    }, {});

                    const updateSegmentsInMap = (stateMap) => {
                        if (!stateMap) return;
                        for (const [repId, repState] of stateMap.entries()) {
                            if (!repState.segments) continue;
                            let repModified = false;
                            const newSegments = repState.segments.map(
                                (segment) => {
                                    const eventsForSeg =
                                        eventsBySegmentId[segment.uniqueId];
                                    if (eventsForSeg) {
                                        repModified = true;
                                        const newFlags = new Set(
                                            segment.flags || []
                                        );
                                        if (
                                            eventsForSeg.some((e) => e.scte35)
                                        ) {
                                            newFlags.add('scte35');
                                        }
                                        return {
                                            ...segment,
                                            inbandEvents: [
                                                ...(segment.inbandEvents || []),
                                                ...eventsForSeg,
                                            ],
                                            flags: Array.from(newFlags),
                                        };
                                    }
                                    return segment;
                                }
                            );
                            if (repModified) {
                                stateMap.set(repId, {
                                    ...repState,
                                    segments: newSegments,
                                });
                            }
                        }
                    };

                    updateSegmentsInMap(newStream.dashRepresentationState);
                    updateSegmentsInMap(newStream.hlsVariantState);
                }
                delete newStream.inbandEventsToAdd;

                return newStream;
            }),
        }));

        if (updatedStreamData.inbandEventsToAdd?.length > 0) {
            eventBus.dispatch(EVENTS.STATE.INBAND_EVENTS_ADDED, {
                streamId,
                newEvents: updatedStreamData.inbandEventsToAdd,
            });
        }
        eventBus.dispatch(EVENTS.STATE.STREAM_UPDATED, { streamId });
    },

    addInbandEvents: (streamId, events) => {
        if (!events || events.length === 0) return;
        get().updateStream(streamId, { inbandEventsToAdd: events });
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
        eventBus.dispatch(EVENTS.STATE.STREAM_UPDATED);
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
        eventBus.dispatch(EVENTS.STATE.STREAM_UPDATED);
    },

    setStreamPollingIntervalOverride: (streamId, interval) => {
        set((state) => ({
            streams: state.streams.map((s) =>
                s.id === streamId
                    ? { ...s, pollingIntervalOverride: interval }
                    : s
            ),
        }));
        eventBus.dispatch(EVENTS.STATE.STREAM_UPDATED);
    },

    navigateManifestUpdate: (streamId, direction) => {
        set((state) => ({
            streams: state.streams.map((s) => {
                if (s.id !== streamId) return s;

                const activeId =
                    s.activeMediaPlaylistId ||
                    (s.protocol === 'hls' ? 'master' : null);
                let updates, activeUpdateId;

                if (s.protocol === 'hls' && activeId) {
                    const playlistData = s.mediaPlaylists.get(activeId);
                    updates = playlistData?.updates || [];
                    activeUpdateId = playlistData?.activeUpdateId;
                } else {
                    updates = s.manifestUpdates;
                    activeUpdateId = s.activeManifestUpdateId;
                }

                if (!updates || updates.length === 0) return s;

                const currentIndex = updates.findIndex(
                    (u) => u.id === activeUpdateId
                );
                let newIndex = currentIndex + direction;
                newIndex = Math.max(0, Math.min(newIndex, updates.length - 1));

                if (newIndex === currentIndex) return s;

                const newActiveUpdateId = updates[newIndex].id;

                if (s.protocol === 'hls' && activeId) {
                    const newMediaPlaylists = new Map(s.mediaPlaylists);
                    const playlistData = newMediaPlaylists.get(activeId);
                    if (playlistData) {
                        newMediaPlaylists.set(activeId, {
                            ...playlistData,
                            activeUpdateId: newActiveUpdateId,
                        });
                        return { ...s, mediaPlaylists: newMediaPlaylists };
                    }
                }

                return { ...s, activeManifestUpdateId: newActiveUpdateId };
            }),
        }));
    },

    toggleSegmentPollingForRep: (streamId, repId) => {
        set((state) => ({
            streams: state.streams.map((s) => {
                if (s.id === streamId) {
                    const newSet = new Set(s.segmentPollingReps);
                    if (newSet.has(repId)) {
                        newSet.delete(repId);
                    } else {
                        newSet.add(repId);
                    }
                    return { ...s, segmentPollingReps: newSet };
                }
                return s;
            }),
        }));
    },

    updatePatchRules: (streamId, rules) => {
        set((state) => ({
            streams: state.streams.map((s) =>
                s.id === streamId ? { ...s, patchRules: rules } : s
            ),
        }));
    },

    applyPatchesToStream: async (streamId) => {
        const state = get();
        const stream = state.streams.find((s) => s.id === streamId);
        if (!stream) return;

        const patchedContent = applyPatches(
            stream.rawManifest,
            stream.patchRules
        );

        if (stream.patchedManifestUrl) {
            URL.revokeObjectURL(stream.patchedManifestUrl);
        }

        const rebasedContent = rebaseManifest(
            patchedContent,
            stream.baseUrl,
            stream.protocol
        );

        const mimeType =
            stream.protocol === 'dash'
                ? 'application/dash+xml'
                : 'application/x-mpegurl';
        const newUrl = generateBlobUrl(rebasedContent, mimeType);

        const parsingOptions = {
            isPrimary: true,
            isLive: stream.manifest.type === 'dynamic',
            hls: {
                masterPlaylist: stream.manifest.isMaster,
            },
        };

        let parsedResult;
        let newManifest;
        if (stream.protocol === 'hls') {
            parsedResult = await parseHls(
                patchedContent,
                newUrl,
                undefined,
                parsingOptions
            );
            newManifest = parsedResult.manifest;
            const summaryResult = await generateHlsSummary(newManifest, {
                mediaPlaylists: stream.mediaPlaylists,
            });
            newManifest.summary = summaryResult.summary;
        } else {
            parsedResult = await parseDash(
                patchedContent,
                newUrl,
                parsingOptions
            );
            newManifest = parsedResult.manifest;
            const summary = await generateDashSummary(
                newManifest,
                parsedResult.serializedManifest
            );
            newManifest.summary = summary;
        }

        set((state) => ({
            streams: state.streams.map((s) =>
                s.id === streamId
                    ? {
                          ...s,
                          patchedRawManifest: patchedContent,
                          patchedManifestUrl: newUrl,
                          manifest: newManifest,
                      }
                    : s
            ),
        }));

        eventBus.dispatch(EVENTS.STATE.STREAM_UPDATED, { streamId });
    },
}));

export const analysisActions = useAnalysisStore.getState();
