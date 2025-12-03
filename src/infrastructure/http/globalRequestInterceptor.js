import { http, passthrough } from 'msw';
import { setupWorker } from 'msw/browser';

import { appLog } from '@/shared/utils/debug';
import { useAnalysisStore } from '@/state/analysisStore';
import { networkActions } from '@/state/networkStore';

// --- Configuration ---

const IGNORED_HOSTS = new Set([
    'fonts.gstatic.com',
    'fonts.googleapis.com',
    'cdn.jsdelivr.net',
    'js-de.sentry-cdn.com',
    'www.googletagmanager.com',
    'clarity.ms',
]);

const IGNORED_EXTENSIONS = new Set([
    '.js',
    '.css',
    '.png',
    '.svg',
    '.ico',
    '.woff',
    '.woff2',
    '.ttf',
    '.json', // Internal app assets
]);

/**
 * Determines if a URL should be completely ignored by MSW (Native Bypass).
 * @param {URL} url
 * @returns {boolean}
 */
function shouldBypass(url) {
    // 1. Ignore App Internals (Same Origin Assets)
    if (url.origin === self.location.origin) {
        // Exception: We might want to log local streams if user loaded a file via blob
        if (url.protocol === 'blob:') return false;
        return true;
    }

    // 2. Ignore Known External Hosts
    if (IGNORED_HOSTS.has(url.hostname)) return true;

    // 3. Ignore Static Assets via Extension
    const pathname = url.pathname.toLowerCase();
    for (const ext of IGNORED_EXTENSIONS) {
        if (pathname.endsWith(ext)) return true;
    }

    return false;
}

/**
 * Optimized classification. Avoids iterating all segments for every request.
 * @param {string} urlString
 * @param {import('@/types').Stream[]} streams
 * @returns {{ streamId: number | null, resourceType: import('@/types').ResourceType }}
 */
function classifyRequest(urlString, streams) {
    // 1. Fast Lookup: Check if we have explicitly mapped this URL (e.g. from Shaka plugin)
    const { urlAuthMap } = useAnalysisStore.getState();
    if (urlAuthMap.has(urlString)) {
        const ctx = urlAuthMap.get(urlString);
        return {
            streamId: ctx.streamId,
            resourceType: 'video', // Default assumption for cached segments, refined if needed
        };
    }

    // 2. Heuristic: Match against Stream Base URLs (Fast)
    for (const stream of streams) {
        if (stream.originalUrl === urlString || stream.baseUrl === urlString) {
            return { streamId: stream.id, resourceType: 'manifest' };
        }

        // License Server Check
        const licenseUrl = stream.drmAuth?.licenseServerUrl;
        if (licenseUrl) {
            const target =
                typeof licenseUrl === 'string'
                    ? licenseUrl
                    : Object.values(licenseUrl)[0];
            if (target && urlString.startsWith(target)) {
                return { streamId: stream.id, resourceType: 'license' };
            }
        }

        // Base Path Matching
        const basePath = stream.baseUrl
            ? stream.baseUrl.substring(0, stream.baseUrl.lastIndexOf('/'))
            : '';
        if (basePath && urlString.startsWith(basePath)) {
            let type = 'video';
            if (urlString.includes('.m4a') || urlString.includes('audio'))
                type = 'audio';
            else if (urlString.includes('.vtt') || urlString.includes('subs'))
                type = 'text';
            else if (urlString.includes('init')) type = 'init';
            else if (urlString.includes('.key')) type = 'key'; // HLS Key

            return {
                streamId: stream.id,
                resourceType: /** @type {import('@/types').ResourceType} */ (
                    type
                ),
            };
        }
    }

    // 3. Fallback: Deep Scan (Slow)
    for (const stream of streams) {
        // Check DASH State
        for (const repState of stream.dashRepresentationState.values()) {
            const found = repState.segments.find(
                (s) => s.resolvedUrl === urlString
            );
            if (found) return { streamId: stream.id, resourceType: 'video' };
        }
        // Check HLS State
        for (const varState of stream.hlsVariantState.values()) {
            const found = varState.segments.find(
                (s) => s.resolvedUrl === urlString
            );
            if (found) return { streamId: stream.id, resourceType: 'video' };
        }
    }

    return { streamId: null, resourceType: 'other' };
}

