import { eventBus } from '@/application/event-bus';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { workerService } from '@/infrastructure/worker/workerService';

async function fetchHlsMediaPlaylist({ streamId, variantUri }) {
    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === streamId);
    if (!stream) return;

    try {
        const result = await workerService.postTask(
            'fetch-hls-media-playlist',
            {
                streamId,
                variantUri,
                hlsDefinedVariables: stream.hlsDefinedVariables,
            }
        );

        if (result.streamId === streamId) {
            analysisActions.updateHlsMediaPlaylist({
                streamId,
                variantUri: result.variantUri,
                manifest: result.manifest,
                manifestString: result.manifestString,
                segments: result.segments,
                freshSegmentUrls: result.freshSegmentUrls,
            });

            eventBus.dispatch('hls-media-playlist-fetched', {
                streamId,
                variantUri,
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
        eventBus.dispatch('hls-media-playlist-error', {
            streamId,
            variantUri,
            error,
        });
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