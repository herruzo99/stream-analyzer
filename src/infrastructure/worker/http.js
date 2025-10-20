import { fetchWithRetry } from '@/infrastructure/http/fetch';

/**
 * Extracts detailed timing from a PerformanceResourceTiming entry.
 * @param {PerformanceResourceTiming} entry The performance entry.
 * @returns {import('@/types').TimingBreakdown}
 */
function getTimingBreakdown(entry) {
    return {
        dns: entry.domainLookupEnd - entry.domainLookupStart,
        tcp: entry.connectEnd - entry.connectStart,
        tls:
            entry.secureConnectionStart > 0
                ? entry.connectEnd - entry.secureConnectionStart
                : 0,
        ttfb: entry.responseStart - entry.requestStart,
        download: entry.responseEnd - entry.responseStart,
    };
}

/**
 * Awaits the appearance of a PerformanceResourceTiming entry for a given URL.
 * @param {string} url The URL of the resource to find.
 * @param {number} timeout The maximum time to wait in milliseconds.
 * @returns {Promise<PerformanceResourceTiming | null>}
 */
function getPerformanceEntry(url, timeout = 1000) {
    return new Promise((resolve) => {
        let entry;
        const check = () => {
            entry = performance.getEntriesByName(url, 'resource')[0];
            if (entry) {
                clearInterval(interval);
                clearTimeout(timeoutId);
                resolve(/** @type {PerformanceResourceTiming} */ (entry));
            }
        };

        const interval = setInterval(check, 50);
        const timeoutId = setTimeout(() => {
            clearInterval(interval);
            resolve(null); // Resolve with null if timeout is reached
        }, timeout);

        check(); // Initial check
    });
}

/**
 * Executes a fetch request, applying authentication parameters and logging the transaction.
 * @param {string} url The URL to fetch.
 * @param {import('@/types').AuthInfo} [auth] Optional authentication parameters.
 * @param {import('@/types').ResourceType} [resourceType='other'] The type of resource being fetched.
 * @param {number} [streamId=0] The ID of the stream this request belongs to.
 * @returns {Promise<Response>}
 */
export async function fetchWithAuth(
    url,
    auth,
    resourceType = 'other',
    streamId = 0
) {
    const finalUrl = new URL(url);
    const options = {
        method: 'GET',
        headers: new Headers(),
    };

    if (auth) {
        // Apply query parameters
        auth.queryParams?.forEach((param) => {
            if (param.key) {
                finalUrl.searchParams.append(param.key, param.value);
            }
        });

        // Apply headers
        auth.headers?.forEach((param) => {
            if (param.key) {
                options.headers.append(param.key, param.value);
            }
        });
    }

    const startTime = performance.now();
    const response = await fetchWithRetry(finalUrl.href, options);
    const endTime = performance.now();

    // After the fetch is complete, try to get the performance entry.
    const perfEntry = await getPerformanceEntry(finalUrl.href);

    /** @type {Record<string, string>} */
    const requestHeaders = {};
    options.headers.forEach((value, key) => {
        requestHeaders[key] = value;
    });

    /** @type {Record<string, string>} */
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
    });

    /** @type {import('@/types').NetworkEvent} */
    const networkEvent = {
        id: crypto.randomUUID(),
        url: finalUrl.href,
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
            contentLength:
                Number(response.headers.get('content-length')) ||
                perfEntry?.transferSize ||
                null,
            contentType: response.headers.get('content-type'),
        },
        timing: {
            startTime: perfEntry?.startTime || startTime,
            endTime: perfEntry?.responseEnd || endTime,
            duration: perfEntry?.duration || endTime - startTime,
            breakdown: perfEntry ? getTimingBreakdown(perfEntry) : null,
        },
    };

    // Post the event back to the main thread for logging. This is a fire-and-forget operation.
    self.postMessage({ type: 'network:log-event', payload: networkEvent });

    // We must clone the response here because its body can only be read once.
    // The network event has captured the metadata, but the original caller
    // still needs the response object to read the body content.
    return response.clone();
}
