import { eventBus } from '@/application/event-bus';
import { startSegmentAnalysisUseCase } from './startSegmentAnalysis';

/**
 * Listens for UI events related to starting a local segment analysis.
 */
export function initializeSegmentAnalysisController() {
    eventBus.subscribe('ui:segment-analysis-requested', ({ files }) => {
        startSegmentAnalysisUseCase({ files });
    });
}
