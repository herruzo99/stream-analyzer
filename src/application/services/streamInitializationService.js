import { eventBus } from '@/application/event-bus';
import { EVENTS } from '@/types/events';

/**
 * A service dedicated to enriching stream objects with data from dependent resources
 * (like DASH init segments or HLS media playlists) after the initial analysis is complete.
 */
class StreamInitializationService {
    constructor() {
        this.isInitialized = false;
    }

    initialize() {
        if (this.isInitialized) return;
        eventBus.subscribe(
            EVENTS.STATE.ANALYSIS_COMPLETE,
            this.handleAnalysisComplete.bind(this)
        );
        this.isInitialized = true;
    }

    /**
     * @param {{ streams: import('@/types.ts').Stream[] }} payload
     */
    async handleAnalysisComplete({ streams }) {
        // The enrichment logic for DASH init segments is now correctly handled
        // within the worker during the initial `start-analysis` task.
        // This service no longer needs to perform any pre-fetching for DASH.
        // The HLS playlist fetching remains on-demand, handled by other services.
    }
}

export const streamInitializationService = new StreamInitializationService();
