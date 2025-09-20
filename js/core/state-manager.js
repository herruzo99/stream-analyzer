import { analysisState } from './state.js';
import { eventBus } from './event-bus.js';

function initializeStateManager() {
    // --- State Mutations in response to events ---

    eventBus.subscribe(
        'state:analysis-complete',
        ({ streams, manifestUpdates, isPollingActive }) => {
            analysisState.streams = streams;
            analysisState.activeStreamId = streams[0]?.id ?? null;
            analysisState.manifestUpdates = manifestUpdates;
            analysisState.isPollingActive = isPollingActive;
        }
    );

    eventBus.subscribe('analysis:started', () => {
        analysisState.streams = [];
        analysisState.manifestUpdates = [];
        analysisState.activeManifestUpdateIndex = 0;
        analysisState.segmentCache.clear();
        analysisState.segmentsForCompare = [];
        analysisState.isPollingActive = false;
    });

    eventBus.subscribe('state:stream-updated', ({ streamId, updatedStreamData }) => {
        const streamIndex = analysisState.streams.findIndex(s => s.id === streamId);
        if (streamIndex !== -1) {
            analysisState.streams[streamIndex] = {
                ...analysisState.streams[streamIndex],
                ...updatedStreamData
            };
            eventBus.dispatch('ui:rerender-tabs');
        }
    });

    eventBus.subscribe('compare:add-segment', ({ url }) => {
        if (analysisState.segmentsForCompare.length < 2 && !analysisState.segmentsForCompare.includes(url)) {
            analysisState.segmentsForCompare.push(url);
            eventBus.dispatch('state:compare-list-changed', { count: analysisState.segmentsForCompare.length });
        }
    });

    eventBus.subscribe('compare:remove-segment', ({ url }) => {
        const index = analysisState.segmentsForCompare.indexOf(url);
        if (index > -1) {
            analysisState.segmentsForCompare.splice(index, 1);
            eventBus.dispatch('state:compare-list-changed', { count: analysisState.segmentsForCompare.length });
        }
    });

    eventBus.subscribe('compare:clear', () => {
        analysisState.segmentsForCompare = [];
        eventBus.dispatch('state:compare-list-changed', { count: 0 });
    });
}

initializeStateManager();