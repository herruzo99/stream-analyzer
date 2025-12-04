import { appLog } from '../../../shared/utils/debug.js';
import { inferMediaInfoFromExtension } from '../../parsing/utils/media-types.js';
import { fetchWithAuth } from '../http.js';
import { handleParseSegmentStructure } from '../parsingService.js';

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
            if (request.uris[0].includes('init')) return 'init';
            return ['video', 'audio', 'text'].includes(contentType)
                ? contentType
                : 'video';
        }
        default:
            return 'other';
    }
}

export async function handleShakaResourceFetch(
    {
        request,
        requestType,
        auth,
        streamId,
        segmentUniqueId,
        interventionRules,
    }, // Rules
    signal
) {
    const url = request.uris[0];
    const uniqueIdToUse = segmentUniqueId || url;

    try {
        const body = request.body || null;
        const method = request.method || 'GET';
        const resourceType = mapShakaRequestType(request, requestType);
        const loggingContext = { streamId, resourceType };

        const response = await fetchWithAuth(
            url,
            auth,
            null,
            request.headers,
            body,
            signal,
            loggingContext,
            method,
            interventionRules // Pass rules
        );

        if (!response.ok) {
            return {
                uri: response.url,
                originalUri: url,
                data: new ArrayBuffer(0),
                headers: response.headers,
                status: response.status,
                originalRequest: request,
            };
        }

        const data = await response.arrayBuffer();

        const isMediaSegment = ['video', 'audio', 'text', 'init'].includes(
            resourceType
        );
        if (isMediaSegment) {
            (async () => {
                try {
                    const formatHint =
                        resourceType === 'video' || resourceType === 'audio'
                            ? 'isobmff'
                            : null;
                    const parsedData = await handleParseSegmentStructure({
                        data: data.slice(0),
                        url,
                        formatHint,
                        context: {},
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
                    console.error(`Background parse failed: ${e.message}`);
                }
            })();
        }

        return {
            uri: response.url,
            originalUri: url,
            data,
            headers: response.headers,
            status: response.status,
            originalRequest: request,
        };
    } catch (error) {
        if (error.name === 'AbortError') {
            throw error;
        }
        appLog('shakaResourceHandler', 'error', `Fetch failed: ${url}`, error);

        throw {
            code: 6001, // REQUEST_FAILED
            severity: 2, // CRITICAL
            category: 1, // NETWORK
            data: [url, error.message],
            message: error.message,
        };
    }
}
