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
        analysisState.activeStreamId = null;
        analysisState.activeSegmentUrl = null;
        analysisState.manifestUpdates = [];
        analysisState.activeManifestUpdateIndex = 0;
        analysisState.segmentCache.clear();
        analysisState.segmentsForCompare = [];
        analysisState.isPollingActive = false;
        analysisState.streamIdCounter = 0; // Reset for new analysis
    });

    eventBus.subscribe(
        'state:stream-updated',
        ({ streamId, updatedStreamData }) => {
            const streamIndex = analysisState.streams.findIndex(
                (s) => s.id === streamId
            );
            if (streamIndex !== -1) {
                // Use a non-destructive merge to update the stream object
                analysisState.streams[streamIndex] = {
                    ...analysisState.streams[streamIndex],
                    ...updatedStreamData,
                };
                // Do not broadcast a generic re-render.
                // Interested components will listen for the state change.
            }
        }
    );

    eventBus.subscribe('compare:add-segment', ({ url }) => {
        if (
            analysisState.segmentsForCompare.length < 2 &&
            !analysisState.segmentsForCompare.includes(url)
        ) {
            analysisState.segmentsForCompare.push(url);
            eventBus.dispatch('state:compare-list-changed', {
                count: analysisState.segmentsForCompare.length,
            });
        }
    });

    eventBus.subscribe('compare:remove-segment', ({ url }) => {
        const index = analysisState.segmentsForCompare.indexOf(url);
        if (index > -1) {
            analysisState.segmentsForCompare.splice(index, 1);
            eventBus.dispatch('state:compare-list-changed', {
                count: analysisState.segmentsForCompare.length,
            });
        }
    });

    eventBus.subscribe('compare:clear', () => {
        analysisState.segmentsForCompare = [];
        eventBus.dispatch('state:compare-list-changed', { count: 0 });
    });

    eventBus.subscribe(
        'feature-analysis:updated',
        ({ streamId, newAnalysisResults, newRawManifest }) => {
            const streamIndex = analysisState.streams.findIndex(
                (s) => s.id === streamId
            );
            if (streamIndex === -1) return;

            const stream = analysisState.streams[streamIndex];
            stream.featureAnalysis.manifestCount++;
            stream.rawManifest = newRawManifest; // Update raw manifest for subsequent polls

            // Merge results
            Object.entries(newAnalysisResults).forEach(([name, result]) => {
                const existing = stream.featureAnalysis.results.get(name);
                // If a feature is ever detected as 'used', it stays 'used'.
                if (result.used && (!existing || !existing.used)) {
                    stream.featureAnalysis.results.set(name, {
                        used: true,
                        details: result.details,
                    });
                } else if (!existing) {
                    // Add feature if it was missing before (unlikely but safe)
                    stream.featureAnalysis.results.set(name, {
                        used: result.used,
                        details: result.details,
                    });
                }
            });

            // If this is the active stream, trigger a re-render of the features tab
            if (stream.id === analysisState.activeStreamId) {
                eventBus.dispatch('ui:rerender-features-tab');
            }
        }
    );
}

initializeStateManager();