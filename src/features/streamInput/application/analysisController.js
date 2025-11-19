import { eventBus } from '@/application/event-bus';
import { startAnalysisUseCase } from './startAnalysis';
import { container } from '@/application/container';
import { EVENTS } from '@/types/events';

/**
 * Listens for UI events related to starting analysis and orchestrates the use case.
 */
export function initializeAnalysisController() {
    eventBus.subscribe(EVENTS.UI.STREAM_ANALYSIS_REQUESTED, ({ inputs }) => {
        startAnalysisUseCase({ inputs }, container.services);
    });
}
