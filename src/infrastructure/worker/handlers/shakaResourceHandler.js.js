import { fetchWithAuth } from '../http.js';
import { inferMediaInfoFromExtension } from '@/infrastructure/parsing/utils/media-types';
import { handleParseSegmentStructure as parseAndDecorate } from '../parsingService.js';
import { debugLog } from '@/shared/utils/debug';
import shaka from 'shaka-player/dist/shaka-player.compiled';

/**
 * Maps Shaka Player's request type values to our internal resource types for logging.
 * @param {shaka.extern.Request} request The simplified, serializable request object.
 * @param {number} requestType The numeric enum value for the request type from shaka.net.NetworkingEngine.RequestType
 * @returns {import('@/types').ResourceType}
 */
function mapShakaRequestType(request, requestType) {
    const MANIFEST = 0,
        SEGMENT = 1,
        LICENSE = 2,
        KEY = 3;
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
            return ['video', 'audio', 'text', 'init'].includes(contentType)
                ? /** @type {import('@/types').ResourceType} */ (contentType)
                : 'other';
        }
        default:
            return 'other';
    }
}

/**
 * Fetches a non-manifest resource for Shaka player (segment, license, key), logs it, and returns the ArrayBuffer.
 * @param {object} payload
 * @param {shaka.extern.Request} payload.request The simplified, serializable request object.
 * @param {number} payload.requestType The request type enum value.
 * @param {import('@/types').AuthInfo} payload.auth Authentication info.
 * @param {number} payload.streamId The ID of the stream this request belongs to.
 * @param {AbortSignal} signal - The AbortSignal for the operation.
 * @returns {Promise<shaka.extern.Response>}
 */
export async function handleShakaResourceFetch(
    { request, requestType, auth, streamId },
    signal
) {
    const SEGMENT_REQUEST_TYPE = 1;
    const NETWORK_ERROR = 6001;
    const NETWORK_CATEGORY = 1;
    const CRITICAL_SEVERITY = 2;

    const url = request.uris[0];

    debugLog('shakaResourceHandler', `Fetching resource from network: ${url}.`);

    try {
        const startTime = performance.now();

        const body = /** @type {BodyInit | null} */ (request.body || null);

        const response = await fetchWithAuth(
            url,
            auth,
            null,
            request.headers,
            body,
            signal
        );

        self.postMessage({
            type: 'worker:network-event',
            payload: {
                id: crypto.randomUUID(),
                url: response.url,
                resourceType: mapShakaRequestType(request, requestType),
                streamId,
                request: { method: request.method, headers: request.headers },
                response: {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                    contentLength:
                        Number(response.headers['content-length']) || null,
                    contentType: response.headers['content-type'],
                },
                timing: {
                    startTime,
                    endTime: performance.now(),
                    duration: performance.now() - startTime,
                    breakdown: null,
                },
            },
        });

        if (!response.ok) {
            return {
                uri: response.url,
                originalUri: url,
                data: new ArrayBuffer(0),
                headers: response.headers,
                status: response.status,
            };
        }

        const data = await response.arrayBuffer();

        // --- ARCHITECTURAL REFACTOR: LAZY PARSING ---
        // During playback, we no longer perform an expensive deep parse on every segment.
        // The worker's responsibility is now limited to fetching the raw data.
        // The main thread will store this raw data. Parsing will only be triggered
        // on-demand when a user interacts with a segment in the UI.
        if (requestType === SEGMENT_REQUEST_TYPE) {
            self.postMessage({
                type: 'worker:shaka-segment-loaded',
                payload: {
                    uniqueId: url,
                    status: response.status,
                    data,
                    parsedData: null, // Explicitly send null parsedData
                    streamId,
                },
            });
        }
        // --- END REFACTOR ---

        return {
            uri: response.url,
            originalUri: url,
            data,
            headers: response.headers,
            status: response.status,
        };
    } catch (error) {
        if (error.name === 'AbortError') {
            debugLog('shakaResourceHandler', `Fetch aborted for ${url}`);
            throw error;
        }
        debugLog(
            'shakaResourceHandler',
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