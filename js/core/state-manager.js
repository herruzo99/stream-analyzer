import { analysisState } from './state.js';
import { eventBus } from './event-bus.js';
import { pollHlsVariant } from '../services/hlsVariantPollerService.js';

function initializeStateManager() {
    // --- State Mutations in response to events ---

    eventBus.subscribe('state:analysis-complete', ({ streams }) => {
        analysisState.streams = streams;
        analysisState.activeStreamId = streams[0]?.id ?? null;
    });

    eventBus.subscribe('analysis:started', () => {
        analysisState.streams = [];
        analysisState.activeStreamId = null;
        analysisState.activeSegmentUrl = null;
        analysisState.segmentCache.clear();
        analysisState.segmentsForCompare = [];
        analysisState.decodedSamples.clear();
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

    // --- HLS Explorer UI State Management ---
    eventBus.subscribe(
        'hls-poller:variant-loading',
        ({ streamId, variantUri }) => {
            const stream = analysisState.streams.find((s) => s.id === streamId);
            if (!stream) return;
            const variant = stream.hlsVariantState.get(variantUri);
            if (variant) {
                variant.isLoading = true;
                variant.error = null;
                eventBus.dispatch('state:stream-variant-changed', {
                    streamId,
                    variantUri,
                });
            }
        }
    );

    eventBus.subscribe(
        'hls-poller:variant-updated',
        ({ streamId, variantUri, segments, freshSegmentUrls, error }) => {
            const stream = analysisState.streams.find((s) => s.id === streamId);
            if (!stream) return;
            const variant = stream.hlsVariantState.get(variantUri);
            if (variant) {
                variant.isLoading = false;
                variant.error = error || null;
                if (!error) {
                    variant.segments = segments;
                    variant.freshSegmentUrls = freshSegmentUrls;
                }
                eventBus.dispatch('state:stream-variant-changed', {
                    streamId,
                    variantUri,
                });
            }
        }
    );

    eventBus.subscribe(
        'hls-explorer:toggle-variant',
        ({ streamId, variantUri }) => {
            const stream = analysisState.streams.find((s) => s.id === streamId);
            if (!stream) return;
            const variant = stream.hlsVariantState.get(variantUri);
            if (variant) {
                const wasExpanded = variant.isExpanded;
                variant.isExpanded = !variant.isExpanded;

                // If we are expanding it for the first time, trigger an immediate fetch.
                const needsInitialFetch =
                    variant.isExpanded &&
                    !wasExpanded &&
                    variant.segments.length === 0;
                if (needsInitialFetch) {
                    pollHlsVariant(streamId, variantUri);
                }

                eventBus.dispatch('state:stream-variant-changed', {
                    streamId,
                    variantUri,
                });
            }
        }
    );

    eventBus.subscribe(
        'hls-explorer:toggle-polling',
        ({ streamId, variantUri }) => {
            const stream = analysisState.streams.find((s) => s.id === streamId);
            if (!stream) return;
            const variant = stream.hlsVariantState.get(variantUri);
            if (variant) {
                variant.isPolling = !variant.isPolling;
                eventBus.dispatch('state:stream-variant-changed', {
                    streamId,
                    variantUri,
                });
            }
        }
    );

    eventBus.subscribe(
        'hls-explorer:set-display-mode',
        ({ streamId, variantUri, mode }) => {
            const stream = analysisState.streams.find((s) => s.id === streamId);
            if (!stream) return;
            const variant = stream.hlsVariantState.get(variantUri);
            if (variant) {
                variant.displayMode = mode;
                eventBus.dispatch('state:stream-variant-changed', {
                    streamId,
                    variantUri,
                });
            }
        }
    );
}

initializeStateManager();