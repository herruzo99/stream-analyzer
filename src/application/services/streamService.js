import { eventBus } from '@/application/event-bus';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
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

    // First, try a fast lookup in the variant state map
    const variantState = stream.hlsVariantState.get(variantId);
    if (variantState) {
        const url = variantState.uri;
        const baseUrl = url.split('?')[0];

        analysisActions.updateStream(streamId, {
            activeMediaPlaylistUrl: url,
            activeMediaPlaylistBaseUrl: baseUrl,
            activeMediaPlaylistId: variantId,
        });
        return;
    }

    // Fallback: Deep search through the manifest IR for any representation matching the ID.
    // This covers all types: video, audio, text, etc.
    let foundRep = null;
    for (const period of stream.manifest.periods || []) {
        for (const as of period.adaptationSets || []) {
            const rep = as.representations.find((r) => r.id === variantId);
            if (rep) {
                foundRep = rep;
                break;
            }
        }
        if (foundRep) break;
    }

    if (foundRep && foundRep.__variantUri) {
        const url = foundRep.__variantUri;
        analysisActions.updateStream(streamId, {
            activeMediaPlaylistUrl: url,
            activeMediaPlaylistBaseUrl: url.split('?')[0],
            activeMediaPlaylistId: variantId,
        });
    } else {
        console.warn(
            `[streamService] Could not find representation with ID "${variantId}" to activate.`
        );
    }
}

// Event Listeners
eventBus.subscribe(EVENTS.HLS.MEDIA_PLAYLIST_ACTIVATE, (payload) =>
    activateHlsMediaPlaylist(payload)
);
