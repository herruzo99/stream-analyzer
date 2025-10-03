import { eventBus } from '../core/event-bus.js';
import { useStore } from '../core/store.js';

const pollers = new Map();
let managerInterval = null;

// The monitor service will have its own dedicated worker to avoid conflicts with the main analysis worker.
const liveUpdateWorker = new Worker('/dist/worker.js', { type: 'module' });

liveUpdateWorker.onmessage = (event) => {
    const { type, payload } = event.data;

    if (type === 'live-update-parsed') {
        const {
            streamId,
            newManifestObject,
            finalManifestString,
            oldRawManifest,
            complianceResults,
        } = payload;
        eventBus.dispatch('livestream:manifest-updated', {
            streamId,
            newManifestString: finalManifestString,
            newManifestObject,
            oldManifestString: oldRawManifest,
            complianceResults,
        });
    } else if (type === 'live-update-error') {
        console.error(
            `[LiveStreamMonitor] Worker failed to parse update for stream ${payload.streamId}:`,
            payload.error
        );
    }
};

/**
 * The core polling function. Fetches the latest manifest for a live stream,
 * delegates parsing to the worker, and awaits the parsed result.
 * @param {number} streamId The ID of the stream to poll.
 */
async function monitorStream(streamId) {
    const stream = useStore.getState().streams.find((s) => s.id === streamId);
    if (!stream || !stream.originalUrl) {
        stopMonitoring(streamId); // Stop if stream is gone
        return;
    }

    try {
        const response = await fetch(stream.originalUrl);
        if (!response.ok) return;
        const newManifestString = await response.text();

        if (newManifestString === stream.rawManifest) {
            eventBus.dispatch('ui:show-status', {
                message: 'Manifest has not changed.',
                type: 'info',
                duration: 2000,
            });
            return;
        }

        // Offload the parsing to the worker
        liveUpdateWorker.postMessage({
            type: 'parse-live-update',
            payload: {
                streamId: stream.id,
                newManifestString,
                oldRawManifest: stream.rawManifest,
                protocol: stream.protocol,
                baseUrl: stream.baseUrl,
                hlsDefinedVariables: stream.hlsDefinedVariables,
                // For HLS delta updates, the worker needs the old parsed object.
                oldManifestObjectForDelta: stream.manifest?.serializedManifest,
            },
        });
    } catch (e) {
        console.error(
            `[LiveStreamMonitor] Error fetching update for stream ${stream.id}:`,
            e
        );
    }
}

/**
 * Starts the polling monitor for a given stream if it's dynamic.
 * @param {import('../core/store.js').Stream} stream
 */
function startMonitoring(stream) {
    if (pollers.has(stream.id)) {
        return; // Already monitoring
    }

    if (stream.manifest?.type === 'dynamic' && stream.originalUrl) {
        const updatePeriodSeconds =
            stream.manifest.minimumUpdatePeriod ||
            stream.manifest.minBufferTime ||
            2;
        const pollInterval = Math.max(updatePeriodSeconds * 1000, 2000); // Enforce min 2s poll

        const pollerId = setInterval(
            () => monitorStream(stream.id),
            pollInterval
        );
        pollers.set(stream.id, pollerId);
    }
}

/**
 * Stops the polling monitor for a specific stream.
 * @param {number} streamId
 */
function stopMonitoring(streamId) {
    if (pollers.has(streamId)) {
        clearInterval(pollers.get(streamId));
        pollers.delete(streamId);
    }
}

/**
 * This manager function runs to synchronize the polling state
 * with the per-stream state. Now exported for deterministic testing.
 */
export function managePollers() {
    const dynamicStreams = useStore
        .getState()
        .streams.filter((s) => s.manifest?.type === 'dynamic');

    dynamicStreams.forEach((stream) => {
        const isCurrentlyPolling = pollers.has(stream.id);

        if (stream.isPolling && !isCurrentlyPolling) {
            startMonitoring(stream);
        } else if (!stream.isPolling && isCurrentlyPolling) {
            stopMonitoring(stream.id);
        }
    });

    // Clean up pollers for streams that no longer exist
    for (const streamId of pollers.keys()) {
        if (!dynamicStreams.some((s) => s.id === streamId)) {
            stopMonitoring(streamId);
        }
    }
}

/**
 * Initializes the monitoring service.
 */
export function initializeLiveStreamMonitor() {
    if (managerInterval) {
        clearInterval(managerInterval);
    }
    // The interval is for the live application, tests will call managePollers directly.
    managerInterval = setInterval(managePollers, 1000);
    eventBus.subscribe('state:stream-updated', managePollers);
    eventBus.subscribe('state:analysis-complete', managePollers);
    eventBus.subscribe('manifest:force-reload', ({ streamId }) =>
        monitorStream(streamId)
    );
}

/**
 * Stops all active polling monitors and the manager itself.
 */
export function stopAllMonitoring() {
    if (managerInterval) {
        clearInterval(managerInterval);
        managerInterval = null;
    }
    for (const pollerId of pollers.values()) {
        clearInterval(pollerId);
    }
    pollers.clear();
}
