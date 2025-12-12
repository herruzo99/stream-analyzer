import { handleStartAnalysis } from './handlers/analysisHandler.js';
import { handleGetStreamDrmInfo } from './handlers/drmDetectionHandler.js';
import { handleGetManifestMetadata } from './handlers/metadataHandler.js';
import { handleAnalyzeFrameSequence } from './handlers/qcHandler.js'; // NEW
import { handleShakaManifestFetch } from './handlers/shakaManifestHandler.js';
import { handleShakaResourceFetch } from './handlers/shakaResourceHandler.js';
import { handleTier0Analysis } from './handlers/tier0Handler.js';
import {
    handleDecryptAndParseSegment,
    handleFetchAndParseSegment,
    handleFetchKey,
    handleFullSegmentAnalysis,
    handleParseSegmentStructure,
    handleRunTsSemanticAnalysis,
} from './parsingService.js';

const inFlightTasks = new Map();

const handlers = {
    'start-analysis': (payload, signal, postProgress) =>
        handleStartAnalysis(
            { ...payload, now: Date.now(), postProgress },
            signal
        ),
    'get-manifest-metadata': handleGetManifestMetadata,
    'get-stream-drm-info': handleGetStreamDrmInfo,
    'parse-segment-structure': handleParseSegmentStructure,
    'full-segment-analysis': handleFullSegmentAnalysis,
    'segment-fetch-and-parse': handleFetchAndParseSegment,
    'fetch-key': handleFetchKey,
    'decrypt-and-parse-segment': handleDecryptAndParseSegment,
    'shaka-fetch-manifest': handleShakaManifestFetch,
    'shaka-fetch-resource': handleShakaResourceFetch,
    'run-ts-semantic-analysis': handleRunTsSemanticAnalysis,
    'tier0-analysis': handleTier0Analysis,
    // NEW: QC Handler
    'analyze-frame-sequence': handleAnalyzeFrameSequence
};

self.addEventListener('message', async (event) => {
    if (event.origin !== '' && event.origin !== self.location.origin) {
        return;
    }

    const { id, type, payload } = event.data;

    if (type === 'cancel-task') {
        if (inFlightTasks.has(id)) {
            const { abortController } = inFlightTasks.get(id);
            if (abortController) abortController.abort();
            inFlightTasks.delete(id);
        }
        return;
    }

    if (id === undefined && type) {
        // Allow global events
        return;
    }

    const handler = handlers[type];
    if (!handler) {
        self.postMessage({ id, error: { message: `Unknown task: ${type}` } });
        return;
    }

    const abortController = new AbortController();
    inFlightTasks.set(id, { abortController });

    const postProgress = (message) => {
        self.postMessage({ type: 'analysis:progress', payload: { message } });
    };

    try {
        const result = await handler(payload, abortController.signal, postProgress);
        if (!abortController.signal.aborted) {
            // Check if result contains Transferables (ImageBitmap, ArrayBuffer)
            const transferables = result?.transferables || [];
            self.postMessage({ id, result }, transferables);
        }
    } catch (e) {
        if (e.name !== 'AbortError') {
            self.postMessage({ id, error: { message: e.message } });
        }
    } finally {
        inFlightTasks.delete(id);
    }
});