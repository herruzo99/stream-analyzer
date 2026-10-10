import { eventBus } from '@/application/event-bus.js';
import { startBoundedSegmentAnalysis } from './startBoundedSegmentAnalysis.js';

/**
 * Listens for UI events related to starting a local segment analysis.
 */
export function initializeSegmentAnalysisController() {
    let activeRun = null;
    return eventBus.subscribe('ui:segment-analysis-requested', ({ files }) => {
        activeRun?.cancel();
        const run = startBoundedSegmentAnalysis({ files });
        activeRun = run;
        void run.promise.finally(() => {
            if (activeRun === run) activeRun = null;
        });
    });
}
