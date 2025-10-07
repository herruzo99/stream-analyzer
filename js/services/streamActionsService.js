import { eventBus } from '../app/event-bus.js';
import { storeActions, useStore } from '../app/store.js';

/**
 * Toggles the polling state for all live streams.
 */
export function toggleAllLiveStreamsPolling() {
    const { streams } = useStore.getState();
    const isAnyPolling = streams.some(
        (s) => s.manifest?.type === 'dynamic' && s.isPolling
    );
    storeActions.setAllLiveStreamsPolling(!isAnyPolling);
}

/**
 * Dispatches an event to request fetching and parsing of a single segment.
 * @param {string} url The URL of the segment to load.
 */
export function loadSegment(url) {
    eventBus.dispatch('segment:fetch', { url });
}

/**
 * Reloads the manifest for a given stream, handling different protocols and states.
 * @param {import('../app/types.ts').Stream | null} stream The stream to reload.
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
