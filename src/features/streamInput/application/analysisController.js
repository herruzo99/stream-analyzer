import { container } from '@/application/container';
import { eventBus } from '@/application/event-bus';
import { EVENTS } from '@/types/events';
import { addStreamsToSessionUseCase } from './addStreamsToSession.js';
import { startAnalysisUseCase } from './startAnalysis';

/**
 * Listens for UI events related to starting analysis and orchestrates the use case.
 */
export function initializeAnalysisController() {
    eventBus.subscribe(EVENTS.UI.STREAM_ANALYSIS_REQUESTED, ({ inputs }) => {
        startAnalysisUseCase({ inputs }, container.services);
    });

    eventBus.subscribe(EVENTS.UI.ADD_STREAMS_REQUESTED, ({ inputs }) => {
        addStreamsToSessionUseCase({ inputs }, container.services);
    });
}
