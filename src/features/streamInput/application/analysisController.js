import { container } from '@/application/container';
import { eventBus } from '@/application/event-bus';
import { EVENTS } from '@/types/events';
import { addStreamsToSessionUseCase } from './addStreamsToSession.js';
import { startAnalysisUseCase } from './startAnalysis';

/**
 * Listens for UI events related to starting analysis and orchestrates the use case.
 */
import { analysisActions } from '@/state/analysisStore';
import { showToast } from '@/ui/components/toast';

/**
 * Listens for UI events related to starting analysis and orchestrates the use case.
 */
import { useAnalysisStore } from '@/state/analysisStore';

// Polling interval for failed streams (30 seconds)
const FAILED_STREAM_POLL_INTERVAL = 30000;
let failedStreamPollIntervalId = null;

export function initializeAnalysisController() {
    const processPartialAnalysis = (data) => {
        const {
            validStreams,
            failedInputs,
            urlAuthMapArray,
            validInputs,
            mode,
        } = data;

        // Create disabled stream placeholders for failed inputs
        const disabledStreams = failedInputs.map(({ input, error }) => {
            return {
                id: input.id,
                name: input.name || input.url || 'Unknown Stream',
                originalUrl: input.url,
                // Minimal required fields
                manifest: { type: 'static', periods: [] },
                rawManifest: '',
                auth: input.auth,
                drmAuth: input.drmAuth,
                mediaPlaylists: new Map(),
                hlsVariantState: new Map(),
                dashRepresentationState: new Map(),
                disabled: true,
                error: error,
                retryCount: 0,
                warnings: [
                    { message: `Analysis Failed: ${error}`, severity: 'error' },
                ],
            };
        });

        // Reconstruct Maps for valid streams (same logic as in startAnalysisUseCase)
        validStreams.forEach((stream) => {
            stream.hlsVariantState = new Map(stream.hlsVariantState || []);
            stream.dashRepresentationState = new Map(
                stream.dashRepresentationState || []
            );
            if (stream.featureAnalysis) {
                stream.featureAnalysis.results = new Map(
                    stream.featureAnalysis.results || []
                );
            }
            stream.semanticData = new Map(stream.semanticData || []);
            stream.mediaPlaylists = new Map(stream.mediaPlaylists || []);
            stream.adAvails = [];
        });

        const allStreams = [...validStreams, ...disabledStreams];

        if (mode === 'append') {
            analysisActions.appendStreams(allStreams, urlAuthMapArray);
            showToast({
                message: `Added ${allStreams.length} stream(s) to session (${disabledStreams.length} failed).`,
                type: 'info', // Changed to info to be less alarming but informative
            });
        } else {
            analysisActions.completeAnalysis(
                allStreams,
                urlAuthMapArray,
                validInputs
            );
            if (disabledStreams.length > 0) {
                showToast({
                    message: `Analysis complete. ${disabledStreams.length} stream(s) failed.`,
                    type: 'warn',
                });
            }
        }
    };

    /**
     * Retries analysis for a single disabled stream.
     * @param {number} streamId
     */
    const retryStreamAndMerge = async (streamId) => {
        const { streams, streamInputs } = useAnalysisStore.getState();
        const stream = streams.find((s) => s.id === streamId);

        // Find original input from streamInputs using ID matching (assuming IDs map 1:1 or are preserved)
        // A safer way is to find input by ID if possible, or construct it from stream data
        let input = streamInputs.find(i => i.id === streamId);

        // Fallback reconstruction if input not found (e.g. if IDs decoupled)
        if (!input && stream) {
            input = {
                id: stream.id,
                url: stream.originalUrl,
                name: stream.name,
                auth: stream.auth,
                drmAuth: stream.drmAuth,
            };
        }

        if (!stream || !stream.disabled || !input) return;

        // Optimistic update? Maybe show spinner.

        try {
            const result = await startAnalysisUseCase(
                {
                    inputs: [input],
                    options: { resetStore: false, showLoader: false }
                },
                container.services
            );

            // If successful
            if (result.status !== 'partial' && result.streams && result.streams.length > 0) {
                const newStream = result.streams[0];

                // Reconstruct Maps
                newStream.hlsVariantState = new Map(newStream.hlsVariantState || []);
                newStream.dashRepresentationState = new Map(newStream.dashRepresentationState || []);
                if (newStream.featureAnalysis) {
                    newStream.featureAnalysis.results = new Map(newStream.featureAnalysis.results || []);
                }
                newStream.semanticData = new Map(newStream.semanticData || []);
                newStream.mediaPlaylists = new Map(newStream.mediaPlaylists || []);
                newStream.adAvails = [];

                // Update store: replace the disabled stream with the new valid one
                // We can use a custom action or just append/update.
                // Ideally we replace it in place.
                // Since we don't have a specific "replaceStream" action that completely swaps type, 
                // we might need to modify analysisActions or just use updateStream with ALL properties.
                // But updateStream merges...

                // Better approach: remove and re-add? No, ID changes.
                // Let's rely on `updateStream` overwriting keys. We need to unset `disabled` and `error`.

                const updateData = {
                    ...newStream,
                    disabled: false,
                    error: null,
                    warnings: [], // Clear warnings
                    retryCount: (stream.retryCount || 0) + 1
                };

                analysisActions.updateStream(streamId, updateData);

                // Also update AuthMap if changed
                if (result.urlAuthMapArray) {
                    // This part is tricky as we need to append to the map.
                    // The store doesn't expose a simple "add to map" for auth.
                    // But we can ignore for now or use appendStreams if it was a new stream.
                }

                showToast({ message: `Stream "${stream.name}" recovered!`, type: 'pass' });

            } else {
                // Failed again
                analysisActions.updateStream(streamId, {
                    retryCount: (stream.retryCount || 0) + 1
                });
                // Silent failure on polling, maybe toast on manual?
            }
        } catch (e) {
            console.error("Retry failed", e);
            analysisActions.updateStream(streamId, {
                retryCount: (stream.retryCount || 0) + 1
            });
        }
    };

    eventBus.subscribe(EVENTS.UI.STREAM_ANALYSIS_REQUESTED, async ({ inputs }) => {
        const result = await startAnalysisUseCase({ inputs }, container.services);

        if (result.status === 'partial') {
            processPartialAnalysis(result);
        }
    });

    eventBus.subscribe(EVENTS.UI.ADD_STREAMS_REQUESTED, async ({ inputs }) => {
        const result = await addStreamsToSessionUseCase(
            { inputs },
            container.services
        );

        if (result && result.status === 'partial') {
            processPartialAnalysis(result);
        }
    });

    eventBus.subscribe(EVENTS.UI.RETRY_STREAM, ({ streamId }) => {
        retryStreamAndMerge(streamId);
    });

    // Start Polling Loop
    if (failedStreamPollIntervalId) clearInterval(failedStreamPollIntervalId);
    failedStreamPollIntervalId = setInterval(() => {
        const { streams } = useAnalysisStore.getState();
        const disabledStreams = streams.filter(s => s.disabled);
        disabledStreams.forEach(s => retryStreamAndMerge(s.id));
    }, FAILED_STREAM_POLL_INTERVAL);
}
