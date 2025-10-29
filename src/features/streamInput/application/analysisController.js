import { eventBus } from '@/application/event-bus';
import { startAnalysisUseCase } from './startAnalysis';
import { container } from '@/application/container';

/**
 * Listens for UI events related to starting analysis and orchestrates the use case.
 */
export function initializeAnalysisController() {
    eventBus.subscribe('ui:stream-analysis-requested', ({ inputs }) => {
        startAnalysisUseCase({ inputs }, container.services);
    });
}
