import { handleStartAnalysis } from './handlers/analysisHandler.js';
import { handleGetManifestMetadata } from './handlers/metadataHandler.js';
import {
    handleParseSegmentStructure,
    handleFetchAndParseSegment,
    handleDecryptAndParseSegment,
    handleFetchKey,
    handleFullSegmentAnalysis,
} from './parsingService.js';
import { handleShakaResourceFetch } from './handlers/shakaResourceHandler.js.js';
import { handleShakaManifestFetch } from './handlers/shakaManifestHandler.js';
import { handleCalculateMemoryReport } from './handlers/memoryReportHandler.js';
import { debugLog } from '@/shared/utils/debug';

const inFlightTasks = new Map();

async function handleFetchHlsMediaPlaylist(
    { streamId, variantUri, hlsDefinedVariables, auth, oldSegments },
    signal
) {
    const { fetchWithAuth } = await import('./http.js');
    const response = await fetchWithAuth(
        variantUri,
        auth,
        null,
        {},
        null,
        signal
    );
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const manifestString = await response.text();

    const { manifest } = await import(
        '@/infrastructure/parsing/hls/index'
    ).then((mod) =>
        mod.parseManifest(manifestString, variantUri, hlsDefinedVariables)
    );

    const newSegments = manifest.segments || [];
    const oldSegmentIds = new Set((oldSegments || []).map((s) => s.uniqueId));
    const currentSegmentUrls = newSegments.map((s) => s.uniqueId);
    const newSegmentUrls = currentSegmentUrls.filter(
        (id) => !oldSegmentIds.has(id)
    );

    return {
        streamId,
        variantUri,
        manifest,
        manifestString,
        segments: newSegments,
        currentSegmentUrls,
        newSegmentUrls,
    };
}

const handlers = {
    'start-analysis': (payload, signal) =>
        handleStartAnalysis({ ...payload, now: Date.now() }, signal),
    'get-manifest-metadata': handleGetManifestMetadata,
    'parse-segment-structure': handleParseSegmentStructure,
    'full-segment-analysis': handleFullSegmentAnalysis,
    'segment-fetch-and-parse': handleFetchAndParseSegment,
    'fetch-hls-media-playlist': handleFetchHlsMediaPlaylist,
    'fetch-key': handleFetchKey,
    'decrypt-and-parse-segment': handleDecryptAndParseSegment,
    'shaka-fetch-manifest': handleShakaManifestFetch,
    'shaka-fetch-resource': handleShakaResourceFetch,
    'calculate-memory-report': handleCalculateMemoryReport,
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

    if (id === undefined) {
        console.warn(
            'Worker received a message without an ID, ignoring.',
            event.data
        );
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
            debugLog(
                'Worker',
                `Task ${id} (${type}) completed but was already aborted.`
            );
        } else {
            debugLog(
                'Worker',
                `Task ${id} (${type}) completed successfully. Posting result.`,
                result
            );
            self.postMessage({ id, result });
        }
    } catch (e) {
        if (e.name !== 'AbortError') {
            debugLog(
                'Worker',
                `Task ${id} (${type}) failed. Posting error.`,
                e
            );
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
