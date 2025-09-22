import { parseManifest as parseDashManifest } from '../../protocols/dash/parser.js';
import { parseManifest as parseHlsManifest } from '../../protocols/hls/parser.js';
import { generateFeatureAnalysis } from './logic.js';
import { eventBus } from '../../core/event-bus.js';

const pollers = new Map();

async function pollForFeatures(stream) {
    if (!stream || !stream.originalUrl) {
        return;
    }

    try {
        const response = await fetch(stream.originalUrl);
        if (!response.ok) return;
        const newManifestString = await response.text();

        // Avoid re-analyzing if the manifest hasn't changed
        if (newManifestString === stream.rawManifest) {
            return;
        }

        let newManifest;
        if (stream.protocol === 'dash') {
            const { manifest } = await parseDashManifest(
                newManifestString,
                stream.baseUrl
            );
            newManifest = manifest;
        } else {
            const { manifest } = await parseHlsManifest(
                newManifestString,
                stream.baseUrl
            );
            newManifest = manifest;
        }

        const newAnalysisResults = generateFeatureAnalysis(
            newManifest,
            stream.protocol
        );

        // Dispatch an update event with the new raw results
        eventBus.dispatch('feature-analysis:updated', {
            streamId: stream.id,
            newAnalysisResults,
            newRawManifest: newManifestString, // Pass this to update the stream object
        });
    } catch (e) {
        console.error(
            `[FEATURE-POLL] Error fetching update for stream ${stream.id}:`,
            e
        );
    }
}

export function startFeaturePolling(stream) {
    if (pollers.has(stream.id)) {
        return; // Already polling
    }

    // Only poll for dynamic streams that have a URL
    if (stream.manifest?.type === 'dynamic' && stream.originalUrl) {
        const updatePeriodSeconds =
            stream.manifest.minimumUpdatePeriod ||
            stream.manifest.minBufferTime ||
            2;
        const pollInterval = Math.max(updatePeriodSeconds * 1000, 2000);

        const pollerId = setInterval(() => pollForFeatures(stream), pollInterval);
        pollers.set(stream.id, pollerId);
    }
}

export function stopFeaturePolling(streamId) {
    if (pollers.has(streamId)) {
        clearInterval(pollers.get(streamId));
        pollers.delete(streamId);
    }
}

export function stopAllFeaturePolling() {
    for (const pollerId of pollers.values()) {
        clearInterval(pollerId);
    }
    pollers.clear();
}