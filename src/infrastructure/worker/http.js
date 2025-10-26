import { fetchWithRetry } from '@/infrastructure/http/fetch';
import { debugLog } from '@/shared/utils/debug';

async function logRequest(
    response,
    requestStart,
    initialUrl,
    options,
    resourceType,
    streamId
) {
    const responseStart = performance.now();
    // We don't read the body here anymore to avoid consuming it.
    const responseEnd = performance.now();
    debugLog('worker.logRequest', 'Logging network event for:', initialUrl.href);

    /** @type {Record<string, string>} */
    const requestHeaders = {};
    // @ts-ignore
    options.headers.forEach((value, key) => {
        requestHeaders[key] = value;
    });

    /** @type {Record<string, string>} */
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
    });

    /** @type {import('@/types').NetworkEvent} */
    const provisionalEvent = {
        id: crypto.randomUUID(),
        url: response.url,
        resourceType,
        streamId,
        request: {
            method: options.method,
            headers: requestHeaders,
        },
        response: {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
            contentLength: Number(response.headers.get('content-length')) || null,
            contentType: response.headers.get('content-type'),
        },
        timing: {
            startTime: requestStart,
            endTime: responseEnd,
            duration: responseEnd - requestStart,
            breakdown: {
                // This is now a reliable fallback, to be enriched by the main thread
                redirect: 0,
                dns: 0,
                tcp: 0,
                tls: 0,
                ttfb: responseStart - requestStart,
                download: responseEnd - responseStart,
            },
        },
    };

    // Use a different message type to signal this is a provisional event for enrichment
    debugLog('worker.logRequest', 'Posting worker:network-event message to main thread.', provisionalEvent);
    self.postMessage({ type: 'worker:network-event', payload: provisionalEvent });
}

/**
 * Executes a fetch request, applying authentication parameters and logging the transaction.
 * @param {string} url The URL to fetch.
 * @param {import('@/types').AuthInfo} [auth] Optional authentication parameters.
 * @param {import('@/types').ResourceType} [resourceType='other'] The type of resource being fetched.
 * @param {number} [streamId=0] The ID of the stream this request belongs to.
 * @param {string} [range=null] Optional byte range string (e.g., "0-1023").
 * @param {Record<string, string>} [shakaHeaders={}] Headers from the shaka request object.
 * @param {ArrayBuffer} [shakaBody=null] Body from the shaka request object.
 * @returns {Promise<Response>}
 */
export async function fetchWithAuth(
    url,
    auth,
    resourceType = 'other',
    streamId = 0,
    range = null,
    shakaHeaders = {},
    shakaBody = null
) {
    const initialUrl = new URL(url);
    /** @type {RequestInit} */
    const options = {
        method: shakaBody ? 'POST' : 'GET',
        headers: new Headers(),
        mode: 'cors',
        cache: 'no-cache', // Ensure we always revalidate with the server.
        body: shakaBody,
    };

    // Apply headers from Shaka request first
    for (const [key, value] of Object.entries(shakaHeaders)) {
        // @ts-ignore
        options.headers.append(key, value);
    }
    
    // Apply auth headers and query params from our application's config
    if (auth) {
        auth.queryParams?.forEach((param) => {
            if (param.key) {
                initialUrl.searchParams.append(param.key, param.value);
            }
        });
        auth.headers?.forEach((param) => {
            if (param.key) {
                // @ts-ignore
                options.headers.append(param.key, param.value);
            }
        });
    }

    if (range) {
        debugLog('fetchWithAuth', `Applying Range header: bytes=${range}`);
        // @ts-ignore
        options.headers.append('Range', `bytes=${range}`);
    }

    const requestStart = performance.now();
    debugLog('fetchWithAuth', `Initiating fetch for ${initialUrl.href}`, options);
    const response = await fetchWithRetry(initialUrl.href, options);

    const responseForLogging = response.clone();

    logRequest(
        responseForLogging,
        requestStart,
        initialUrl,
        options,
        resourceType,
        streamId
    );

    return response;
}