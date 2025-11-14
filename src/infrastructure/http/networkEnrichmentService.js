import { networkActions } from '@/state/networkStore';
import { appLog } from '@/shared/utils/debug';
import { eventBus } from '@/application/event-bus';

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
const MAX_BUFFER_SIZE = 1000;

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
            appLog(
                'NetworkEnrichmentService',
                'log',
                'PerformanceObserver captured entry:',
                resourceEntry.name
            );

            const { events } = networkActions.get();
            const matchingEvent = events.find(
                (e) => e.url === resourceEntry.name && !e.timing.breakdown
            );

            if (matchingEvent) {
                const breakdown =
                    getTimingBreakdownFromPerfEntry(resourceEntry);
                const enrichedEvent = {
                    ...matchingEvent,
                    timing: {
                        startTime: resourceEntry.startTime,
                        endTime: resourceEntry.responseEnd,
                        duration: resourceEntry.duration,
                        breakdown,
                    },
                    response: {
                        ...matchingEvent.response,
                        contentLength:
                            matchingEvent.response.contentLength ||
                            resourceEntry.transferSize,
                    },
                };
                networkActions.updateEvent(enrichedEvent);
                appLog(
                    'NetworkEnrichmentService',
                    'info',
                    'Asynchronously enriched event:',
                    enrichedEvent.id
                );
            }
        }
    }
}

/**
 * Initializes the service by creating and starting a PerformanceObserver.
 */
export function initializeNetworkEnrichmentService() {
    if (observer) {
        observer.disconnect();
    }
    try {
        if (performance.clearResourceTimings) {
            performance.clearResourceTimings();
        }
        if (performance.setResourceTimingBufferSize) {
            performance.setResourceTimingBufferSize(MAX_BUFFER_SIZE);
        }

        observer = new PerformanceObserver(performanceObserverCallback);
        observer.observe({ type: 'resource', buffered: true });

        appLog(
            'NetworkEnrichmentService',
            'info',
            'Initialized and subscribing to "worker:network-event". PerformanceObserver is active.'
        );
        eventBus.subscribe('worker:network-event', networkActions.logEvent);
    } catch (e) {
        console.error(
            'PerformanceObserver is not supported in this environment. Network timing will be incomplete.',
            e
        );
        eventBus.subscribe('worker:network-event', networkActions.logEvent);
    }
}