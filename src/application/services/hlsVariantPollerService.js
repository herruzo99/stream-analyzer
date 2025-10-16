import { eventBus } from '@/application/event-bus';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';

const pollers = new Map();
let managerInterval = null;

export async function pollHlsVariant(streamId, variantUri) {
    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === streamId);
    if (!stream) {
        stopPoller(streamId, variantUri);
        return;
    }

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

    // The HLS spec recommends clients not re-request the playlist until at least one target duration has passed.
    // We will use the specific media playlist's target duration if available, otherwise fall back to the master's.
    const pollIntervalSeconds =
        playlistTargetDuration || masterTargetDuration || 2;
    const pollInterval = Math.max(pollIntervalSeconds * 1000, 2000); // Enforce a minimum of 2 seconds.

    const intervalId = setInterval(
        () => pollHlsVariant(stream.id, variantUri),
        pollInterval
    );
    pollers.set(pollerKey, intervalId);
}

function stopPoller(streamId, variantUri) {
    const pollerKey = `${streamId}-${variantUri}`;
    if (pollers.has(pollerKey)) {
        clearInterval(pollers.get(pollerKey));
        pollers.delete(pollerKey);
    }
}

export function manageHlsPollers() {
    const hlsStreams = useAnalysisStore
        .getState()
        .streams.filter(
            (s) => s.protocol === 'hls' && s.manifest?.type === 'dynamic'
        );

    for (const stream of hlsStreams) {
        for (const [variantUri, state] of stream.hlsVariantState.entries()) {
            const pollerKey = `${stream.id}-${variantUri}`;
            const shouldBePolling = stream.isPolling && state.isExpanded;
            const isCurrentlyPolling = pollers.has(pollerKey);

            if (shouldBePolling && !isCurrentlyPolling) {
                startPoller(stream, variantUri);
            } else if (!shouldBePolling && isCurrentlyPolling) {
                stopPoller(stream.id, variantUri);
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
    if (managerInterval) clearInterval(managerInterval);
    managerInterval = setInterval(manageHlsPollers, 1000);

    // --- State Update Listeners ---
    eventBus.subscribe(
        'hls-explorer:load-segments',
        ({ streamId, variantUri }) => {
            const stream = useAnalysisStore
                .getState()
                .streams.find((s) => s.id === streamId);
            const variantState = stream?.hlsVariantState.get(variantUri);

            if (variantState && !variantState.isLoading) {
                updateVariantState(streamId, variantUri, {
                    isLoading: true,
                    isExpanded: true,
                });
                eventBus.dispatch('hls:media-playlist-fetch-request', {
                    streamId,
                    variantUri,
                    isBackground: false,
                });
            }
        }
    );

    eventBus.subscribe(
        'hls-explorer:set-display-mode',
        ({ streamId, variantUri, mode }) => {
            updateVariantState(streamId, variantUri, { displayMode: mode });
        }
    );

    // --- Post-Analysis Initialization Logic ---
    eventBus.subscribe('state:analysis-complete', ({ streams }) => {
        const firstHlsStream = streams.find(
            (s) => s.protocol === 'hls' && s.manifest?.isMaster
        );
        if (firstHlsStream) {
            const firstVariantUri = firstHlsStream.hlsVariantState
                .keys()
                .next().value;
            if (firstVariantUri) {
                updateVariantState(firstHlsStream.id, firstVariantUri, {
                    isLoading: true,
                    isExpanded: true,
                });
                eventBus.dispatch('hls:media-playlist-fetch-request', {
                    streamId: firstHlsStream.id,
                    variantUri: firstVariantUri,
                    isBackground: false,
                });
            }
        }
    });
}

export function stopAllHlsVariantPolling() {
    if (managerInterval) {
        clearInterval(managerInterval);
        managerInterval = null;
    }
    for (const intervalId of pollers.values()) {
        clearInterval(intervalId);
    }
    pollers.clear();
}