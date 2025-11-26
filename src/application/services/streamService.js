import { eventBus } from '@/application/event-bus';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { appLog } from '@/shared/utils/debug';
import { EVENTS } from '@/types/events';

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
    if (variantState) {
        const url = variantState.uri;
        const baseUrl = url.split('?')[0];

        analysisActions.updateStream(streamId, {
            activeMediaPlaylistUrl: url,
            activeMediaPlaylistBaseUrl: baseUrl,
            activeMediaPlaylistId: variantId,
        });
    } else {
        // Fallback: Try to find URL from manifest variants if state is missing
        // This handles cases where we click a variant that hasn't been fetched yet.
        const variant = stream.manifest.variants?.find(
            (v) => v.stableId === variantId
        );
        if (variant) {
            const url = variant.resolvedUri;
            analysisActions.updateStream(streamId, {
                activeMediaPlaylistUrl: url,
                activeMediaPlaylistBaseUrl: url.split('?')[0],
                activeMediaPlaylistId: variantId,
            });
        }
    }
}

// Event Listeners
eventBus.subscribe(EVENTS.HLS.MEDIA_PLAYLIST_ACTIVATE, (payload) =>
    activateHlsMediaPlaylist(payload)
);
