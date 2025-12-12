import { secureRandom } from '@/shared/utils/random.js';
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

function classifyResource(url, resourceType) {
    // Use explicit type if provided, otherwise infer
    if (resourceType) return resourceType;
    const lower = url.toLowerCase();
    if (lower.includes('.mpd') || lower.includes('.m3u8')) return 'manifest';
    if (lower.includes('license') || lower.includes('key')) return 'license';
    return 'video'; // Default assumption for high-traffic worker requests
}

/**
 * Applies Chaos Tools interventions.
 * @returns {Promise<{action: 'block'|'delay'|'none', response?: object, delayMs?: number}>}
 */
async function applyInterventions(
    url,
    method,
    interventionRules,
    resourceType
) {
    if (!interventionRules || interventionRules.length === 0)
        return { action: 'none' };

    const classification = classifyResource(url, resourceType);

    for (const rule of interventionRules) {
        if (!rule.enabled) continue;
        if (rule.resourceType !== 'all' && rule.resourceType !== classification)
            continue;

        let match = false;
        try {
            const regex = new RegExp(rule.urlPattern, 'i');
            match = regex.test(url);
        } catch (_e) {
            match = url.includes(rule.urlPattern);
        }

        // Empty pattern matches everything
        if (!rule.urlPattern) match = true;

        if (!match) continue;

        const probability =
            rule.params.probability !== undefined
                ? rule.params.probability
                : 100;
        const roll = secureRandom() * 100;
        if (roll > probability) continue;

        // Rule Matched
        if (rule.action === 'block') {
            return {
                action: 'block',
                response: {
                    ok: false,
                    status: rule.params.statusCode || 404,
                    statusText: `Blocked by Rule: ${rule.label}`,
                    // ARCHITECTURAL FIX: Must use plain object for headers to be Transferable via postMessage
                    headers: { 'x-intervention': rule.label },
                    url: url,
                    arrayBuffer: async () => new ArrayBuffer(0),
                    text: async () => '',
                },
            };
        }

        if (rule.action === 'delay') {
            return {
                action: 'delay',
                delayMs: rule.params.delayMs || 2000,
            };
        }
    }

    return { action: 'none' };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Reads a specific number of bytes from a ReadableStream and then cancels the stream.
 * Used for manual range extraction when server returns 200 OK.
 * @param {ReadableStream} stream
 * @param {number} length
 * @returns {Promise<ArrayBuffer>}
 */
async function readPartialStream(stream, length) {
    const reader = stream.getReader();
    const chunks = [];
    let receivedLength = 0;

    try {
        while (receivedLength < length) {
            const { done, value } = await reader.read();
            if (done) break;

            chunks.push(value);
            receivedLength += value.length;
        }

        // Concatenate chunks
        const result = new Uint8Array(Math.min(receivedLength, length));
        let position = 0;
        for (const chunk of chunks) {
            const bytesToCopy = Math.min(
                chunk.length,
                result.length - position
            );
            result.set(chunk.subarray(0, bytesToCopy), position);
            position += bytesToCopy;
        }

        return result.buffer;
    } finally {
        reader.cancel('Manual range read complete');
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
    method = null,
    interventionRules = []
) {
    const initialUrl = new URL(url);
    const safeLoggingContext = loggingContext || {};

    // --- 1. Apply Interventions ---
    const intervention = await applyInterventions(
        url,
        method || 'GET',
        interventionRules,
        safeLoggingContext.resourceType
    );

    if (intervention.action === 'block' && intervention.response) {
        if (safeLoggingContext.streamId !== undefined) {
            self.postMessage({
                type: 'worker:network-event',
                payload: {
                    id: crypto.randomUUID(),
                    url: url,
                    resourceType: safeLoggingContext.resourceType,
                    streamId: safeLoggingContext.streamId,
                    request: {
                        method: method || 'GET',
                        headers: extraHeaders,
                        body: null,
                    },
                    response: {
                        status: intervention.response.status,
                        statusText: intervention.response.statusText,
                        headers: intervention.response.headers,
                        contentLength: 0,
                        contentType: '',
                        body: null,
                    },
                    timing: {
                        startTime: performance.now(),
                        endTime: performance.now(),
                        duration: 0,
                        breakdown: null,
                    },
                    auditStatus: 'error',
                    auditIssues: [
                        {
                            id: 'intervention',
                            level: 'error',
                            message: `Blocked by rule`,
                        },
                    ],
                },
            });
        }
        // Force cast to satisfy caller expecting Response-like object
        return /** @type {Response} */ (intervention.response);
    }

    if (intervention.action === 'delay' && intervention.delayMs) {
        await sleep(intervention.delayMs);
    }
    // --- End Interventions ---

    const headers = new Headers();

    if (auth && auth.headers) {
        auth.headers.forEach((param) => {
            if (param.key) headers.append(param.key, param.value);
        });
    }

    for (const [key, value] of Object.entries(extraHeaders || {})) {
        headers.set(key, value);
    }

    // --- ARCHITECTURAL FIX: Parse Range ---
    // If range is provided, calculate expected length for manual slicing fallback
    let expectedLength = 0;
    let rangeStart = 0;

    if (range) {
        if (!headers.has('Range')) {
            headers.set('Range', `bytes=${range}`);
        }
        const parts = range.split('-');
        rangeStart = parseInt(parts[0], 10);
        const rangeEnd = parseInt(parts[1], 10);
        if (!isNaN(rangeStart) && !isNaN(rangeEnd)) {
            expectedLength = rangeEnd - rangeStart + 1;
        }
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

    // --- ARCHITECTURAL FIX: Handle 200 OK on Range Request ---
    // If we requested a range but got 200 OK (full file), use the stream reader
    // to read only the requested bytes and abort the rest to save bandwidth/memory.
    let responseProxy = response;
    let manualArrayBuffer = null;

    if (range && response.status === 200 && response.body) {
        const contentLength = Number(response.headers.get('content-length'));
        // Only intervene if the content length suggests we got way more than we asked for
        // (e.g. > 2x expected) or if content-length is missing.
        if (!contentLength || contentLength > expectedLength * 2) {
            console.warn(
                `[Network] Server ignored Range header for ${url}. Manual slicing active. Requested: ${expectedLength} bytes.`
            );

            // We create a proxy for arrayBuffer() to implement the manual read/cancel
            manualArrayBuffer = async () => {
                // FIXED: Removed the second getReader() call to prevent locking error
                try {
                    // For efficiency, we only support this optimization if rangeStart is 0 or small,
                    // OR we accept the read penalty. For analysis, saving 200MB download is worth reading 3KB header.

                    // We read until we cover the requested range (0...rangeEnd)
                    // If rangeStart > 0, we still have to download the bytes before it,
                    // but we discard them from the final buffer.
                    // IMPORTANT: We abort the download immediately after `rangeEnd`.

                    const neededLength = rangeStart + expectedLength;
                    const fullData = await readPartialStream(
                        response.body,
                        neededLength
                    );

                    // Slice out the exact requested range
                    return fullData.slice(
                        rangeStart,
                        rangeStart + expectedLength
                    );
                } catch (e) {
                    console.error('Manual range read failed', e);
                    throw e;
                }
            };

            responseProxy = /** @type {Response} */ ({
                ok: response.ok,
                status: 206, // Fake 206 for the caller logic
                statusText: 'Partial Content (Manual)',
                headers: response.headers,
                url: response.url,
                arrayBuffer: manualArrayBuffer,
                text: async () => {
                    const buf = await manualArrayBuffer();
                    return new TextDecoder().decode(buf);
                },
            });
        }
    }

    // Capture Response Body
    let responseBodyForLog = null;
    if (shouldLogBody && responseProxy.ok) {
        // We skip logging body for manually handled ranges to avoid double-read complexity
        if (!manualArrayBuffer) {
            responseBodyForLog = await captureBody(response.clone());
        } else {
            responseBodyForLog = '[Manual Range - Body Omitted]';
        }
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
                    body: requestBodyForLog,
                },
                response: {
                    status: responseProxy.status, // Log the effective status (e.g. 206)
                    statusText: responseProxy.statusText,
                    headers: responseHeaders,
                    contentLength:
                        Number(response.headers.get('content-length')) || null,
                    contentType: response.headers.get('content-type'),
                    body: responseBodyForLog,
                },
                timing: {
                    startTime,
                    endTime,
                    duration: endTime - startTime,
                    breakdown: null,
                },
                auditStatus:
                    intervention.action === 'delay' ? 'warn' : undefined,
                auditIssues:
                    intervention.action === 'delay'
                        ? [
                              {
                                  id: 'intervention',
                                  level: 'warn',
                                  message: `Delayed by ${intervention.delayMs}ms`,
                              },
                          ]
                        : [],
            },
        });
    }

    const finalResponseHeaders = {};
    response.headers.forEach((value, key) => {
        finalResponseHeaders[key] = value;
    });

    // Force cast the proxy to Response to satisfy TS return type,
    // assuming the consumer only uses the implemented methods.
    return /** @type {Response} */ ({
        ok: responseProxy.ok,
        status: responseProxy.status,
        statusText: responseProxy.statusText,
        headers: finalResponseHeaders,
        url: responseProxy.url,
        arrayBuffer: () => responseProxy.arrayBuffer(),
        text: () => responseProxy.text(),
    });
}
