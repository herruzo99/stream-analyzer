import { handleStartAnalysis } from './handlers/analysisHandler.js';
import { handleParseLiveUpdate } from './handlers/liveUpdateHandler.js';
import { handleGetManifestMetadata } from './handlers/metadataHandler.js';
import {
    handleParseSegmentStructure,
    handleGeneratePagedByteMap,
    handleFetchKey,
    handleDecryptAndParseSegment,
    handleFetchAndParseSegment,
    handleCacheRawSegment,
    handleParseCachedSegment,
} from './handlers/segmentParsingHandler.js';
import { handleShakaFetch } from './handlers/shakaFetchHandler.js';
import { fetchWithAuth } from './http.js';
import { debugLog } from '@/shared/utils/debug';

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
    'shaka-fetch': handleShakaFetch,
    'cache-raw-segment': handleCacheRawSegment,
    'parse-cached-segment': handleParseCachedSegment,
};

self.addEventListener('message', async (event) => {
    const { id, type, payload } = event.data;
    debugLog('Worker', `Received task. ID: ${id}, Type: ${type}`, payload);

    // A message without an ID is a global, fire-and-forget event
    // that should be passed through to the main thread's listener.
    if (id === undefined) {
        self.postMessage({ type, payload });
        return;
    }

    const handler = handlers[type];

    if (!handler) {
        debugLog('Worker', `No handler found for task type: ${type}`);
        self.postMessage({
            id,
            error: { message: `Unknown task type: ${type}` },
        });
        return;
    }

    try {
        const result = await handler(payload);
        debugLog('Worker', `Task ${id} (${type}) completed successfully.`);
        self.postMessage({ id, result });
    } catch (e) {
        debugLog('Worker', `Task ${id} (${type}) failed.`, e);
        self.postMessage({
            id,
            error: {
                message: e.message,
                stack: e.stack,
                name: e.name,
                // Add shaka-specific error data if present
                shakaErrorCode: e.shakaErrorCode,
                data: e.data,
            },
        });
    }
});