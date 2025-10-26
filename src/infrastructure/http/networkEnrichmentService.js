import { workerService } from '@/infrastructure/worker/workerService';
import { networkActions } from '@/state/networkStore';
import {
    getPerformanceEntry,
    getTimingBreakdownFromPerfEntry,
} from '@/shared/utils/performance';
import { debugLog } from '@/shared/utils/debug';

async function enrichAndLogEvent(provisionalEvent) {
    debugLog('NetworkEnrichmentService', 'enrichAndLogEvent triggered for:', provisionalEvent.url);
    const perfEntry = await getPerformanceEntry(provisionalEvent.url);

    if (perfEntry) {
        debugLog('NetworkEnrichmentService', 'Found PerformanceEntry, enriching timing data.', perfEntry);
        provisionalEvent.timing = {
            startTime: perfEntry.startTime,
            endTime: perfEntry.responseEnd,
            duration: perfEntry.duration,
            breakdown: getTimingBreakdownFromPerfEntry(perfEntry),
        };
        provisionalEvent.response.contentLength =
            provisionalEvent.response.contentLength || perfEntry.transferSize;
    } else {
        debugLog('NetworkEnrichmentService', 'Could not find PerformanceEntry. Logging event with provisional timing.');
    }

    networkActions.logEvent(provisionalEvent);
}

export function initializeNetworkEnrichmentService() {
    debugLog('NetworkEnrichmentService', 'Initializing and registering global handler for "worker:network-event".');
    workerService.registerGlobalHandler('worker:network-event', enrichAndLogEvent);
}