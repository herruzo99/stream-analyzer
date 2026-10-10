import { eventBus } from '@/application/event-bus';
import {
    moveStagedSource,
    selectAfterStagedSourceRemoval,
    selectAfterStagedSourcesRemoval,
} from '@/features/streamInput/application/staging-contract.js';
import { projectPersistableEffectiveSource } from '@/features/streamInput/application/effective-source-configuration.js';
import { resolveManifestUpdateSelection } from './manifestUpdateSelection.js';
import {
    applyPatches,
    generateBlobUrl,
} from '@/features/manifestPatcher/domain/patchService';
import { parseManifest as parseDash } from '@/infrastructure/parsing/dash/parser.js';
import { generateDashSummary } from '@/infrastructure/parsing/dash/summary-generator.js';
import { parseManifest as parseHls } from '@/infrastructure/parsing/hls/index.js';
import { generateHlsSummary } from '@/infrastructure/parsing/hls/summary-generator.js';
import { rebaseManifest } from '@/infrastructure/parsing/utils/manifest-rebaser.js';
import { EVENTS } from '@/types/events';
import { createStore } from 'zustand/vanilla';
import { useMultiPlayerStore } from './multiPlayerStore.js';
import { useSegmentCacheStore } from './segmentCacheStore.js';
import { uiActions } from './uiStore.js';

// ... (Type definitions omitted for brevity) ...

const createInitialAnalysisState = () => ({
    analysisStatus: 'idle',
    streams: [],
    activeStreamId: null,
    streamIdCounter: 1,
    streamInputs: [],
    activeStreamInputId: null,
    selectedStreamInputIds: new Set(),
    segmentsForCompare: [],
    decodedSamples: new Map(),
    urlAuthMap: new Map(),
});

function hydrateStagedInput(source, id) {
    const persistable = projectPersistableEffectiveSource(source);
    return {
        id,
        url: persistable.url || null,
        name: persistable.name || null,
        file: null,
        auth: persistable.auth,
        drmAuth: persistable.drmAuth,
        detectedDrm: null,
        isDrmInfoLoading: false,
        tier0: null,
        isTier0AnalysisLoading: !!persistable.url,
    };
}

const hydrateStream = (s) => {
    const newStream = { ...s };

    // --- OPTIMIZATION & SAFETY: Use structuredClone for performance ---
    if (s.manifest && s.manifest.serializedManifest) {
        try {
            if (typeof structuredClone === 'function') {
                newStream.originalSerializedManifest = structuredClone(
                    s.manifest.serializedManifest
                );
            } else {
                newStream.originalSerializedManifest = JSON.parse(
                    JSON.stringify(s.manifest.serializedManifest)
                );
            }
        } catch (e) {
            console.warn('Failed to clone serializedManifest', e);
            newStream.originalSerializedManifest = {};
        }
    } else {
        newStream.originalSerializedManifest = {};
    }

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

    newStream.activeManifestUpdateId = s.manifestUpdates?.[0]?.id || null;
    newStream.segmentPollingReps = new Set(s.segmentPollingReps || []);
    newStream.patchRules = s.patchRules || [];
    newStream.patchedRawManifest = s.patchedRawManifest || s.rawManifest;
    newStream.patchedManifestUrl = s.patchedManifestUrl || null;

    return newStream;
};

