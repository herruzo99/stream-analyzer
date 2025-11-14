import { eventBus } from '@/application/event-bus';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { appLog } from '@/shared/utils/debug';
import { inferMediaInfoFromExtension } from '@/infrastructure/parsing/utils/media-types';

/**
 * After a media playlist is updated, this function checks if it's being
 * actively polled. If so, it identifies all unloaded segments and dispatches
 * fetch events for them.
 * @param {number} streamId
 * @param {string} variantId
 */
function queueUnloadedSegmentsForPolledRep(streamId, variantId) {
    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === streamId);
    if (!stream || !stream.segmentPollingReps.has(variantId)) {
        return;
    }

    const repState = stream.hlsVariantState.get(variantId);
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
            `Queueing ${unloadedSegments.length} unloaded segments for polled HLS representation: ${variantId}`
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

function activateHlsMediaPlaylist({ streamId, variantId }) {
    if (variantId === 'master') {
        analysisActions.updateStream(streamId, {
            activeMediaPlaylistUrl: null,
            activeMediaPlaylistBaseUrl: null,
            activeMediaPlaylistId: 'master',
        });
        return;
    }

    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === streamId);
    if (!stream) return;
    
    const variantState = stream.hlsVariantState.get(variantId);
    if (!variantState) {
        appLog('StreamService', 'warn', `activateHlsMediaPlaylist called for a variantId (${variantId}) that does not exist in the state for stream ${streamId}.`);
        return;
    };

    const url = variantState.uri;
    const baseUrl = url.split('?')[0];

    analysisActions.updateStream(streamId, {
        activeMediaPlaylistUrl: url,
        activeMediaPlaylistBaseUrl: baseUrl,
        activeMediaPlaylistId: variantId, 
    });
}


// Event Listeners
eventBus.subscribe('hls:media-playlist-activate', (payload) =>
    activateHlsMediaPlaylist(payload)
);