import { eventBus } from '../core/event-bus.js';
import { useStore, storeActions } from '../core/store.js';

const pollers = new Map();
let managerInterval = null;

export async function pollHlsVariant(streamId, variantUri) {
    const stream = useStore.getState().streams.find((s) => s.id === streamId);
    if (!stream) {
        stopPoller(streamId, variantUri);
        return;
    }

    // NOTE: The fetch/parse is now offloaded to the main worker via streamService.
    // This poller's job is just to trigger the request at intervals.
    eventBus.dispatch('hls:media-playlist-fetch-request', {
        streamId,
        variantUri,
        isBackground: true, // Signal that this is a background poll
    });
}

function startPoller(stream, variantUri) {
    const pollerKey = `${stream.id}-${variantUri}`;
    if (pollers.has(pollerKey)) return;

    // Perform an immediate fetch first
    pollHlsVariant(stream.id, variantUri);

    // Then set up the interval
    const pollInterval = (stream.manifest?.minBufferTime || 2) * 1000;
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
    const hlsStreams = useStore
        .getState()
        .streams.filter(
            (s) => s.protocol === 'hls' && s.manifest?.type === 'dynamic'
        );

    for (const stream of hlsStreams) {
        for (const [variantUri, state] of stream.hlsVariantState.entries()) {
            const pollerKey = `${stream.id}-${variantUri}`;
            const shouldBePolling = state.isPolling && state.isExpanded;
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
    const stream = useStore.getState().streams.find((s) => s.id === streamId);
    if (stream) {
        const newVariantState = new Map(stream.hlsVariantState);
        const currentState = newVariantState.get(variantUri);
        if (currentState) {
            newVariantState.set(variantUri, { ...currentState, ...updates });
            storeActions.updateStream(streamId, {
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
        'hls-explorer:toggle-variant',
        ({ streamId, variantUri }) => {
            const stream = useStore
                .getState()
                .streams.find((s) => s.id === streamId);
            const variantState = stream?.hlsVariantState.get(variantUri);
            if (variantState) {
                const isNowExpanded = !variantState.isExpanded;
                const needsFetch =
                    isNowExpanded &&
                    variantState.segments.length === 0 &&
                    !variantState.error;

                // Atomically update both `isExpanded` and `isLoading`
                updateVariantState(streamId, variantUri, {
                    isExpanded: isNowExpanded,
                    isLoading: needsFetch, // Set loading state here
                });

                // Then, if needed, trigger the fetch. The state is already updated.
                if (needsFetch) {
                    eventBus.dispatch('hls:media-playlist-fetch-request', {
                        streamId,
                        variantUri,
                        isBackground: false, // This is a user action
                    });
                }
            }
        }
    );

    eventBus.subscribe(
        'hls-explorer:toggle-polling',
        ({ streamId, variantUri }) => {
            const stream = useStore
                .getState()
                .streams.find((s) => s.id === streamId);
            const variantState = stream?.hlsVariantState.get(variantUri);
            if (variantState) {
                updateVariantState(streamId, variantUri, {
                    isPolling: !variantState.isPolling,
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
        // After analysis, if there's an HLS master playlist, pre-fetch the segments for the first variant.
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
                });
                eventBus.dispatch('hls:media-playlist-fetch-request', {
                    streamId: firstHlsStream.id,
                    variantUri: firstVariantUri,
                    isBackground: false, // Initial load is a foreground action
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