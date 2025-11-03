import { fetchWithAuth } from '../http.js';
import { inferMediaInfoFromExtension } from '@/infrastructure/parsing/utils/media-types';
import { debugLog } from '@/shared/utils/debug';
import shaka from 'shaka-player/dist/shaka-player.compiled';
import { handleParseSegmentStructure } from '../parsingService.js';

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
            if (request.uris[0].includes('init')) {
                return 'init';
            }
            return ['video', 'audio', 'text'].includes(contentType)
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
 * @param {shaka.extern.Manifest} payload.shakaManifest The shaka player manifest object.
 * @param {string} payload.segmentUniqueId The canonical unique ID for the segment.
 * @param {AbortSignal} signal - The AbortSignal for the operation.
 * @returns {Promise<shaka.extern.Response>}
 */
export async function handleShakaResourceFetch(
    { request, requestType, auth, streamId, segmentUniqueId },
    signal
) {
    const NETWORK_ERROR = 6001;
    const NETWORK_CATEGORY = 1;
    const CRITICAL_SEVERITY = 2;
    const url = request.uris[0];
    const uniqueIdToUse = segmentUniqueId || url;

    debugLog('shakaResourceHandler', `Fetching resource from network: ${url}.`);

    try {
        const body = /** @type {BodyInit | null} */ (request.body || null);

        const response = await fetchWithAuth(
            url,
            auth,
            null,
            request.headers,
            body,
            signal,
            {
                // Provide context for the network logger
                streamId,
                resourceType: mapShakaRequestType(request, requestType),
            }
        );

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

        // --- ARCHITECTURAL FIX: Non-blocking segment caching with canonical ID ---
        (async () => {
            try {
                const resourceType = mapShakaRequestType(request, requestType);
                const formatHint =
                    resourceType === 'video' || resourceType === 'audio'
                        ? 'isobff'
                        : null;
                const parsedData = await handleParseSegmentStructure({
                    data: data.slice(0),
                    url,
                    formatHint,
                });

                self.postMessage({
                    type: 'worker:shaka-segment-loaded',
                    payload: {
                        uniqueId: uniqueIdToUse,
                        streamId,
                        data: data.slice(0),
                        parsedData,
                        status: response.status,
                    },
                });
            } catch (e) {
                console.error(
                    `[shakaResourceHandler] Background segment parse failed for ${url}:`,
                    e
                );
            }
        })();
        // --- END FIX ---

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
