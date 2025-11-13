import { handleGetManifestMetadata } from './handlers/metadataHandler.js';
import {
    handleParseSegmentStructure,
    handleFetchAndParseSegment,
    handleDecryptAndParseSegment,
    handleFetchKey,
    handleFullSegmentAnalysis,
} from './parsingService.js';
import { handleShakaResourceFetch } from './handlers/shakaResourceHandler.js';
import { handleShakaManifestFetch } from './handlers/shakaManifestHandler.js';
import { handleGetStreamDrmInfo } from './handlers/drmDetectionHandler.js';
import { appLog } from '@/shared/utils/debug';
import { handleStartAnalysis } from './handlers/analysisHandler.js';

const inFlightTasks = new Map();

async function handleFetchHlsMediaPlaylist(
    {
        streamId,
        variantUri,
        hlsDefinedVariables,
        auth,
        oldSegments,
        proactiveFetch,
    },
    signal
) {
    const { fetchWithAuth } = await import('./http.js');
    const { handleParseSegmentStructure } = await import('./parsingService.js');
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

    let inbandEvents = [];
    let proactivelyParsedSegments = [];
    if (proactiveFetch && newSegmentUrls.length > 0) {
        const fetchAndParsePromises = newSegmentUrls.map(
            async (uniqueId) => {
                const segment = newSegments.find((s) => s.uniqueId === uniqueId);
                if (!segment) return null;
                try {
                    const res = await fetchWithAuth(
                        segment.resolvedUrl,
                        auth,
                        segment.range
                    );
                    if (!res.ok) return null;
                    const data = await res.arrayBuffer();
                    const parsedData = await handleParseSegmentStructure({
                        data,
                        formatHint: 'ts',
                        url: segment.resolvedUrl,
                        context: {},
                    });
                    return { uniqueId, data, parsedData, status: 200 };
                } catch {
                    return null;
                }
            }
        );

        const results = await Promise.all(fetchAndParsePromises);
        results.forEach((result) => {
            if (result) {
                proactivelyParsedSegments.push(result);
                if (result.parsedData?.data?.events) {
                    inbandEvents.push(...result.parsedData.data.events);
                }
            }
        });
    }

    return {
        streamId,
        variantUri,
        manifest,
        manifestString,
        currentSegmentUrls,
        newSegmentUrls,
        inbandEvents,
        proactivelyParsedSegments,
    };
}

const handlers = {
    'start-analysis': (payload, signal) =>
        handleStartAnalysis({ ...payload, now: Date.now() }, signal),
    'get-manifest-metadata': handleGetManifestMetadata,
    'get-stream-drm-info': handleGetStreamDrmInfo,
    'parse-segment-structure': handleParseSegmentStructure,
    'full-segment-analysis': handleFullSegmentAnalysis,
    'segment-fetch-and-parse': handleFetchAndParseSegment,
    'fetch-hls-media-playlist': handleFetchHlsMediaPlaylist,
    'fetch-key': handleFetchKey,
    'decrypt-and-parse-segment': handleDecryptAndParseSegment,
    'shaka-fetch-manifest': handleShakaManifestFetch,
    'shaka-fetch-resource': handleShakaResourceFetch,
};

self.addEventListener('message', async (event) => {
    const { id, type, payload } = event.data;

    if (type === 'cancel-task') {
        if (inFlightTasks.has(id)) {
            const { abortController } = inFlightTasks.get(id);
            if (abortController) {
                abortController.abort();
                appLog(
                    'Worker',
                    'info',
                    `Task ${id} aborted by main thread.`
                );
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
        appLog(
            'Worker',
            'warn',
            `No handler found for task type: ${type}`
        );
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