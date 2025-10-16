import { handleStartAnalysis } from './handlers/analysisHandler.js';
import { handleParseLiveUpdate } from './handlers/liveUpdateHandler.js';
import { handleGetManifestMetadata } from './handlers/metadataHandler.js';
import {
    handleParseSegmentStructure,
    handleGeneratePagedByteMap,
    handleFetchKey,
    handleDecryptAndParseSegment,
} from './handlers/segmentParsingHandler.js';
import { parseManifest as parseHlsManifest } from '@/infrastructure/parsing/hls/index';
import { fetchWithRetry } from '@/application/utils/fetch';

const handlers = {
    'start-analysis': handleStartAnalysis,
    'parse-live-update': handleParseLiveUpdate,
    'get-manifest-metadata': handleGetManifestMetadata,
    'parse-segment-structure': handleParseSegmentStructure,
    'generate-paged-byte-map': handleGeneratePagedByteMap,
    'fetch-hls-media-playlist': handleFetchHlsMediaPlaylist,
    'fetch-key': handleFetchKey,
    'decrypt-and-parse-segment': handleDecryptAndParseSegment,
};

async function handleFetchHlsMediaPlaylist({
    streamId,
    variantUri,
    hlsDefinedVariables,
}) {
    const response = await fetchWithRetry(variantUri);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const manifestString = await response.text();
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
        segments: manifest.segments,
        freshSegmentUrls,
    };
}

self.addEventListener('message', async (event) => {
    const { id, type, payload } = event.data;
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