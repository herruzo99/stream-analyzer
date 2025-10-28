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
import { debugLog } from '@/shared/utils/debug';

const inFlightTasks = new Map();

async function handleFetchHlsMediaPlaylist({
    streamId,
    variantUri,
    hlsDefinedVariables,
    auth,
}, signal) {
    const { fetchWithAuth } = await import('./http.js');
    const response = await fetchWithAuth(variantUri, auth, null, {}, null, signal);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const manifestString = await response.text();
    
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
        freshSegmentUrls,
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

    if (type === 'cancel-task') {
        if (inFlightTasks.has(id)) {
            const { abortController } = inFlightTasks.get(id);
            if (abortController) {
                abortController.abort();
                debugLog('Worker', `Task ${id} aborted by main thread.`);
            }
            inFlightTasks.delete(id);
        }
        return;
    }
    
    // All messages are now expected to be tasks with IDs.
    // Global, fire-and-forget events must be explicitly posted by handlers.
    if (id === undefined) {
        console.warn('Worker received a message without an ID, ignoring.', event.data);
        return;
    }
    
    debugLog('Worker', `Received task. ID: ${id}, Type: ${type}`, payload);

    const handler = handlers[type];

    if (!handler) {
        debugLog('Worker', `No handler found for task type: ${type}`);
        self.postMessage({
            id,
            error: { message: `Unknown task type: ${type}` },
        });
        return;
    }
    
    const abortController = new AbortController();
    inFlightTasks.set(id, { abortController });
    
    try {
        const result = await handler(payload, abortController.signal);
        
        if (abortController.signal.aborted) {
            debugLog('Worker', `Task ${id} (${type}) completed but was already aborted.`);
        } else {
            debugLog('Worker', `Task ${id} (${type}) completed successfully. Posting result.`, result);
            self.postMessage({ id, result });
        }
    } catch (e) {
        if (e.name !== 'AbortError') {
             debugLog('Worker', `Task ${id} (${type}) failed. Posting error.`, e);
            self.postMessage({
                id,
                error: {
                    message: e.message,
                    stack: e.stack,
                    name: e.name,
                    code: e.code,
                    category: e.category,
                    severity: e.severity,
                    data: e.data,
                },
            });
        }
    } finally {
        inFlightTasks.delete(id);
    }
});