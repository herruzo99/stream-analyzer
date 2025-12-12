import { eventBus } from '@/application/event-bus';
import { multiPlayerService } from '@/features/multiPlayer/application/multiPlayerService';
import { playerService } from '@/features/playerSimulation/application/playerService';
import { headlessAnalysisService } from '@/features/signalQuality/application/headlessAnalysisService';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { usePlayerStore } from '@/state/playerStore';
import { useQualityStore } from '@/state/qualityStore';

/**
 * Toggles the Analyzer Polling (Live Update) for the active stream.
 * Operates independently of Player or QC state.
 */
export function togglePlayerAndPolling() {
    const { streams, activeStreamId } = useAnalysisStore.getState();
    const activeStream = streams.find((s) => s.id === activeStreamId);
    if (!activeStream) return;

    if (activeStream.manifest?.type === 'dynamic') {
        // Toggle polling state directly
        analysisActions.setStreamPolling(
            activeStream.id,
            !activeStream.isPolling
        );
    } else {
        // VOD Logic: Start/Stop player if VOD
        const playerStore = usePlayerStore.getState();
        const isPlaying =
            playerStore.isLoaded && playerStore.playbackState !== 'IDLE';

        if (isPlaying) {
            playerService.unload();
        } else if (activeStream.originalUrl) {
            playerService.load(activeStream);
        }
    }
}

/**
 * Toggles the polling state for all live streams simultaneously.
 * Purely controls the Analyzer's background fetching.
 */
export function toggleAllPolling() {
    const { streams } = useAnalysisStore.getState();
    const liveStreams = streams.filter((s) => s.manifest?.type === 'dynamic');

    // Check if ANY are polling
    const isAnyPolling = liveStreams.some((s) => s.isPolling);

    if (isAnyPolling) {
        // Stop all
        analysisActions.setAllLiveStreamsPolling(false);
    } else {
        // Start all
        analysisActions.setAllLiveStreamsPolling(true);
    }
}

/**
 * Stops polling/playback/analysis for a specific stream.
 * Acts as a "Kill Switch" for all active processes related to a stream.
 * @param {number} streamId
 */
export function stopStreamPolling(streamId) {
    // 1. Stop Analyzer Polling
    analysisActions.setStreamPolling(streamId, false);

    // 2. Stop QC (Headless Analysis)
    const qualityStore = useQualityStore.getState();
    if (qualityStore.jobs.has(streamId)) {
        headlessAnalysisService.stopAnalysis(streamId);
    }

    // 3. Stop Player (Single Simulation)
    // const playerStore = usePlayerStore.getState();
    // Only stop if this specific stream is loaded
    if (playerService.getActiveStreamIds().has(streamId)) {
        playerService.destroy();
    }

    // 4. Stop MultiPlayer Instance
    const mpStore = useMultiPlayerStore.getState();
    if (mpStore.players.has(streamId)) {
        multiPlayerService.destroyPlayer(streamId);
    }
}

/**
 * Reloads the manifest for a given stream.
 */
export function reloadStream(stream) {
    if (!stream) return;

    if (!stream.originalUrl) {
        eventBus.dispatch('ui:show-status', {
            message: 'Cannot reload a manifest loaded from a local file.',
            type: 'warn',
            duration: 4000,
        });
        return;
    }

    eventBus.dispatch('ui:show-status', {
        message: `Reloading manifest for ${stream.name}...`,
        type: 'info',
        duration: 2000,
    });

    if (
        stream.protocol === 'hls' &&
        stream.activeMediaPlaylistId &&
        stream.activeMediaPlaylistId !== 'master'
    ) {
        const variantState = stream.hlsVariantState.get(
            stream.activeMediaPlaylistId
        );
        if (variantState) {
            eventBus.dispatch('hls:media-playlist-fetch-request', {
                streamId: stream.id,
                variantId: stream.activeMediaPlaylistId,
                variantUri: variantState.uri,
                isBackground: false,
            });
        }
    } else {
        eventBus.dispatch('manifest:force-reload', { streamId: stream.id });
    }
}
