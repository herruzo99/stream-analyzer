import { networkActions } from '@/state/networkStore';
import {
    getPerformanceEntry,
    getTimingBreakdownFromPerfEntry,
} from '@/shared/utils/performance';
import { debugLog } from '@/shared/utils/debug';
import { eventBus } from '@/application/event-bus';

async function enrichAndLogEvent(provisionalEvent) {
    debugLog(
        'NetworkEnrichmentService',
        'enrichAndLogEvent triggered for:',
        provisionalEvent.url
    );
    const perfEntry = await getPerformanceEntry(provisionalEvent.url);

    if (perfEntry) {
        debugLog(
            'NetworkEnrichmentService',
            'Found PerformanceEntry, enriching timing data.',
            perfEntry
        );
        provisionalEvent.timing.breakdown =
            getTimingBreakdownFromPerfEntry(perfEntry);
        provisionalEvent.response.contentLength =
            provisionalEvent.response.contentLength || perfEntry.transferSize;
    } else {
        debugLog(
            'NetworkEnrichmentService',
            'Could not find PerformanceEntry. Logging event with provisional timing.'
        );
    }

    networkActions.logEvent(provisionalEvent);
}

export function initializeNetworkEnrichmentService() {
    debugLog(
        'NetworkEnrichmentService',
        'Initializing and subscribing to "worker:network-event".'
    );
    eventBus.subscribe('worker:network-event', enrichAndLogEvent);
}
