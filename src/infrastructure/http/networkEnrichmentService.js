import { workerService } from '@/infrastructure/worker/workerService';
import { networkActions } from '@/state/networkStore';
import {
    getPerformanceEntry,
    getTimingBreakdownFromPerfEntry,
} from '@/shared/utils/performance';

async function enrichAndLogEvent(provisionalEvent) {
    const perfEntry = await getPerformanceEntry(provisionalEvent.url);

    if (perfEntry) {
        provisionalEvent.timing = {
            startTime: perfEntry.startTime,
            endTime: perfEntry.responseEnd,
            duration: perfEntry.duration,
            breakdown: getTimingBreakdownFromPerfEntry(perfEntry),
        };
        provisionalEvent.response.contentLength =
            provisionalEvent.response.contentLength || perfEntry.transferSize;
    }

    networkActions.logEvent(provisionalEvent);
}

export function initializeNetworkEnrichmentService() {
    workerService.registerGlobalHandler('worker:network-event', enrichAndLogEvent);
}