import { setupWorker } from 'msw/browser';
import { http, passthrough } from 'msw';

import { useAnalysisStore } from '@/state/analysisStore';
import { appLog } from '@/shared/utils/debug';
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
            resourceType: 'video', // Default assumption for cached segments
        };
    }

    // 2. Heuristic: Match against Stream Base URLs (Fast)
    // Most segments share a prefix with the manifest or a declared BaseURL.
    for (const stream of streams) {
        if (stream.originalUrl === urlString || stream.baseUrl === urlString) {
            return { streamId: stream.id, resourceType: 'manifest' };
        }
        
        // License Server Check
        const licenseUrl = stream.drmAuth?.licenseServerUrl;
        if (licenseUrl) {
            const target = typeof licenseUrl === 'string' ? licenseUrl : Object.values(licenseUrl)[0];
            if (target && urlString.startsWith(target)) {
                return { streamId: stream.id, resourceType: 'license' };
            }
        }
        
        // Base Path Matching
        // If the request URL starts with the stream's base path, assign it to that stream.
        const basePath = stream.baseUrl ? stream.baseUrl.substring(0, stream.baseUrl.lastIndexOf('/')) : '';
        if (basePath && urlString.startsWith(basePath)) {
            // Refine type based on extension
            let type = 'video';
            if (urlString.includes('.m4a') || urlString.includes('audio')) type = 'audio';
            else if (urlString.includes('.vtt') || urlString.includes('subs')) type = 'text';
            else if (urlString.includes('init')) type = 'init';
            
            return { streamId: stream.id, resourceType: type };
        }
    }

    // 3. Fallback: Deep Scan (Slow)
    // Only do this if we really haven't matched yet.
    // Using a basic find is better than flatMap for performance (stops early).
    for (const stream of streams) {
        // Check DASH State
        for (const repState of stream.dashRepresentationState.values()) {
            const found = repState.segments.find(s => s.resolvedUrl === urlString);
            if (found) return { streamId: stream.id, resourceType: 'video' };
        }
        // Check HLS State
        for (const varState of stream.hlsVariantState.values()) {
            const found = varState.segments.find(s => s.resolvedUrl === urlString);
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
        http.all('*', ({ request }) => {
            const url = new URL(request.url);

            // CRITICAL: Return undefined to let the browser handle it natively.
            // Do NOT use passthrough() for ignored hosts, as that still routes
            // traffic through the Service Worker context, causing CORS issues.
            if (shouldBypass(url)) {
                return undefined;
            }

            // For everything else (potential streams), use passthrough to observe it.
            return passthrough();
        }),
    ];

    const worker = setupWorker(...handlers);

    // Use the 'response:bypass' lifecycle event to log requests non-intrusively.
    // This fires after the response is received.
    worker.events.on('response:bypass', ({ response, request }) => {
        const urlString = request.url;
        
        // Re-check bypass logic to ensure we don't log noise
        try {
            if (shouldBypass(new URL(urlString))) return;
        } catch { return; }

        const { streams } = useAnalysisStore.getState();
        const { streamId, resourceType } = classifyRequest(urlString, streams);

        // If we can't associate it with a stream, and it's not explicitly interesting, skip logging
        if (streamId === null && resourceType === 'other') {
            return;
        }

        // Performance: Do NOT clone/read body for large binary files.
        // Just trust Content-Length or estimate 0.
        const contentLengthHeader = response.headers.get('content-length');
        const contentLength = contentLengthHeader
            ? parseInt(contentLengthHeader, 10)
            : 0;

        // Convert Headers to plain object
        const responseHeaders = {};
        response.headers.forEach((val, key) => { responseHeaders[key] = val; });
        
        const requestHeaders = {};
        request.headers.forEach((val, key) => { requestHeaders[key] = val; });

        const eventPayload = {
            id: crypto.randomUUID(),
            url: urlString,
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
                startTime: performance.now(), // Approximate, enriched later by PerformanceObserver
                endTime: performance.now(),
                duration: 0,
                breakdown: null,
            },
        };

        networkActions.logEvent(eventPayload);
    });

    try {
        await worker.start({
            onUnhandledRequest: 'bypass', // Strict fallback: Browser handles anything we missed
            quiet: true,
        });
        appLog('GlobalRequestInterceptor', 'info', 'MSW active (Low-Overhead Mode).');
    } catch (error) {
        console.error('Failed to start MSW:', error);
    }
}