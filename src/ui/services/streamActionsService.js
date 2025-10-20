import { eventBus } from '@/application/event-bus';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';

/**
 * Toggles the polling state for all live streams.
 */
export function toggleAllLiveStreamsPolling() {
    const { streams } = useAnalysisStore.getState();
    const isAnyPolling = streams.some(
        (s) => s.manifest?.type === 'dynamic' && s.isPolling
    );
    analysisActions.setAllLiveStreamsPolling(!isAnyPolling);
}

/**
 * Reloads the manifest for a given stream, handling different protocols and states.
 * @param {import('@/types.ts').Stream | null} stream The stream to reload.
 */
export function reloadStream(stream) {
    if (!stream) {
        return;
    }

    // A stream loaded from a file will not have an originalUrl.
    if (!stream.originalUrl) {
        eventBus.dispatch('ui:show-status', {
            message: 'Cannot reload a manifest from a local file.',
            type: 'warn',
            duration: 4000,
        });
        return;
    }

    const urlToReload = stream.activeMediaPlaylistUrl || stream.originalUrl;

    eventBus.dispatch('ui:show-status', {
        message: `Reloading manifest for ${stream.name}...`,
        type: 'info',
        duration: 2000,
    });

    if (stream.protocol === 'hls' && stream.activeMediaPlaylistUrl) {
        eventBus.dispatch('hls:media-playlist-reload', {
            streamId: stream.id,
            url: urlToReload,
        });
    } else {
        // This handles DASH and the HLS Master Playlist case
        eventBus.dispatch('manifest:force-reload', { streamId: stream.id });
    }
}
