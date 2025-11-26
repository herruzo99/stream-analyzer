import { fetchWithRetry } from '../http/fetch.js';
import { appLog } from '../../shared/utils/debug.js';

/**
 * Executes a fetch request, applying authentication parameters.
 * @param {string} url The URL to fetch.
 * @param {import('@/types').AuthInfo} [auth] Optional authentication parameters.
 * @param {string} [range=null] Optional byte range string.
 * @param {Record<string, string>} [extraHeaders={}] Additional headers from Shaka.
 * @param {BodyInit | null} [body=null] Request body.
 * @param {AbortSignal} [signal=null] An AbortSignal.
 * @param {object} [loggingContext={}] Optional context for logging.
 * @param {string} [method=null] Explicit HTTP method.
 */
export async function fetchWithAuth(
    url,
    auth,
    range = null,
    extraHeaders = {},
    body = null,
    signal = null,
    loggingContext = {},
    method = null
) {
    const initialUrl = new URL(url);

    // FAILSAFE: Handle explicit null passed for loggingContext
    const safeLoggingContext = loggingContext || {};

    // Merge headers: extraHeaders (from Shaka) take precedence over auth headers
    const headers = new Headers();

    // 1. Apply Auth Headers
    if (auth && auth.headers) {
        auth.headers.forEach((param) => {
            if (param.key) headers.append(param.key, param.value);
        });
    }

    // 2. Apply Shaka Headers (e.g. Content-Type, Range, License headers)
    for (const [key, value] of Object.entries(extraHeaders || {})) {
        headers.set(key, value);
    }

    // 3. Apply Range Param (if not already in extraHeaders)
    if (range && !headers.has('Range')) {
        headers.set('Range', `bytes=${range}`);
    }

    // 4. FIX: Auto-detect Content-Type for binary uploads if missing
    // Browsers do not set Content-Type for ArrayBuffer bodies automatically.
    const effectiveMethod = method || (body ? 'POST' : 'GET');
    if (
        body &&
        effectiveMethod !== 'GET' &&
        !headers.has('Content-Type') &&
        !headers.has('content-type')
    ) {
        headers.set('Content-Type', 'application/octet-stream');
    }

    // 5. Apply Query Params
    if (auth && auth.queryParams) {
        auth.queryParams.forEach((param) => {
            if (param.key)
                initialUrl.searchParams.append(param.key, param.value);
        });
    }

    /** @type {RequestInit} */
    const options = {
        method: effectiveMethod,
        headers: headers,
        mode: 'cors',
        cache: 'no-cache',
        body,
        signal,
    };

    appLog(
        'worker.fetchWithAuth',
        'info',
        `Fetching: ${initialUrl.href} [${options.method}]`,
        {
            headers: Object.fromEntries(headers.entries()),
            bodySize: body
                ? /** @type {any} */ (body).byteLength ||
                  /** @type {any} */ (body).length
                : 0,
        }
    );

    const startTime = performance.now();
    const response = await fetchWithRetry(initialUrl.href, options);
    const endTime = performance.now();

    // Logging logic
    if (
        safeLoggingContext.streamId !== undefined &&
        safeLoggingContext.resourceType
    ) {
        const responseHeaders = {};
        response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
        });

        const requestHeadersLog = {};
        headers.forEach((value, key) => {
            requestHeadersLog[key] = value;
        });

        self.postMessage({
            type: 'worker:network-event',
            payload: {
                id: crypto.randomUUID(),
                url: response.url,
                resourceType: safeLoggingContext.resourceType,
                streamId: safeLoggingContext.streamId,
                request: {
                    method: options.method,
                    headers: requestHeadersLog,
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
                    breakdown: null,
                },
            },
        });
    }

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
