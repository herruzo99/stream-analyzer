import { parseManifest as parseDashManifest } from '../protocols/manifest/dash/parser.js';
import { parseManifest as parseHlsManifest } from '../protocols/manifest/hls/parser.js';
import { eventBus } from '../core/event-bus.js';
import { analysisState } from '../core/state.js';
import {
    applyDeltaUpdate,
    serializeHls,
} from '../engines/hls/delta-updater.js';

const pollers = new Map();
let managerInterval = null;

/**
 * The core polling function. Fetches the latest manifest for a live stream,
 * compares it to the last known version, and dispatches a single, unified
 * update event if a change is detected.
 * @param {number} streamId The ID of the stream to poll.
 */
async function monitorStream(streamId) {
    const stream = analysisState.streams.find((s) => s.id === streamId);
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

        const oldManifestString = stream.rawManifest;
        let finalManifestString = newManifestString;
        let newManifestObject;

        if (stream.protocol === 'dash') {
            const { manifest } = await parseDashManifest(
                newManifestString,
                stream.baseUrl
            );
            newManifestObject = manifest;
        } else {
            // HLS: Check for Delta Update
            if (newManifestString.includes('#EXT-X-SKIP')) {
                const { manifest: deltaManifest } = await parseHlsManifest(
                    newManifestString,
                    stream.baseUrl,
                    stream.hlsDefinedVariables
                );
                const resolvedParsedHls = applyDeltaUpdate(
                    stream.manifest.rawElement,
                    deltaManifest.rawElement
                );

                // Re-adapt and re-serialize to get the final state
                const { manifest: resolvedManifest } = await parseHlsManifest(
                    serializeHls(resolvedParsedHls),
                    stream.baseUrl,
                    stream.hlsDefinedVariables
                );
                newManifestObject = resolvedManifest;
                finalManifestString = serializeHls(resolvedParsedHls);
            } else {
                const { manifest } = await parseHlsManifest(
                    newManifestString,
                    stream.baseUrl,
                    stream.hlsDefinedVariables
                );
                newManifestObject = manifest;
            }
        }

        eventBus.dispatch('livestream:manifest-updated', {
            streamId: stream.id,
            newManifestString: finalManifestString,
            newManifestObject,
            oldManifestString,
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
 * @param {import('../core/state.js').Stream} stream
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
        const pollInterval = Math.max(updatePeriodSeconds * 1000, 10000);

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
    const dynamicStreams = analysisState.streams.filter(
        (s) => s.manifest?.type === 'dynamic'
    );

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
