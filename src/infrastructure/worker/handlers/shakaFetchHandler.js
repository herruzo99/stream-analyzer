import { fetchWithAuth } from '../http.js';
import { inferMediaInfoFromExtension } from '@/infrastructure/parsing/utils/media-types';
import { parseSegment } from './segmentParsingHandler.js';
import { debugLog } from '@/shared/utils/debug';

/**
 * Maps Shaka Player's request type values to our internal resource types for logging.
 * @param {object} request The simplified, serializable request object.
 * @param {number} requestType The numeric enum value for the request type from shaka.net.NetworkingEngine.RequestType
 * @returns {import('@/types').ResourceType}
 */
function mapShakaRequestType(request, requestType) {
    // Enum values from shaka.net.NetworkingEngine.RequestType
    const MANIFEST = 0;
    const SEGMENT = 1;
    const LICENSE = 2;
    const KEY = 3;

    switch (requestType) {
        case MANIFEST:
            return 'manifest';
        case LICENSE:
            return 'license';
        case KEY:
            return 'key';
        case SEGMENT: {
            const { contentType } = inferMediaInfoFromExtension(
                request.uris[0]
            );
            if (['video', 'audio', 'text', 'init'].includes(contentType)) {
                return /** @type {import('@/types').ResourceType} */ (
                    contentType
                );
            }
            return 'other';
        }
        default:
            return 'other';
    }
}

/**
 * Fetches a resource for Shaka player, logs it, and returns the ArrayBuffer.
 * This function is called by the worker's main message handler.
 * @param {object} payload
 * @param {object} payload.request The simplified, serializable request object.
 * @param {number} payload.requestType The request type enum value.
 * @param {import('@/types').AuthInfo} payload.auth Authentication info.
 * @param {number} payload.streamId The ID of the stream this request belongs to.
 * @param {AbortSignal} signal - The AbortSignal for the operation.
 * @returns {Promise<shaka.extern.Response>}
 */
export async function handleShakaFetch(
    { request, requestType, auth, streamId },
    signal
) {
    const MANIFEST_REQUEST_TYPE = 0;
    const SEGMENT_REQUEST_TYPE = 1;
    const NETWORK_ERROR = 6001;
    const NETWORK_CATEGORY = 1;
    const CRITICAL_SEVERITY = 2;

    const url = request.uris[0];

    try {
        const startTime = performance.now();
        const response = await fetchWithAuth(
            url,
            auth,
            null, // range
            request.headers,
            request.body,
            signal
        );

        // Explicitly post a global message for the network event.
        const resourceType = mapShakaRequestType(request, requestType);
        self.postMessage({
            type: 'worker:network-event',
            payload: {
                id: crypto.randomUUID(),
                url: response.url,
                resourceType,
                streamId,
                request: {
                    method: request.method,
                    headers: request.headers,
                },
                response: {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                    contentLength: Number(response.headers['content-length']) || null,
                    contentType: response.headers['content-type'],
                },
                timing: {
                    startTime,
                    endTime: performance.now(),
                    duration: performance.now() - startTime,
                    breakdown: null, // Let main thread enrich this
                },
            },
        });

        if (!response.ok) {
            // Let Shaka handle HTTP errors
            return {
                uri: response.url,
                originalUri: url,
                data: new ArrayBuffer(0),
                headers: response.headers,
                status: response.status,
                originalRequest: request,
            };
        }

        let data;
        if (requestType === MANIFEST_REQUEST_TYPE) {
            const manifestText = await response.text();
            data = new TextEncoder().encode(manifestText).buffer;
        } else {
            data = await response.arrayBuffer();
        }

        if (requestType === SEGMENT_REQUEST_TYPE) {
            try {
                const parsedData = await parseSegment({
                    data: data.slice(0),
                    url,
                });
                self.postMessage({
                    type: 'worker:shaka-segment-loaded',
                    payload: {
                        uniqueId: url,
                        status: response.status,
                        data,
                        parsedData,
                        streamId,
                    },
                });
            } catch (e) {
                console.error(
                    `[Worker] Failed to parse Shaka-loaded segment ${url}:`,
                    e
                );
            }
        }

        return {
            uri: response.url,
            originalUri: url,
            data: data,
            headers: response.headers,
            status: response.status,
            originalRequest: request,
        };
    } catch (error) {
        if (error.name === 'AbortError') {
            debugLog('shakaFetchHandler', `Fetch aborted for ${url}`);
            // Re-throw to be caught by the main worker loop, which will ignore it.
            throw error;
        }
        
        debugLog(
            'shakaFetchHandler',
            'Caught catastrophic fetch error, re-throwing as Shaka-compatible object.',
            error
        );
        throw {
            message: error.message || 'A network error occurred.',
            code: error.code || NETWORK_ERROR,
            category: error.category || NETWORK_CATEGORY,
            severity: error.severity || CRITICAL_SEVERITY,
            data: error.data || [url, null, request, requestType, error],
        };
    }
}