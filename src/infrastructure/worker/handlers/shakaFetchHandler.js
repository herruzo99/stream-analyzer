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
 * @returns {Promise<{data: ArrayBuffer, headers: Record<string, string>, url: string}>}
 */
export async function handleShakaFetch({
    request,
    requestType,
    auth,
    streamId,
}) {
    const SEGMENT_REQUEST_TYPE = 1;

    const url = request.uris[0];
    const resourceType = mapShakaRequestType(request, requestType);

    const response = await fetchWithAuth(url, auth, resourceType, streamId);
    if (!response.ok) {
        throw new Error(`HTTP error ${response.status} for ${url}`);
    }

    /** @type {Record<string, string>} */
    const headers = {};
    response.headers.forEach((value, key) => {
        headers[key] = value;
    });

    // --- CORRECTED LOGIC ---
    // Revert to the simplest approach. Shaka Player's parsers are responsible
    // for interpreting the raw ArrayBuffer, whether it's binary data or text.
    // Our job is simply to provide that raw buffer.
    const data = await response.arrayBuffer();

    // If it's a segment, parse it and notify the main thread to cache it.
    if (requestType === SEGMENT_REQUEST_TYPE) {
        const parsedData = await parseSegment({ data, url });
        // Fire-and-forget message to main thread
        self.postMessage({
            type: 'worker:shaka-segment-loaded',
            payload: {
                uniqueId: url, // Shaka uses the raw URL as the key
                status: 200,
                data,
                parsedData,
            },
        });
    }
    // --- END CORRECTED LOGIC ---

    return {
        data,
        headers,
        url: response.url, // The final URL after any redirects
    };
}