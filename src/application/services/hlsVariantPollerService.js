import { eventBus } from '@/application/event-bus';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { debugLog } from '@/shared/utils/debug';
import { playerService } from '@/features/playerSimulation/application/playerService';

const pollers = new Map();
let tickerSubscription = null;

export async function pollHlsVariant(streamId, variantUri) {
    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === streamId);
    if (!stream) {
        stopPoller(streamId, variantUri);
        return;
    }

    debugLog(
        'HlsVariantPoller',
        `Dispatching hls:media-playlist-fetch-request for stream ${streamId}`,
        { variantUri }
    );
    eventBus.dispatch('hls:media-playlist-fetch-request', {
        streamId,
        variantUri,
        isBackground: true,
    });
}

function startPoller(stream, variantUri) {
    const pollerKey = `${stream.id}-${variantUri}`;
    if (pollers.has(pollerKey)) return;

    pollHlsVariant(stream.id, variantUri);

    const mediaPlaylist = stream.mediaPlaylists.get(variantUri);
    const playlistTargetDuration = mediaPlaylist?.manifest?.targetDuration;
    const masterTargetDuration = stream.manifest?.targetDuration;

    const pollIntervalSeconds =
        playlistTargetDuration || masterTargetDuration || 2;
    const pollInterval = Math.max(pollIntervalSeconds * 1000, 2000); // Enforce a minimum of 2 seconds.

    pollers.set(pollerKey, {
        lastPollTime: performance.now(),
        pollInterval,
    });
}

function stopPoller(streamId, variantUri) {
    const pollerKey = `${streamId}-${variantUri}`;
    pollers.delete(pollerKey);
}

export function manageHlsPollers() {
    const hlsStreams = useAnalysisStore
        .getState()
        .streams.filter(
            (s) => s.protocol === 'hls' && s.manifest?.type === 'dynamic'
        );

    const playerActiveStreamIds = playerService.getActiveStreamIds();

    for (const stream of hlsStreams) {
        for (const [variantUri] of stream.hlsVariantState.entries()) {
            const pollerKey = `${stream.id}-${variantUri}`;
            const poller = pollers.get(pollerKey);

            const shouldBePolling =
                stream.isPolling && !playerActiveStreamIds.has(stream.id);
            const isCurrentlyPolling = !!poller;

            if (shouldBePolling && !isCurrentlyPolling) {
                startPoller(stream, variantUri);
            } else if (!shouldBePolling && isCurrentlyPolling) {
                stopPoller(stream.id, variantUri);
            } else if (shouldBePolling && isCurrentlyPolling) {
                if (
                    performance.now() - poller.lastPollTime >
                    poller.pollInterval
                ) {
                    poller.lastPollTime = performance.now();
                    pollHlsVariant(stream.id, variantUri);
                }
            }
        }
    }
}

function updateVariantState(streamId, variantUri, updates) {
    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === streamId);
    if (stream) {
        const newVariantState = new Map(stream.hlsVariantState);
        const currentState = newVariantState.get(variantUri);
        if (currentState) {
            newVariantState.set(variantUri, { ...currentState, ...updates });
            analysisActions.updateStream(streamId, {
                hlsVariantState: newVariantState,
            });
        }
    }
}

export function initializeHlsVariantPoller() {
    if (tickerSubscription) tickerSubscription();
    tickerSubscription = eventBus.subscribe(
        'ticker:one-second-tick',
        manageHlsPollers
    );

    // Subscribe to player state changes to immediately re-evaluate polling.
    eventBus.subscribe('player:active-streams-changed', manageHlsPollers);

    eventBus.subscribe(
        'hls-explorer:set-display-mode',
        ({ streamId, variantUri, mode }) => {
            updateVariantState(streamId, variantUri, { displayMode: mode });
        }
    );

    // --- Post-Analysis Initialization Logic ---
    eventBus.subscribe('state:analysis-complete', ({ streams }) => {
        const hlsStreams = streams.filter(
            (s) => s.protocol === 'hls' && s.manifest?.isMaster
        );

        for (const stream of hlsStreams) {
            const newVariantState = new Map(stream.hlsVariantState);
            let updated = false;

            for (const [uri, state] of newVariantState.entries()) {
                newVariantState.set(uri, { ...state, isLoading: true });
                debugLog(
                    'HlsVariantPoller',
                    `Dispatching initial hls:media-playlist-fetch-request for stream ${stream.id}`,
                    { variantUri: uri }
                );
                eventBus.dispatch('hls:media-playlist-fetch-request', {
                    streamId: stream.id,
                    variantUri: uri,
                    isBackground: true,
                });
                updated = true;
            }

            if (updated) {
                analysisActions.updateStream(stream.id, {
                    hlsVariantState: newVariantState,
                });
            }
        }
    });
}

export function stopAllHlsVariantPolling() {
    if (tickerSubscription) {
        tickerSubscription();
        tickerSubscription = null;
    }
    pollers.clear();
}