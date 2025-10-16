import { isDebugMode } from '@/application/utils/env';
import { debugLog } from '@/application/utils/debug';

/**
 * Orchestrates the business logic of starting a new stream analysis.
 * It is independent of the UI and any framework.
 * @param {object} params
 * @param {Array<{id: number, url: string, name: string, file: File | null}>} params.inputs - The raw input data.
 * @param {object} services - Injected dependencies.
 * @param {{saveLastUsedStreams: Function}} services.storage - Storage service.
 * @param {import('@/infrastructure/worker/workerService').WorkerService} services.workerService - The worker service.
 * @param {import('@/application/event-bus').EventBus} services.eventBus - The application event bus.
 * @param {import('@/state/analysisStore').AnalysisActions} services.analysisActions - The analysis state actions.
 */
export async function startAnalysisUseCase({ inputs }, services) {
    const { storage, workerService, eventBus, analysisActions } = services;
    const analysisStartTime = performance.now();
    debugLog('startAnalysisUseCase', 'Starting analysis pipeline...');
    analysisActions.startAnalysis();
    eventBus.dispatch('analysis:started');

    const validInputs = inputs.filter((input) => input.url || input.file);

    if (validInputs.length === 0) {
        eventBus.dispatch('ui:show-status', {
            message: 'Please provide a stream URL or file to analyze.',
            type: 'warn',
        });
        eventBus.dispatch('analysis:failed');
        return;
    }

    const streamsToSave = validInputs
        .filter((i) => i.url)
        .map((i) => ({ url: i.url, name: i.name }));
    storage.saveLastUsedStreams(streamsToSave);

    // --- Parallel Manifest Fetching ---
    const workerInputPromises = validInputs.map(async (input) => {
        try {
            eventBus.dispatch('ui:show-status', {
                message: `Fetching ${input.url || input.file.name}...`,
                type: 'info',
                duration: 2000,
            });
            let manifestString = '';
            if (input.url) {
                const response = await fetch(input.url);
                if (!response.ok) {
                    throw new Error(
                        `HTTP Error ${response.status} for ${input.url}`
                    );
                }
                manifestString = await response.text();
            } else {
                manifestString = await input.file.text();
            }
            return {
                ...input,
                manifestString,
                isDebug: isDebugMode,
            };
        } catch (e) {
            // Re-throw to be caught by Promise.allSettled
            throw new Error(
                `Failed to fetch or read '${
                    input.url || input.file.name
                }': ${e.message}`
            );
        }
    });

    const results = await Promise.allSettled(workerInputPromises);
    const workerInputs = [];
    let hasFailures = false;

    results.forEach((result) => {
        if (result.status === 'fulfilled') {
            workerInputs.push(result.value);
        } else {
            hasFailures = true;
            eventBus.dispatch('analysis:error', {
                message: result.reason.message,
                error: result.reason,
            });
        }
    });

    if (workerInputs.length > 0) {
        debugLog(
            'startAnalysisUseCase',
            `Pre-processing complete. Dispatching ${workerInputs.length} stream(s) to worker.`
        );
        try {
            const workerResults = await workerService.postTask(
                'start-analysis',
                {
                    inputs: workerInputs,
                }
            );

            // Reconstruct Map objects from the serialized arrays
            workerResults.forEach((stream) => {
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
                stream.adAvails = []; // Initialize adAvails
            });

            // This now completes the *initial* analysis. The enrichment service will take over.
            analysisActions.completeAnalysis(workerResults);
            const tEndTotal = performance.now();
            debugLog(
                'startAnalysisUseCase',
                `Initial Analysis Pipeline (success): ${(
                    tEndTotal - analysisStartTime
                ).toFixed(2)}ms`
            );
        } catch (error) {
            eventBus.dispatch('analysis:error', {
                message: error.message,
                error,
            });
            eventBus.dispatch('analysis:failed');
        }
    } else if (hasFailures) {
        // All inputs failed to fetch
        eventBus.dispatch('analysis:failed');
    }
}
