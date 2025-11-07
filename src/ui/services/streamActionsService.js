import { eventBus } from '@/application/event-bus';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { playerService } from '@/features/playerSimulation/application/playerService';

/**
 * Toggles the active state for all streams. For live streams, it toggles polling.
 * For VOD streams, it stops the player if it's playing.
 */
export function togglePlayerAndPolling() {
    const { streams, activeStreamId } = useAnalysisStore.getState();
    const activeStream = streams.find((s) => s.id === activeStreamId);
    if (!activeStream) return;

    const isAnyLivePolling = streams.some(
        (s) => s.manifest?.type === 'dynamic' && s.isPolling
    );
    const isPlayerLoaded = !!playerService.getPlayer()?.getAssetUri();

    // If either the polling is active or the player is loaded, the desired action is to STOP.
    if (isAnyLivePolling || isPlayerLoaded) {
        // --- STOP ACTION ---
        analysisActions.setAllLiveStreamsPolling(false);
        playerService.unload();
    } else {
        // --- START ACTION ---
        if (activeStream.manifest?.type === 'dynamic') {
            analysisActions.setAllLiveStreamsPolling(true);
        }
        if (activeStream.originalUrl) {
            playerService.load(activeStream);
        }
    }
}

/**
 * Toggles the polling state for all live streams simultaneously.
 */
export function toggleAllPolling() {
    const { streams } = useAnalysisStore.getState();
    const isAnyLivePolling = streams.some(
        (s) => s.manifest?.type === 'dynamic' && s.isPolling
    );
    analysisActions.setAllLiveStreamsPolling(!isAnyLivePolling);
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
            message: 'Cannot reload a manifest loaded from a local file.',
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
