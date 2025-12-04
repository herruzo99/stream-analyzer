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
        // Log blocked request immediately if context is provided
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
        return intervention.response;
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
                // Mark delayed requests in the audit
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