const preparePatchedStream = async (stream, rules) => {
    const patchedContent = applyPatches(stream.rawManifest, rules);
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

    try {
        let parsedResult;
        let newManifest;
        if (stream.protocol === 'hls') {
            parsedResult = await parseHls(
                rebasedContent,
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
                rebasedContent,
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

        return { patchedContent, newUrl, newManifest };
    } catch (error) {
        URL.revokeObjectURL(newUrl);
        throw error;
    }
};

export const useAnalysisStore = createStore((set, get) => ({
    ...createInitialAnalysisState(),

    _reset: () => {
        set(createInitialAnalysisState());
    },

    startAnalysis: () => {
        set({ ...createInitialAnalysisState(), analysisStatus: 'loading' });
        uiActions.reset();
        useSegmentCacheStore.getState().clear();
    },

    completeAnalysis: (streams, urlAuthMapArray, inputs) => {
        const hydratedInputs = inputs.map((input) => {
            const hasTier0 = !!input.tier0;
            const shouldFetch = !!input.url && !hasTier0;

            return {
                ...input,
                detectedDrm: null,
                isDrmInfoLoading: false,
                isTier0AnalysisLoading: shouldFetch,
            };
        });

        const fullyFormedStreams = streams.map(hydrateStream);

        set({
            analysisStatus: 'complete',
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

        const currentAuthMap = get().urlAuthMap;
        const newAuthMap = new Map(newUrlAuthMapArray);
        for (const [key, val] of newAuthMap.entries()) {
            currentAuthMap.set(key, val);
        }

        const updatedStreams = [...currentStreams, ...fullyFormedNewStreams];

        set({
            analysisStatus: 'complete',
            streams: updatedStreams,
            urlAuthMap: new Map(currentAuthMap),
            activeStreamId:
                fullyFormedNewStreams[0]?.id ?? get().activeStreamId,
        });

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
    setActiveMediaPlaylist: (streamId, variantId) => {
        set((state) => ({
            streams: state.streams.map((s) => {
                if (s.id !== streamId) return s;

                let newActiveUrl = null;
                if (variantId === 'master') {
                    // If switching to master, we don't set a specific media playlist URL
                    // The engine handles this by falling back to the master manifest
                    newActiveUrl = null;
                } else {
                    // Find the URL for the selected variant/media
                    const variant = s.manifest?.variants?.find(
                        (v) =>
                            v.stableId === variantId ||
                            v.id === variantId ||
                            v.uri === variantId
                    );
                    if (variant) {
                        newActiveUrl = variant.uri;
                    } else {
                        const media = s.manifest?.media?.find(
                            (m) =>
                                m.value.URI === variantId ||
                                `media-${m.value.TYPE}-${m.lineNumber}` ===
                                    variantId
                        );
                        if (media) {
                            newActiveUrl = media.value.URI;
                        }
                    }
                }

                return {
                    ...s,
                    activeMediaPlaylistId: variantId,
                    activeMediaPlaylistUrl: newActiveUrl,
                };
            }),
        }));
        eventBus.dispatch(EVENTS.STATE.STREAM_UPDATED, { streamId });
    },
    setActiveManifestUpdate: (streamId, updateId) => {
        set((state) => ({
            streams: state.streams.map((s) => {
                if (s.id !== streamId) return s;
                const selection = resolveManifestUpdateSelection(s, updateId);
                if (selection.kind === 'playlist') {
                    const newMediaPlaylists = new Map(s.mediaPlaylists);
                    const playlistData = newMediaPlaylists.get(
                        selection.playlistId
                    );
                    if (playlistData) {
                        newMediaPlaylists.set(selection.playlistId, {
                            ...playlistData,
                            activeUpdateId: updateId,
                        });
                        return { ...s, mediaPlaylists: newMediaPlaylists };
                    }
                }
                if (selection.kind === 'manifest') {
                    return { ...s, activeManifestUpdateId: updateId };
                }
                return s;
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
                tier0: null,
                isTier0AnalysisLoading: false,
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
        set({
            streamInputs: [
                ...state.streamInputs,
                hydrateStagedInput(preset, state.streamIdCounter),
            ],
            streamIdCounter: state.streamIdCounter + 1,
            activeStreamInputId: state.streamIdCounter,
        });
    },
    removeStreamInput: (id) => {
        useMultiPlayerStore.getState().removePlayer(id);
        set((state) => {
            const remainingInputs = state.streamInputs.filter(
                (i) => i.id !== id
            );
            const remainingStreams = state.streams.filter((s) => s.id !== id);
            const remainingComparisons = state.segmentsForCompare.filter(
                (s) => s.streamId !== id
            );

            const newActiveInputId = selectAfterStagedSourceRemoval(
                state.streamInputs,
                id,
                state.activeStreamInputId
            );

            let newActiveStreamId = state.activeStreamId;
            if (state.activeStreamId === id) {
                if (remainingStreams.length === 0) {
                    newActiveStreamId = null;
                } else {
                    newActiveStreamId = remainingStreams[0].id;
                }
            }

            return {
                streamInputs: remainingInputs,
                streams: remainingStreams,
                activeStreamInputId: newActiveInputId,
                activeStreamId: newActiveStreamId,
                segmentsForCompare: remainingComparisons,
                selectedStreamInputIds: new Set(
                    [...state.selectedStreamInputIds].filter(
                        (selectedId) => selectedId !== id
                    )
                ),
            };
        });
        eventBus.dispatch(EVENTS.STATE.STREAM_UPDATED, { streamId: -1 });
        eventBus.dispatch(EVENTS.STATE.COMPARE_LIST_CHANGED, {
            count: get().segmentsForCompare.length,
        });
    },
    reorderStreamInput: (id, direction) => {
        set((state) => ({
            streamInputs: moveStagedSource(state.streamInputs, id, direction),
        }));
    },
    setSelectedStreamInputIds: (ids) => {
        const available = new Set(get().streamInputs.map(({ id }) => id));
        set({
            selectedStreamInputIds: new Set(
                [...ids].filter((id) => available.has(id))
            ),
        });
    },
    patchStreamInputs: (ids, patcher) => {
        const selected = new Set(ids);
        set((state) => ({
            streamInputs: state.streamInputs.map((input, index) =>
                selected.has(input.id)
                    ? { ...input, ...patcher(input, index) }
                    : input
            ),
        }));
    },
    removeStreamInputs: (ids) => {
        const removing = new Set(ids);
        if (removing.size === 0) return;
        [...removing].forEach((id) =>
            useMultiPlayerStore.getState().removePlayer(id)
        );
        set((state) => {
            const remainingInputs = state.streamInputs.filter(
                (input) => !removing.has(input.id)
            );
            return {
                streamInputs: remainingInputs,
                streams: state.streams.filter(
                    (stream) => !removing.has(stream.id)
                ),
                segmentsForCompare: state.segmentsForCompare.filter(
                    (segment) => !removing.has(segment.streamId)
                ),
                activeStreamInputId: selectAfterStagedSourcesRemoval(
                    state.streamInputs,
                    removing,
                    state.activeStreamInputId
                ),
                selectedStreamInputIds: new Set(),
            };
        });
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
            selectedStreamInputIds: new Set(),
        });
    },
    setStreamInputs: (inputs) => {
        const newInputs = inputs.map((input, index) =>
            hydrateStagedInput(input, index)
        );
        set({
            streamInputs: newInputs,
            streamIdCounter: newInputs.length,
            activeStreamInputId: newInputs[0]?.id ?? null,
            selectedStreamInputIds: new Set(),
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
                        updatedInput.detectedDrm = null;
                        updatedInput.tier0 = null;
                        updatedInput.isTier0AnalysisLoading = !!value;
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
        // Reduced Log Noise: Removed the verbose logging here
        // appLog('AnalysisStore', 'info', `[updateStream] ...`, updatedStreamData);

        set((state) => ({
            streams: state.streams.map((s) => {
                if (s.id !== streamId) return s;

                const newStream = { ...s, ...updatedStreamData };

                if (updatedStreamData.dashRepresentationState) {
                    const rehydrated = new Map();
                    for (const [
                        key,
                        value,
                    ] of updatedStreamData.dashRepresentationState) {
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
                    ] of updatedStreamData.hlsVariantState) {
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
    setInitialAnalysisTimestamp: (streamId, timestamp) => {
        set((state) => ({
            streams: state.streams.map((s) =>
                s.id === streamId
                    ? { ...s, initialAnalysisTimestamp: timestamp }
                    : s
            ),
        }));
    },
    setAllLiveStreamsPolling: (isPolling, options = {}) => {
        // ARCHITECTURAL FIX:
        // Removed direct calls to playerService/usePlayerStore to break circular dependencies.
        // Instead, the primaryStreamMonitor service triggers EVENTS.NOTIFY.POLLING_DISABLED,
        // which the PlayerController listens for to stop playback if needed.
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
        const { patchedContent, newUrl, newManifest } =
            await preparePatchedStream(stream, stream.patchRules);

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

        if (stream.patchedManifestUrl)
            URL.revokeObjectURL(stream.patchedManifestUrl);

        eventBus.dispatch(EVENTS.STATE.STREAM_UPDATED, { streamId });
    },
    applyPatchDraftToStream: async (streamId, rules) => {
        if (!Array.isArray(rules))
            throw new TypeError('Patch draft rules must be an ordered list.');
        const state = get();
        const stream = state.streams.find((s) => s.id === streamId);
        if (!stream) throw new Error('The selected stream is unavailable.');
        const stagedRules = rules.map((rule) => ({ ...rule }));
        const { patchedContent, newUrl, newManifest } =
            await preparePatchedStream(stream, stagedRules);

        set((currentState) => ({
            streams: currentState.streams.map((currentStream) =>
                currentStream.id === streamId
                    ? {
                          ...currentStream,
                          patchRules: stagedRules,
                          patchedRawManifest: patchedContent,
                          patchedManifestUrl: newUrl,
                          manifest: newManifest,
                      }
                    : currentStream
            ),
        }));

        if (stream.patchedManifestUrl)
            URL.revokeObjectURL(stream.patchedManifestUrl);

        eventBus.dispatch(EVENTS.STATE.STREAM_UPDATED, { streamId });
    },
}));

export const analysisActions = useAnalysisStore.getState();
