import { fetchWithAuth } from '../http.js';
import { inferMediaInfoFromExtension } from '@/infrastructure/parsing/utils/media-types';
import { parseSegment } from './segmentParsingHandler.js';

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
            const { contentType } = inferMediaInfoFromExtension(request.uris[0]);
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
 * @param {object} payload
 * @param {object} payload.request The simplified, serializable request object.
 * @param {number} payload.requestType The request type enum value.
 * @param {import('@/types').AuthInfo} payload.auth Authentication info.
 * @param {number} payload.streamId The ID of the stream.
 * @returns {Promise<shaka.extern.Response>}
 */
export async function handleShakaFetch({
    request,
    requestType,
    auth,
    streamId,
}) {
    // Enum values from shaka.net.NetworkingEngine.RequestType for clarity
    const MANIFEST_REQUEST_TYPE = 0;
    const SEGMENT_REQUEST_TYPE = 1;

    const url = request.uris[0];
    const resourceType = mapShakaRequestType(request, requestType);

    const response = await fetchWithAuth(url, auth, resourceType, streamId);
    if (!response.ok) {
        // Shaka expects a specific error structure for network failures.
        const error = new Error(`HTTP error ${response.status} for ${url}`);
        // @ts-ignore
        error.shakaErrorCode = 6001; // shaka.util.Error.Code.HTTP_ERROR
        // @ts-ignore
        error.data = [url, response, request, requestType, null];
        throw error;
    }

    /** @type {Record<string, string>} */
    const headers = {};
    response.headers.forEach((value, key) => {
        headers[key] = value;
    });

    let data;
    if (requestType === MANIFEST_REQUEST_TYPE) {
        const manifestText = await response.text();
        data = new TextEncoder().encode(manifestText).buffer;
    } else {
        data = await response.arrayBuffer();
    }

    if (requestType === SEGMENT_REQUEST_TYPE) {
        try {
            const parsedData = await parseSegment({ data: data.slice(0), url });
            self.postMessage({
                type: 'worker:shaka-segment-loaded',
                payload: {
                    uniqueId: url,
                    status: response.status,
                    data,
                    parsedData,
                },
            });
        } catch(e) {
            console.error(`[Worker] Failed to parse Shaka-loaded segment ${url}:`, e);
        }
    }

    // --- ARCHITECTURAL CORRECTION ---
    // The returned object MUST conform to the shaka.extern.Response interface.
    // This includes `uri`, `originalUri`, `data`, and `headers`.
    return {
        uri: response.url,      // The final URL after any redirects.
        originalUri: url,       // The URL originally requested.
        data: data,             // The ArrayBuffer containing the data.
        headers: headers,       // The response headers.
        fromCache: !!response.headers.get('X-Cache'), // Optional but good practice.
    };
    // --- END CORRECTION ---
}