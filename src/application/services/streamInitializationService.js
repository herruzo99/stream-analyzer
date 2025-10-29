import { eventBus } from '@/application/event-bus';
import { analysisActions } from '@/state/analysisStore';
import { findInitSegmentUrl } from '@/infrastructure/parsing/dash/segment-parser';
import { resolveBaseUrl } from '@/infrastructure/parsing/dash/recursive-parser';
import { workerService } from '@/infrastructure/worker/workerService';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';

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
            'state:analysis-complete',
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
