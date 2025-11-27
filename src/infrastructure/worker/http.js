import { fetchWithRetry } from '../http/fetch.js';

/**
 * Helper to clone and read a body for logging without consuming the original if possible,
 * or managing the double-read.
 * @param {BodyInit | Response} source
 * @returns {Promise<ArrayBuffer | string | null>}
 */
async function captureBody(source) {
    try {
        if (typeof source === 'string') return source;
        if (source instanceof ArrayBuffer) return source.slice(0);
        if (ArrayBuffer.isView(source))
            return source.buffer.slice(
                source.byteOffset,
                source.byteOffset + source.byteLength
            );
        if (source instanceof Response) {
            // Clone to avoid consuming the stream meant for the caller
            return await source.clone().arrayBuffer();
        }
        return null;
    } catch (_e) {
        return null;
    }
}

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
    const safeLoggingContext = loggingContext || {};

    const headers = new Headers();

    if (auth && auth.headers) {
        auth.headers.forEach((param) => {
            if (param.key) headers.append(param.key, param.value);
        });
    }

    for (const [key, value] of Object.entries(extraHeaders || {})) {
        headers.set(key, value);
    }

    if (range && !headers.has('Range')) {
        headers.set('Range', `bytes=${range}`);
    }

    const effectiveMethod = method || (body ? 'POST' : 'GET');
    if (
        body &&
        effectiveMethod !== 'GET' &&
        !headers.has('Content-Type') &&
        !headers.has('content-type')
    ) {
        headers.set('Content-Type', 'application/octet-stream');
    }

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

    // Determine if we should capture the body for logging (Expensive!)
    const isDrmTraffic =
        safeLoggingContext.resourceType === 'license' ||
        safeLoggingContext.resourceType === 'key';
    const isManifest = safeLoggingContext.resourceType === 'manifest';
    const shouldLogBody = isDrmTraffic || isManifest;

    // Capture Request Body
    let requestBodyForLog = null;
    if (shouldLogBody && body) {
        requestBodyForLog = await captureBody(body);
    }

    const startTime = performance.now();
    const response = await fetchWithRetry(initialUrl.href, options);
    const endTime = performance.now();

    // Capture Response Body
    let responseBodyForLog = null;
    if (shouldLogBody && response.ok) {
        responseBodyForLog = await captureBody(response);
    }

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
                    body: requestBodyForLog, // Pass captured body
                },
                response: {
                    status: response.status,
                    statusText: response.statusText,
                    headers: responseHeaders,
                    contentLength:
                        Number(response.headers.get('content-length')) || null,
                    contentType: response.headers.get('content-type'),
                    body: responseBodyForLog, // Pass captured body
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
