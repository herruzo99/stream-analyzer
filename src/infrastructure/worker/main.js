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
import { parseManifest as parseHlsManifest } from '@/infrastructure/parsing/hls/index';
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
    const { manifest } = await parseHlsManifest(
        manifestString,
        variantUri,
        hlsDefinedVariables
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
};

self.addEventListener('message', async (event) => {
    const { id, type, payload } = event.data;

    // Handle global, non-request/response messages like network logging.
    // The check is now correctly `id === undefined` to avoid treating `id: 0` as a global event.
    if (type && id === undefined) {
        if (type === 'network:log-event') {
            // This is a fire-and-forget message, just post it back to main thread
            self.postMessage({ type, payload });
        }
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
