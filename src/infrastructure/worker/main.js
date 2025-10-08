import { handleStartAnalysis } from './handlers/analysisHandler.js';
import { handleParseLiveUpdate } from './handlers/liveUpdateHandler.js';
import { handleGetManifestMetadata } from './handlers/metadataHandler.js';
import { handleParseSegment } from './handlers/segmentParsingHandler.js';
import { parseManifest as parseHlsManifest } from '@/infrastructure/parsing/hls/index.js';

const handlers = {
    'start-analysis': handleStartAnalysis,
    'parse-live-update': handleParseLiveUpdate,
    'get-manifest-metadata': handleGetManifestMetadata,
    'parse-segment': handleParseSegment,
    'fetch-hls-media-playlist': handleFetchHlsMediaPlaylist, // This one still involves a fetch
};

async function handleFetchHlsMediaPlaylist({
    streamId,
    variantUri,
    hlsDefinedVariables,
}) {
    // This handler is special as it performs a fetch, so it's kept here.
    const response = await fetch(variantUri);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const manifestString = await response.text();
    const { manifest } = await parseHlsManifest(
        manifestString,
        variantUri,
        hlsDefinedVariables
    );

    const freshSegmentUrls = (manifest.segments || []).map((s) => s.resolvedUrl);

    return {
        type: 'hls-media-playlist-fetched', // Special return type for the client service
        result: {
            streamId,
            variantUri,
            manifest,
            manifestString,
            segments: manifest.segments,
            freshSegmentUrls,
        },
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