/**
 * Initializes a robust, low-overhead global request interceptor.
 */
export async function initializeGlobalRequestInterceptor() {
    appLog('GlobalRequestInterceptor', 'info', 'Initializing optimized MSW...');

    const handlers = [
        http.all('*', async ({ request }) => {
            const url = new URL(request.url);

            if (shouldBypass(url)) {
                return undefined;
            }

            // ARCHITECTURAL FIX: For external assets that cause CORS/SW issues, we bypass manually
            if (
                url.hostname.endsWith('fonts.gstatic.com') ||
                url.hostname.endsWith('fonts.googleapis.com') ||
                url.hostname === 'cdn.jsdelivr.net' ||
                url.hostname === 'js-de.sentry-cdn.com' ||
                url.hostname === 'www.googletagmanager.com' ||
                request.destination === 'font'
            ) {
                try {
                    const response = await fetch(request.url, {
                        method: 'GET',
                        mode: 'cors',
                        credentials: 'omit',
                        cache: 'default',
                    });
                    return response;
                } catch (_e) {
                    return new Response(null, {
                        status: 404,
                        statusText: 'Not Found (Interceptor Fallback)',
                    });
                }
            }

            return passthrough();
        }),
    ];

    const worker = setupWorker(...handlers);

    worker.events.on('response:bypass', async ({ response, request }) => {
        const urlString = request.url;

        try {
            if (shouldBypass(new URL(urlString))) return;
        } catch {
            return;
        }

        const { streams } = useAnalysisStore.getState();
        const { streamId, resourceType } = classifyRequest(urlString, streams);

        if (streamId === null && resourceType === 'other') {
            return;
        }

        const contentLengthHeader = response.headers.get('content-length');
        const contentLength = contentLengthHeader
            ? parseInt(contentLengthHeader, 10)
            : 0;
        const contentType = response.headers.get('content-type') || '';

        /** @type {Record<string, string>} */
        const responseHeaders = {};
        response.headers.forEach((val, key) => {
            responseHeaders[key] = val;
        });

        /** @type {Record<string, string>} */
        const requestHeaders = {};
        request.headers.forEach((val, key) => {
            requestHeaders[key] = val;
        });

        // --- BODY CAPTURE LOGIC ---
        // Only capture bodies for specific types to avoid performance hit
        let requestBody = null;
        let responseBody = null;

        // Updated Logic: Always capture text-based manifests, keys, licenses, and small JSON
        const isManifestLike =
            resourceType === 'manifest' ||
            contentType.includes('xml') ||
            contentType.includes('mpegurl') ||
            contentType.includes('dash+xml');

        const shouldCapture =
            isManifestLike ||
            resourceType === 'license' ||
            resourceType === 'key' ||
            (contentType.includes('json') && contentLength < 50000);

        if (shouldCapture) {
            if (!request.bodyUsed) {
                try {
                    requestBody = await request.clone().arrayBuffer();
                } catch (_e) {
                    // Ignore body errors
                }
            }
            try {
                // Ensure we clone before reading
                responseBody = await response.clone().arrayBuffer();
            } catch (e) {
                console.warn('Failed to capture body', e);
            }
        }

        const eventPayload = {
            id: crypto.randomUUID(),
            url: urlString,
            resourceType: resourceType,
            streamId: streamId,
            request: {
                method: request.method,
                headers: requestHeaders,
                body: requestBody,
            },
            response: {
                status: response.status,
                statusText: response.statusText,
                headers: responseHeaders,
                contentLength: contentLength,
                contentType: contentType,
                body: responseBody,
            },
            timing: {
                startTime: performance.now(),
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
        appLog(
            'GlobalRequestInterceptor',
            'info',
            'MSW active (Low-Overhead Mode).'
        );
    } catch (error) {
        console.error('Failed to start MSW:', error);
    }
}
