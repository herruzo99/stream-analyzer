import { fetchWithRetry } from '@/infrastructure/http/fetch';
import { appLog } from '@/shared/utils/debug';

/**
 * Executes a fetch request, applying authentication parameters.
 * This is a simplified, synchronous-style fetch utility for the worker.
 * @param {string} url The URL to fetch.
 * @param {import('@/types').AuthInfo} [auth] Optional authentication parameters.
 * @param {string} [range=null] Optional byte range string (e.g., "0-1023").
 * @param {Record<string, string>} [extraHeaders={}] Additional headers.
 * @param {BodyInit | null} [body=null] Request body.
 * @param {AbortSignal} [signal=null] An AbortSignal to cancel the fetch.
 * @param {object} [loggingContext={}] Optional context for network event logging.
 * @param {number} [loggingContext.streamId]
 * @param {import('@/types').ResourceType} [loggingContext.resourceType]
 * @returns {Promise<{
 *   ok: boolean,
 *   status: number,
 *   statusText: string,
 *   headers: Record<string, string>,
 *   url: string,
 *   arrayBuffer: () => Promise<ArrayBuffer>,
 *   text: () => Promise<string>
 * }>}
 */
export async function fetchWithAuth(
    url,
    auth,
    range = null,
    extraHeaders = {},
    body = null,
    signal = null,
    loggingContext = {}
) {
    const initialUrl = new URL(url);
    /** @type {RequestInit} */
    const options = {
        method: body ? 'POST' : 'GET',
        headers: new Headers(extraHeaders),
        mode: 'cors',
        cache: 'no-cache',
        body,
        signal,
    };

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
        // @ts-ignore
        options.headers.append('Range', `bytes=${range}`);
    }

    appLog(
        'worker.fetchWithAuth',
        'info',
        `Fetching: ${initialUrl.href}`,
        options
    );

    const startTime = performance.now();
    const response = await fetchWithRetry(initialUrl.href, options);
    const endTime = performance.now();

    // --- ARCHITECTURAL REFACTOR: Use explicit context for logging ---
    if (
        loggingContext.streamId !== undefined &&
        loggingContext.resourceType
    ) {
        const responseHeaders = {};
        response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
        });

        const requestHeadersForLogging = {};
        // @ts-ignore
        for (const [key, value] of options.headers.entries()) {
            requestHeadersForLogging[key] = value;
        }

        self.postMessage({
            type: 'worker:network-event',
            payload: {
                id: crypto.randomUUID(),
                url: response.url,
                resourceType: loggingContext.resourceType,
                streamId: loggingContext.streamId,
                request: {
                    method: options.method,
                    headers: requestHeadersForLogging,
                },
                response: {
                    status: response.status,
                    statusText: response.statusText,
                    headers: responseHeaders,
                    contentLength:
                        Number(response.headers.get('content-length')) || null,
                    contentType: response.headers.get('content-type'),
                },
                timing: {
                    startTime,
                    endTime,
                    duration: endTime - startTime,
                    breakdown: null, // To be filled by PerformanceObserver on main thread
                },
            },
        });
    }
    // --- END REFACTOR ---

    /** @type {Record<string, string>} */
    const finalResponseHeaders = {};
    response.headers.forEach((value, key) => {
        finalResponseHeaders[key] = value;
    });

    return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: finalResponseHeaders,
        url: response.url,
        arrayBuffer: () => response.arrayBuffer(),
        text: () => response.text(),
    };
}