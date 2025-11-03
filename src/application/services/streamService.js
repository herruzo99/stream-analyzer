import { eventBus } from '@/application/event-bus';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { workerService } from '@/infrastructure/worker/workerService';
import { debugLog } from '@/shared/utils/debug';

async function fetchHlsMediaPlaylist({ streamId, variantUri }) {
    debugLog(
        'StreamService',
        `fetchHlsMediaPlaylist invoked for stream ${streamId}`,
        { variantUri }
    );
    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === streamId);
    if (!stream) return;

    const oldSegments = stream.hlsVariantState.get(variantUri)?.segments || [];

    try {
        const result = await workerService.postTask(
            'fetch-hls-media-playlist',
            {
                streamId,
                variantUri,
                hlsDefinedVariables: stream.hlsDefinedVariables,
                auth: stream.auth, // BUG FIX: Pass authentication details
                oldSegments,
            }
        ).promise; // <-- BUG FIX: Correctly await the promise property

        debugLog(
            'StreamService',
            `Received result from worker for stream ${streamId}`,
            result
        );

        if (result.streamId === streamId) {
            analysisActions.updateHlsMediaPlaylist({
                streamId,
                variantUri: result.variantUri,
                manifest: result.manifest,
                manifestString: result.manifestString,
                segments: result.segments,
                currentSegmentUrls: result.currentSegmentUrls,
                newSegmentUrls: result.newSegmentUrls,
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

function handlePlayerHlsUpdate(payload) {
    debugLog(
        'StreamService',
        `Received HLS media playlist update from player for stream ${payload.streamId}`,
        payload
    );
    analysisActions.updateHlsMediaPlaylist(payload);
    eventBus.dispatch('hls-media-playlist-fetched', {
        streamId: payload.streamId,
        variantUri: payload.variantUri,
    });
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
eventBus.subscribe(
    'hls-media-playlist-updated-by-player',
    handlePlayerHlsUpdate
);
