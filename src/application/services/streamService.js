import { eventBus } from '@/application/event-bus.js';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore.js';
import { workerService } from '@/infrastructure/worker/workerService.js';

async function fetchHlsMediaPlaylist({ streamId, variantUri }) {
    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === streamId);
    if (!stream) return;

    try {
        const { result } = await workerService.postTask(
            'fetch-hls-media-playlist',
            {
                streamId,
                variantUri,
                hlsDefinedVariables: stream.hlsDefinedVariables,
            }
        );

        if (result.streamId === streamId) {
            const newVariantState = new Map(stream.hlsVariantState);
            const currentState = newVariantState.get(result.variantUri);
            if (currentState) {
                newVariantState.set(result.variantUri, {
                    ...currentState,
                    segments: result.segments,
                    freshSegmentUrls: new Set(result.freshSegmentUrls),
                    isLoading: false,
                    error: null,
                });
            }

            const newMediaPlaylists = new Map(stream.mediaPlaylists);
            newMediaPlaylists.set(result.variantUri, {
                manifest: result.manifest,
                rawManifest: result.manifestString,
                lastFetched: new Date(),
            });

            analysisActions.updateStream(streamId, {
                hlsVariantState: newVariantState,
                mediaPlaylists: newMediaPlaylists,
            });
        }
    } catch (error) {
        const stream = useAnalysisStore
            .getState()
            .streams.find((s) => s.id === streamId);
        if (stream) {
            const newVariantState = new Map(stream.hlsVariantState);
            const currentState = newVariantState.get(variantUri);
            if (currentState) {
                newVariantState.set(variantUri, {
                    ...currentState,
                    isLoading: false,
                    error: error.message,
                });
                analysisActions.updateStream(streamId, {
                    hlsVariantState: newVariantState,
                });
            }
        }
    }
}

function activateHlsMediaPlaylist({ streamId, url }) {
    if (url === 'master') {
        analysisActions.updateStream(streamId, {
            activeMediaPlaylistUrl: null,
        });
        return;
    }

    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === streamId);
    if (!stream) return;

    if (!stream.mediaPlaylists.has(url)) {
        eventBus.dispatch('hls:media-playlist-fetch-request', {
            streamId,
            variantUri: url,
            isBackground: false,
        });
    }
    analysisActions.updateStream(streamId, { activeMediaPlaylistUrl: url });
}

// Event Listeners
eventBus.subscribe(
    'hls:media-playlist-fetch-request',
    ({ streamId, variantUri }) =>
        fetchHlsMediaPlaylist({ streamId, variantUri })
);
eventBus.subscribe('hls:media-playlist-activate', (payload) =>
    activateHlsMediaPlaylist(payload)
);