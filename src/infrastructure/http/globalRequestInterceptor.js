import { setupWorker } from 'msw/browser';
import { http, passthrough } from 'msw';

import { useAnalysisStore } from '@/state/analysisStore';
import { appLog } from '@/shared/utils/debug';
import { networkActions } from '@/state/networkStore';

/**
 * Intelligently classifies a request by checking it against the current application state.
 * @param {Request} request The intercepted request object.
 * @returns {{ streamId: number | null, resourceType: import('@/types').ResourceType, auth: import('@/types').AuthInfo | null }}
 */
function classifyRequest(request) {
    const { streams } = useAnalysisStore.getState();
    const url = request.url;

    for (const stream of streams) {
        // Check if it's the manifest URL
        if (stream.originalUrl === url || stream.baseUrl === url) {
            return {
                streamId: stream.id,
                resourceType: 'manifest',
                auth: stream.auth,
            };
        }

        // Check if it's a known license server URL
        const licenseUrls = stream.drmAuth?.licenseServerUrl;
        if (licenseUrls) {
            const urlsToCheck =
                typeof licenseUrls === 'string'
                    ? [licenseUrls]
                    : Object.values(licenseUrls);
            if (urlsToCheck.some((licenseUrl) => url.startsWith(licenseUrl))) {
                return {
                    streamId: stream.id,
                    resourceType: 'license',
                    auth: stream.auth,
                };
            }
        }

        // Check if it's a known segment
        const allSegments = [
            ...Array.from(stream.dashRepresentationState.values()).flatMap(
                (s) => s.segments || []
            ),
            ...Array.from(stream.hlsVariantState.values()).flatMap(
                (s) => s.segments || []
            ),
        ];

        const matchedSegment = allSegments.find(
            (s2) => s2 && s2.resolvedUrl === url
        );
        if (matchedSegment) {
            let resourceType = 'video'; // Default
            if (matchedSegment.type === 'Init') {
                resourceType = 'init';
            } else {
                const repId = matchedSegment.repId;
                const as = stream.manifest.periods
                    .flatMap((p) => p.adaptationSets)
                    .find((as) =>
                        as.representations.some((r) => r.id === repId)
                    );
                if (as) {
                    if (as.contentType === 'audio') resourceType = 'audio';
                    if (as.contentType === 'text') resourceType = 'text';
                }
            }
            return {
                streamId: stream.id,
                resourceType: /** @type {import('@/types').ResourceType} */ (
                    resourceType
                ),
                auth: stream.auth,
            };
        }
    }

    // If no match found, it's 'other'
    return { streamId: null, resourceType: 'other', auth: null };
}

/**
 * Initializes a global request interceptor using Mock Service Worker (MSW).
 * This interceptor is now STATE-AWARE. It queries the analysisStore to add
 * context to requests that originate outside our controlled fetch paths.
 */
export async function initializeGlobalRequestInterceptor() {
    appLog(
        'GlobalRequestInterceptor',
        'info',
        'Initializing MSW for network logging...'
    );

    const handlers = [http.all('*', () => passthrough())];
    const worker = setupWorker(...handlers);

    worker.events.on('response:bypass', async ({ response, request }) => {
        // ARCHITECTURAL FIX: Ignore same-origin requests to avoid logging app assets.
        if (new URL(request.url).origin === self.location.origin) {
            return;
        }

        const { urlAuthMap } = useAnalysisStore.getState();
        if (urlAuthMap.has(request.url)) {
            return;
        }

        appLog(
            'GlobalRequestInterceptor',
            'info',
            'Intercepted a request not handled by other loggers:',
            request.url
        );

        const { streamId, resourceType } = classifyRequest(request);

        if (streamId !== null) {
            appLog(
                'GlobalRequestInterceptor',
                'info',
                'Ignoring request as it will be logged by a specific handler.',
                request.url
            );
            return;
        }

        const responseClone = response.clone();
        /** @type {Record<string, string>} */
        const responseHeaders = {};
        responseClone.headers.forEach((value, key) => {
            responseHeaders[key] = value;
        });

        /** @type {Record<string, string>} */
        const requestHeaders = {};
        request.headers.forEach((value, key) => {
            requestHeaders[key] = value;
        });

        const contentLengthHeader = responseClone.headers.get('content-length');
        const contentLength = contentLengthHeader
            ? parseInt(contentLengthHeader, 10)
            : (await responseClone.arrayBuffer()).byteLength;

        const eventPayload = {
            id: crypto.randomUUID(),
            url: request.url,
            resourceType: resourceType,
            streamId: streamId,
            request: {
                method: request.method,
                headers: requestHeaders,
            },
            response: {
                status: response.status,
                statusText: response.statusText,
                headers: responseHeaders,
                contentLength: contentLength,
                contentType: response.headers.get('content-type') || '',
            },
            timing: {
                startTime: performance.now(), // Approximate
                endTime: performance.now(),
                duration: 0,
                breakdown: null,
            },
        };

        networkActions.logEvent(eventPayload);
    });

    try {
        await worker.start({
            onUnhandledRequest: 'bypass',
            quiet: true,
        });
        appLog('GlobalRequestInterceptor', 'info', 'MSW started successfully.');
    } catch (error) {
        console.error('Failed to start MSW for network interception:', error);
    }
}
