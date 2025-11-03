import { networkActions } from '@/state/networkStore';
import { debugLog } from '@/shared/utils/debug';
import { eventBus } from '@/application/event-bus';

// --- Co-located Helper Function ---
/**
 * Extracts detailed timing from a PerformanceResourceTiming entry.
 * @param {PerformanceResourceTiming} entry The performance entry.
 * @returns {import('@/types').TimingBreakdown}
 */
function getTimingBreakdownFromPerfEntry(entry) {
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

// --- Service State ---
let observer = null;
const MAX_BUFFER_SIZE = 200;

/**
 * The callback for the PerformanceObserver. It enriches any matching logged event.
 * @param {PerformanceObserverEntryList} list
 */
function performanceObserverCallback(list) {
    for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
            const resourceEntry = /** @type {PerformanceResourceTiming} */ (
                entry
            );
            debugLog(
                'NetworkEnrichmentService',
                'PerformanceObserver captured entry:',
                resourceEntry.name
            );

            // --- BUG FIX: Read the latest state *inside* the loop ---
            // This prevents race conditions where multiple performance entries in the same
            // callback batch would operate on a stale snapshot of the event store.
            const { events } = networkActions.get();
            const matchingEvent = events.find(
                (e) => e.url === resourceEntry.name && !e.timing.breakdown
            );
            // --- END BUG FIX ---

            if (matchingEvent) {
                const breakdown =
                    getTimingBreakdownFromPerfEntry(resourceEntry);
                const enrichedEvent = {
                    ...matchingEvent,
                    timing: { ...matchingEvent.timing, breakdown },
                    response: {
                        ...matchingEvent.response,
                        contentLength:
                            matchingEvent.response.contentLength ||
                            resourceEntry.transferSize,
                    },
                };
                networkActions.updateEvent(enrichedEvent);
                debugLog(
                    'NetworkEnrichmentService',
                    'Asynchronously enriched event:',
                    enrichedEvent.id
                );
            }
        }
    }
}

/**
 * Logs a provisional network event immediately, without waiting for performance data.
 * The PerformanceObserver will enrich it later if possible.
 * @param {import('@/types').NetworkEvent} provisionalEvent
 */
function logProvisionalEvent(provisionalEvent) {
    debugLog(
        'NetworkEnrichmentService',
        'Logging provisional event immediately:',
        provisionalEvent.url
    );
    networkActions.logEvent(provisionalEvent);
}

/**
 * Initializes the service by creating and starting a PerformanceObserver.
 */
export function initializeNetworkEnrichmentService() {
    if (observer) {
        observer.disconnect();
    }
    try {
        // Clear any existing performance entries to avoid processing stale data from previous sessions.
        if (performance.clearResourceTimings) {
            performance.clearResourceTimings();
        }
        // Set a larger buffer size to reduce the chance of entries being dropped by the browser.
        if (performance.setResourceTimingBufferSize) {
            performance.setResourceTimingBufferSize(MAX_BUFFER_SIZE);
        }

        observer = new PerformanceObserver(performanceObserverCallback);
        // Observe new entries as they come in. The `buffered: true` flag is less critical now
        // but kept for robustness to catch any entries that might appear before observation starts.
        observer.observe({ type: 'resource', buffered: true });

        debugLog(
            'NetworkEnrichmentService',
            'Initialized and subscribing to "worker:network-event". PerformanceObserver is active.'
        );
        eventBus.subscribe('worker:network-event', logProvisionalEvent);
    } catch (e) {
        console.error(
            'PerformanceObserver is not supported in this environment. Network timing will be incomplete.',
            e
        );
        // Fallback: If the observer fails, just log the provisional data directly.
        eventBus.subscribe('worker:network-event', networkActions.logEvent);
    }
}
