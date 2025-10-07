import { eventBus } from '../app/event-bus.js';
import { useStore, storeActions } from '../app/store.js';
import { isDebugMode } from '../shared/utils/env.js';
import { debugLog } from '../shared/utils/debug.js';

/** @typedef {import('../app/types.js').SerializedStream} SerializedStream */

const analysisWorker = new Worker('/dist/worker.js', { type: 'module' });
let analysisStartTime = 0;

analysisWorker.onmessage = (event) => {
    /** @type {{type: string, payload: any}} */
    const { type, payload } = event.data;

    switch (type) {
        case 'analysis-complete': {
            /** @type {SerializedStream[]} */
            const results = payload.streams;
            // Reconstruct Map objects from the serialized arrays
            results.forEach((stream) => {
                // @ts-ignore
                stream.hlsVariantState = new Map(stream.hlsVariantState || []);
                // @ts-ignore
                stream.dashRepresentationState = new Map(
                    stream.dashRepresentationState || []
                );
                if (stream.featureAnalysis) {
                    // @ts-ignore
                    stream.featureAnalysis.results = new Map(
                        stream.featureAnalysis.results || []
                    );
                }
                // @ts-ignore
                stream.semanticData = new Map(stream.semanticData || []);
                // @ts-ignore
                stream.mediaPlaylists = new Map(stream.mediaPlaylists || []);
            });
            storeActions.completeAnalysis(
                /** @type {import('../app/types.js').Stream[]} */ (
                    /** @type {any} */ (results)
                )
            );
            const tEndTotal = performance.now();
            debugLog(
                'StreamService',
                `Total Analysis Pipeline (success): ${(
                    tEndTotal - analysisStartTime
                ).toFixed(2)}ms`
            );
            break;
        }
        case 'analysis-error': {
            eventBus.dispatch('analysis:error', {
                message: payload.message,
                error: payload.error,
            });
            break;
        }
        case 'analysis-failed': {
            eventBus.dispatch('analysis:failed');
            const tEnd = performance.now();
            debugLog(
                'StreamService',
                `Total Analysis Pipeline (failed): ${(
                    tEnd - analysisStartTime
                ).toFixed(2)}ms`
            );
            break;
        }
        case 'status-update': {
            eventBus.dispatch('ui:show-status', {
                message: payload.message,
                type: 'info',
                duration: 2000,
            });
            break;
        }
        case 'hls-media-playlist-fetched': {
            const {
                streamId,
                variantUri,
                manifest,
                manifestString,
                segments,
                freshSegmentUrls,
            } = payload;
            const stream = useStore
                .getState()
                .streams.find((s) => s.id === streamId);
            if (stream) {
                // Update hlsVariantState for segment explorer
                const newVariantState = new Map(stream.hlsVariantState);
                const currentState = newVariantState.get(variantUri);
                if (currentState) {
                    newVariantState.set(variantUri, {
                        ...currentState,
                        segments,
                        freshSegmentUrls: new Set(freshSegmentUrls),
                        isLoading: false,
                        error: null,
                    });
                }

                // Update mediaPlaylists cache for interactive manifest view
                const newMediaPlaylists = new Map(stream.mediaPlaylists);
                newMediaPlaylists.set(variantUri, {
                    manifest: manifest,
                    rawManifest: manifestString,
                    lastFetched: new Date(),
                });

                storeActions.updateStream(streamId, {
                    hlsVariantState: newVariantState,
                    mediaPlaylists: newMediaPlaylists,
                });
            }
            break;
        }
        case 'hls-media-playlist-error': {
            const { streamId, variantUri, error } = payload;
            const stream = useStore
                .getState()
                .streams.find((s) => s.id === streamId);
            if (stream) {
                const newVariantState = new Map(stream.hlsVariantState);
                const currentState = newVariantState.get(variantUri);
                if (currentState) {
                    newVariantState.set(variantUri, {
                        ...currentState,
                        isLoading: false,
                        error,
                    });
                    storeActions.updateStream(streamId, {
                        hlsVariantState: newVariantState,
                    });
                }
            }
            break;
        }
    }
};

async function analyzeStreams(inputs) {
    analysisStartTime = performance.now();
    debugLog('StreamService', 'Starting analysis pipeline...');
    eventBus.dispatch('analysis:started');

    const workerInputs = [];
    for (const input of inputs) {
        try {
            eventBus.dispatch('ui:show-status', {
                message: `Fetching ${input.url || input.file.name}...`,
                type: 'info',
                duration: 2000,
            });
            let manifestString = '';
            if (input.url) {
                const response = await fetch(input.url);
                if (!response.ok) {
                    eventBus.dispatch('analysis:error', {
                        message: `HTTP Error ${response.status} for ${input.url}`,
                    });
                    continue;
                }
                manifestString = await response.text();
            } else {
                manifestString = await input.file.text();
            }
            workerInputs.push({
                ...input,
                manifestString,
                isDebug: isDebugMode,
            });
        } catch (e) {
            eventBus.dispatch('analysis:error', {
                message: `Failed to fetch or read input: ${e.message}`,
            });
        }
    }

    if (workerInputs.length > 0) {
        debugLog(
            'StreamService',
            `Pre-processing complete. Dispatching ${workerInputs.length} stream(s) to worker.`
        );
        analysisWorker.postMessage({
            type: 'start-analysis',
            payload: { inputs: workerInputs },
        });
    } else {
        eventBus.dispatch('analysis:failed');
    }
}

function fetchHlsMediaPlaylist({ streamId, variantUri }) {
    const stream = useStore.getState().streams.find((s) => s.id === streamId);
    if (!stream) return;

    // Offload the fetch and parse to the worker
    analysisWorker.postMessage({
        type: 'fetch-hls-media-playlist',
        payload: {
            streamId,
            variantUri,
            hlsDefinedVariables: stream.hlsDefinedVariables,
        },
    });
}

/**
 * Handles activating a media playlist for the interactive view.
 * @param {object} payload
 * @param {number} payload.streamId
 * @param {string} payload.url
 */
function activateHlsMediaPlaylist({ streamId, url }) {
    if (url === 'master') {
        storeActions.updateStream(streamId, { activeMediaPlaylistUrl: null });
        return;
    }

    const stream = useStore.getState().streams.find((s) => s.id === streamId);
    if (!stream) return;

    if (!stream.mediaPlaylists.has(url)) {
        // Not cached, so we need to fetch it. The 'hls:media-playlist-fetch-request'
        // is now more generic and used by the explorer too.
        eventBus.dispatch('hls:media-playlist-fetch-request', {
            streamId,
            variantUri: url,
            isBackground: false, // This is a user action
        });
    }
    // Set the active URL. If it wasn't cached, the view will re-render
    // with a loading state until the fetch completes and updates the store again.
    storeActions.updateStream(streamId, { activeMediaPlaylistUrl: url });
}

eventBus.subscribe('analysis:request', ({ inputs }) => analyzeStreams(inputs));
eventBus.subscribe(
    'hls:media-playlist-fetch-request',
    ({ streamId, variantUri }) =>
        fetchHlsMediaPlaylist({ streamId, variantUri })
);
eventBus.subscribe('hls:media-playlist-activate', (payload) =>
    activateHlsMediaPlaylist(payload)
);
