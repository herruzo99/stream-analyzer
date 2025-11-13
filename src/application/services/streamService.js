import { eventBus } from '@/application/event-bus';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { workerService } from '@/infrastructure/worker/workerService';
import { appLog } from '@/shared/utils/debug';
import { inferMediaInfoFromExtension } from '@/infrastructure/parsing/utils/media-types';

/**
 * After a media playlist is updated, this function checks if it's being
 * actively polled. If so, it identifies all unloaded segments and dispatches
 * fetch events for them.
 * @param {number} streamId
 * @param {string} variantUri
 */
function queueUnloadedSegmentsForPolledRep(streamId, variantUri) {
    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === streamId);
    if (!stream || !stream.segmentPollingReps.has(variantUri)) {
        return;
    }

    const repState = stream.hlsVariantState.get(variantUri);
    if (!repState || !repState.segments) {
        return;
    }

    const { get, set } = useSegmentCacheStore.getState();

    const unloadedSegments = repState.segments.filter((seg) => {
        if (seg.gap) return false;
        const entry = get(seg.uniqueId);
        return !entry || (entry.status !== 200 && entry.status !== -1);
    });

    if (unloadedSegments.length > 0) {
        appLog(
            'StreamService',
            'info',
            `Queueing ${unloadedSegments.length} unloaded segments for polled HLS representation: ${variantUri}`
        );
        unloadedSegments.forEach((seg) => {
            set(seg.uniqueId, { status: -1, data: null, parsedData: null });
            const { contentType } = inferMediaInfoFromExtension(
                seg.resolvedUrl
            );
            const formatHint =
                contentType === 'text'
                    ? 'vtt'
                    : stream.manifest.segmentFormat === 'unknown'
                      ? 'ts' // HLS default
                      : stream.manifest.segmentFormat;
            eventBus.dispatch('segment:fetch', {
                uniqueId: seg.uniqueId,
                streamId: stream.id,
                format: formatHint,
                context: {},
            });
        });
    }
}

async function fetchHlsMediaPlaylist({ streamId, variantUri }) {
    appLog(
        'StreamService',
        'info',
        `fetchHlsMediaPlaylist invoked for stream ${streamId}`,
        { variantUri }
    );
    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === streamId);
    if (!stream) return;

    const oldSegments = stream.hlsVariantState.get(variantUri)?.segments || [];
    const proactiveFetch = stream.segmentPollingReps.has(variantUri);

    try {
        const result = await workerService.postTask(
            'fetch-hls-media-playlist',
            {
                streamId,
                variantUri,
                hlsDefinedVariables: stream.hlsDefinedVariables,
                auth: stream.auth,
                oldSegments,
                proactiveFetch,
            }
        ).promise;

        appLog(
            'StreamService',
            'log',
            `Received result from worker for stream ${streamId}`,
            (({ manifestString, ...rest }) => rest)(result)
        );

        if (result.streamId === streamId) {
            const segments = result.manifest.segments || [];

            analysisActions.updateHlsMediaPlaylist({
                streamId,
                variantUri: result.variantUri,
                manifest: result.manifest,
                manifestString: result.manifestString,
                segments: segments,
                currentSegmentUrls: result.currentSegmentUrls,
                newSegmentUrls: result.newSegmentUrls,
            });

            if (result.inbandEvents && result.inbandEvents.length > 0) {
                analysisActions.addInbandEvents(streamId, result.inbandEvents);
            }

            // After state is updated, trigger downloads if polling
            if (proactiveFetch) {
                queueUnloadedSegmentsForPolledRep(streamId, variantUri);
            }

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
    appLog(
        'StreamService',
        'info',
        `Received HLS media playlist update from player for stream ${payload.streamId}`,
        payload
    );
    const segments = payload.manifest?.segments || [];
    const updatedPayload = { ...payload, segments };

    analysisActions.updateHlsMediaPlaylist(updatedPayload);

    if (payload.inbandEvents && payload.inbandEvents.length > 0) {
        analysisActions.addInbandEvents(payload.streamId, payload.inbandEvents);
    }

    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === payload.streamId);
    if (stream && stream.segmentPollingReps.has(payload.variantUri)) {
        queueUnloadedSegmentsForPolledRep(
            payload.streamId,
            payload.variantUri
        );
    }

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