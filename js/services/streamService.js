import { eventBus } from '../core/event-bus.js';
import { analysisState } from '../core/state.js';

const analysisWorker = new Worker('/dist/worker.js', { type: 'module' });
let analysisStartTime = 0;

analysisWorker.onmessage = (event) => {
    const { type, payload } = event.data;

    switch (type) {
        case 'analysis-complete': {
            const results = payload.streams;
            eventBus.dispatch('state:analysis-complete', { streams: results });
            const tEndTotal = performance.now();
            console.log(
                `[DEBUG] Total Analysis Pipeline (success): ${(
                    tEndTotal - analysisStartTime
                ).toFixed(2)}ms`
            );
            break;
        }
        case 'analysis-error':
            eventBus.dispatch('analysis:error', {
                message: payload.message,
                error: payload.error,
            });
            break;
        case 'analysis-failed':
            eventBus.dispatch('analysis:failed');
            let tEnd = performance.now();
            console.log(
                `[DEBUG] Total Analysis Pipeline (failed): ${(
                    tEnd - analysisStartTime
                ).toFixed(2)}ms`
            );
            break;
        case 'status-update':
            eventBus.dispatch('ui:show-status', {
                message: payload.message,
                type: 'info',
                duration: 2000,
            });
            break;
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

async function fetchAndSetHlsMediaPlaylist({
    streamId,
    url,
    isReload = false,
}) {
    const stream = analysisState.streams.find((s) => s.id === streamId);
    if (!stream) return;

    if (url === 'master') {
        const master = stream.mediaPlaylists.get('master');
        if (master) {
            eventBus.dispatch('state:stream-updated', {
                streamId,
                updatedStreamData: {
                    activeManifestForView: master.manifest,
                    activeMediaPlaylistUrl: null,
                },
            });
        }
        return;
    }

    if (stream.mediaPlaylists.has(url) && !isReload) {
        const mediaPlaylist = stream.mediaPlaylists.get(url);
        eventBus.dispatch('state:stream-updated', {
            streamId,
            updatedStreamData: {
                activeManifestForView: mediaPlaylist.manifest,
                activeMediaPlaylistUrl: url,
            },
        });
        return;
    }

    eventBus.dispatch('ui:show-status', {
        message: `Fetching HLS media playlist...`,
        type: 'info',
    });
    analysisWorker.postMessage({
        type: 'fetch-hls-media-playlist',
        payload: {
            streamId,
            url,
            hlsDefinedVariables: stream.hlsDefinedVariables,
        },
    });
}

analysisWorker.addEventListener('message', (event) => {
    const { type, payload } = event.data;
    if (type === 'hls-media-playlist-fetched') {
        const { streamId, url, manifest, rawManifest } = payload;
        const stream = analysisState.streams.find((s) => s.id === streamId);
        if (stream) {
            const newPlaylists = new Map(stream.mediaPlaylists);
            newPlaylists.set(url, {
                manifest,
                rawManifest,
                lastFetched: new Date(),
            });

            eventBus.dispatch('state:stream-updated', {
                streamId,
                updatedStreamData: {
                    mediaPlaylists: newPlaylists,
                    activeManifestForView: manifest,
                    activeMediaPlaylistUrl: url,
                },
            });
            eventBus.dispatch('ui:show-status', {
                message: 'Media playlist loaded.',
                type: 'pass',
            });
        }
    } else if (type === 'hls-media-playlist-error') {
        console.error(
            'Failed to fetch or parse media playlist in worker:',
            payload.error
        );
        eventBus.dispatch('ui:show-status', {
            message: `Failed to load media playlist: ${payload.error}`,
            type: 'fail',
        });
    }
});

eventBus.subscribe('analysis:request', ({ inputs }) => analyzeStreams(inputs));
eventBus.subscribe('hls:media-playlist-activate', ({ streamId, url }) =>
    fetchAndSetHlsMediaPlaylist({ streamId, url, isReload: false })
);
eventBus.subscribe('hls:media-playlist-reload', ({ streamId, url }) =>
    fetchAndSetHlsMediaPlaylist({ streamId, url, isReload: true })
);