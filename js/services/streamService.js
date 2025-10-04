import { eventBus } from '../core/event-bus.js';
import { useStore, storeActions } from '../core/store.js';

/** @typedef {import('../core/types.js').SerializedStream} SerializedStream */

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
                /** @type {import('../core/types.js').Stream[]} */ (
                    /** @type {any} */ (results)
                )
            );
            const tEndTotal = performance.now();
            console.log(
                `[DEBUG] Total Analysis Pipeline (success): ${(
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
            console.log(
                `[DEBUG] Total Analysis Pipeline (failed): ${(
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
            const { streamId, variantUri, segments, freshSegmentUrls } =
                payload;
            const stream = useStore
                .getState()
                .streams.find((s) => s.id === streamId);
            if (stream) {
                const newVariantState = new Map(stream.hlsVariantState);
                const currentState = newVariantState.get(variantUri);
                if (currentState) {
                    newVariantState.set(variantUri, {
                        ...currentState,
                        segments,
                        freshSegmentUrls: new Set(freshSegmentUrls), // Reconstruct Set
                        isLoading: false,
                        error: null,
                    });
                    storeActions.updateStream(streamId, {
                        hlsVariantState: newVariantState,
                    });
                }
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
    console.log('[DEBUG] Starting analysis pipeline...');
    eventBus.dispatch('analysis:started');

    const workerInputs = [];
    for (const input of inputs) {
        try {
            self.postMessage({
                type: 'status-update',
                payload: {
                    message: `Fetching ${input.url || input.file.name}...`,
                },
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
            workerInputs.push({ ...input, manifestString });
        } catch (e) {
            eventBus.dispatch('analysis:error', {
                message: `Failed to fetch or read input: ${e.message}`,
            });
        }
    }

    if (workerInputs.length > 0) {
        console.log(
            `[DEBUG] Pre-processing complete. Dispatching ${workerInputs.length} stream(s) to worker.`
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

eventBus.subscribe('analysis:request', ({ inputs }) => analyzeStreams(inputs));
eventBus.subscribe(
    'hls:media-playlist-fetch-request',
    ({ streamId, variantUri }) =>
        fetchHlsMediaPlaylist({ streamId, variantUri })
);
