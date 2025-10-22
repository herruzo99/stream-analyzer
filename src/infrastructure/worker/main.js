import { handleStartAnalysis } from './handlers/analysisHandler.js';
import { handleParseLiveUpdate } from './handlers/liveUpdateHandler.js';
import { handleGetManifestMetadata } from './handlers/metadataHandler.js';
import {
    handleParseSegmentStructure,
    handleGeneratePagedByteMap,
    handleFetchKey,
    handleDecryptAndParseSegment,
    handleFetchAndParseSegment,
} from './handlers/segmentParsingHandler.js';
import { fetchWithAuth } from './http.js';

async function handleFetchHlsMediaPlaylist({
    streamId,
    variantUri,
    hlsDefinedVariables,
    auth,
}) {
    const response = await fetchWithAuth(
        variantUri,
        auth,
        'manifest',
        streamId
    );
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const manifestString = await response.text();
    // Re-use the main parser to ensure uniqueId is generated correctly.
    const { manifest } = await import(
        '@/infrastructure/parsing/hls/index'
    ).then((mod) =>
        mod.parseManifest(manifestString, variantUri, hlsDefinedVariables)
    );

    const freshSegmentUrls = (manifest.segments || []).map(
        (s) => s.resolvedUrl
    );

    return {
        streamId,
        variantUri,
        manifest,
        manifestString,
        segments: manifest.segments || [],
        freshSegmentUrls, // This is an array of strings
    };
}

async function handleLogShakaNetworkEvent({ streamId, resourceType, response }) {
    // This handler receives an event from the main thread's Shaka response filter.
    // It constructs a log entry but does NOT perform a fetch itself.
    // The main `http.js` `logRequest` function is designed for active fetches,
    // so we build the event manually here.

    const provisionalEvent = {
        id: crypto.randomUUID(),
        url: response.uri,
        resourceType,
        streamId,
        request: {
            method: 'GET', // Assumed for Shaka player requests
            headers: {}, // Request headers are not available in the response filter
        },
        response: {
            status: response.status,
            statusText: '', // Not available
            headers: response.headers,
            contentLength: response.data?.byteLength || 0,
            contentType: response.headers['content-type'] || null,
        },
        // Timings from performance entries are handled on the main thread via enrichment
        timing: {
            startTime: performance.now(),
            endTime: performance.now(),
            duration: 0,
            breakdown: {},
        },
    };

    self.postMessage({ type: 'worker:network-event', payload: provisionalEvent });
}

const handlers = {
    'start-analysis': handleStartAnalysis,
    'live-update-fetch-and-parse': handleParseLiveUpdate,
    'get-manifest-metadata': handleGetManifestMetadata,
    'parse-segment-structure': handleParseSegmentStructure,
    'segment-fetch-and-parse': handleFetchAndParseSegment,
    'generate-paged-byte-map': handleGeneratePagedByteMap,
    'fetch-hls-media-playlist': handleFetchHlsMediaPlaylist,
    'fetch-key': handleFetchKey,
    'decrypt-and-parse-segment': handleDecryptAndParseSegment,
    'log-shaka-network-event': handleLogShakaNetworkEvent,
};

self.addEventListener('message', async (event) => {
    const { id, type, payload } = event.data;

    // Handle global, non-request/response messages like network logging.
    if (type && id === undefined) {
        // This is a fire-and-forget message from one of our internal services.
        // We simply forward it to the main thread, which will have its own handlers.
        self.postMessage({ type, payload });
        return;
    }

    const handler = handlers[type];

    if (!handler) {
        self.postMessage({
            id,
            error: { message: `Unknown task type: ${type}` },
        });
        return;
    }

    try {
        const result = await handler(payload);
        self.postMessage({ id, result });
    } catch (e) {
        self.postMessage({
            id,
            error: {
                message: e.message,
                stack: e.stack,
                name: e.name,
            },
        });
    }
});