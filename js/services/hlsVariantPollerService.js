import { parseManifest as parseHlsManifest } from '../protocols/manifest/hls/parser.js';
import { eventBus } from '../core/event-bus.js';
import { analysisState } from '../core/state.js';

const pollers = new Map();
let managerInterval = null;

/**
 * The core polling function for a single HLS variant playlist.
 * @param {number} streamId The ID of the parent stream.
 * @param {string} variantUri The URI of the variant playlist to poll.
 */
export async function pollHlsVariant(streamId, variantUri) {
    const stream = analysisState.streams.find((s) => s.id === streamId);
    const variantState = stream?.hlsVariantState.get(variantUri);
    if (!stream || !variantState) {
        stopPoller(streamId, variantUri);
        return;
    }

    eventBus.dispatch('hls-poller:variant-loading', { streamId, variantUri });

    try {
        const response = await fetch(variantUri);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} fetching playlist`);
        }
        const newManifestString = await response.text();
        const { manifest } = await parseHlsManifest(
            newManifestString,
            variantUri
        );
        const freshSegmentUrls = new Set(
            manifest.rawElement.segments.map((s) => s.resolvedUrl)
        );

        eventBus.dispatch('hls-poller:variant-updated', {
            streamId,
            variantUri,
            segments: manifest.rawElement.segments,
            freshSegmentUrls,
        });
    } catch (error) {
        console.error(
            `[HLSVariantPoller] Failed to fetch or parse playlist ${variantUri}:`,
            error
        );
        eventBus.dispatch('hls-poller:variant-updated', {
            streamId,
            variantUri,
            error: error.message,
        });
    }
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

/**
 * This manager function runs periodically to synchronize the polling state
 * with the per-variant UI state (isPolling, isExpanded).
 * NOTE: This is only intended for live/dynamic streams. VOD variant playlists
 * are fetched on-demand when expanded, not via this polling manager.
 */
export function manageHlsPollers() {
    const hlsStreams = analysisState.streams.filter(
        (s) => s.protocol === 'hls' && s.hlsVariantState.size > 0
    );

    for (const stream of hlsStreams) {
        for (const [variantUri, state] of stream.hlsVariantState.entries()) {
            const pollerKey = `${stream.id}-${variantUri}`;
            const shouldBePolling =
                state.isPolling &&
                state.isExpanded &&
                stream.manifest.type === 'dynamic';
            const isCurrentlyPolling = pollers.has(pollerKey);

            if (shouldBePolling && !isCurrentlyPolling) {
                startPoller(stream, variantUri);
            } else if (!shouldBePolling && isCurrentlyPolling) {
                stopPoller(stream.id, variantUri);
            }
        }
    }
}

export function initializeHlsVariantPoller() {
    if (managerInterval) clearInterval(managerInterval);
    managerInterval = setInterval(manageHlsPollers, 1000);
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
