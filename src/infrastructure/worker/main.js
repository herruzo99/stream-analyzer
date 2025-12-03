import { appLog } from '../../shared/utils/debug.js';
import { handleStartAnalysis } from './handlers/analysisHandler.js';
import { handleGetStreamDrmInfo } from './handlers/drmDetectionHandler.js';
import { handleGetManifestMetadata } from './handlers/metadataHandler.js';
import { handleShakaManifestFetch } from './handlers/shakaManifestHandler.js';
import { handleShakaResourceFetch } from './handlers/shakaResourceHandler.js';
import { handleTier0Analysis } from './handlers/tier0Handler.js'; // Import new handler
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
    'tier0-analysis': handleTier0Analysis, // Register new handler
};

self.addEventListener('message', async (event) => {
    const { id, type, payload } = event.data;

    if (type === 'cancel-task') {
        if (inFlightTasks.has(id)) {
            const { abortController } = inFlightTasks.get(id);
            if (abortController) {
                abortController.abort();
                appLog('Worker', 'info', `Task ${id} aborted by main thread.`);
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

    appLog(
        'Worker',
        'info',
        `Received task. ID: ${id}, Type: ${type}`,
        payload
    );

    const handler = handlers[type];

    if (!handler) {
        appLog('Worker', 'warn', `No handler found for task type: ${type}`);
        self.postMessage({
            id,
            error: { message: `Unknown task type: ${type}` },
        });
        return;
    }

    const abortController = new AbortController();
    inFlightTasks.set(id, { abortController });

    const postProgress = (message) => {
        self.postMessage({ type: 'analysis:progress', payload: { message } });
    };

    try {
        const result = await handler(
            payload,
            abortController.signal,
            postProgress
        );

        if (abortController.signal.aborted) {
            appLog(
                'Worker',
                'info',
                `Task ${id} (${type}) completed but was already aborted.`
            );
        } else {
            appLog(
                'Worker',
                'log',
                `Task ${id} (${type}) completed successfully. Posting result.`,
                result
            );
            self.postMessage({ id, result });
        }
    } catch (e) {
        if (e.name !== 'AbortError') {
            appLog(
                'Worker',
                'error',
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
