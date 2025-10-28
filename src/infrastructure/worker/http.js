import { fetchWithRetry } from '@/infrastructure/http/fetch';
import { debugLog } from '@/shared/utils/debug';

/**
 * Executes a fetch request, applying authentication parameters.
 * This is a simplified, synchronous-style fetch utility for the worker.
 * @param {string} url The URL to fetch.
 * @param {import('@/types').AuthInfo} [auth] Optional authentication parameters.
 * @param {string} [range=null] Optional byte range string (e.g., "0-1023").
 * @param {Record<string, string>} [extraHeaders={}] Additional headers.
 * @param {ArrayBuffer} [body=null] Request body.
 * @param {AbortSignal} [signal=null] An AbortSignal to cancel the fetch.
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
    signal = null
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

    debugLog('worker.fetchWithAuth', `Fetching: ${initialUrl.href}`, options);
    const response = await fetchWithRetry(initialUrl.href, options);

    /** @type {Record<string, string>} */
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
    });

    // Return a unified response object, deferring body reading to the caller.
    return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        url: response.url,
        arrayBuffer: () => response.arrayBuffer(),
        text: () => response.text(),
    };
}