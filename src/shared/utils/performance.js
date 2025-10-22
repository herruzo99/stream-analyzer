/**
 * Extracts detailed timing from a PerformanceResourceTiming entry.
 * @param {PerformanceResourceTiming} entry The performance entry.
 * @returns {import('@/types').TimingBreakdown}
 */
export function getTimingBreakdownFromPerfEntry(entry) {
    return {
        redirect: entry.redirectEnd - entry.redirectStart,
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
export function getPerformanceEntry(url, timeout = 1000) {
    return new Promise((resolve) => {
        let entry;
        const check = () => {
            // Use getEntriesByType and find the entry manually for more robustness
            const entries = performance.getEntriesByType('resource');
            entry = entries.find((e) => e.name === url);
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