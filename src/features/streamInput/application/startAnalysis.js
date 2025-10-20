import { isDebugMode } from '@/shared/utils/env';
import { debugLog } from '@/shared/utils/debug';

/**
 * Orchestrates the business logic of starting a new stream analysis.
 * It is independent of the UI and any framework.
 * @param {object} params
 * @param {Array<{id: number, url: string, name: string, file: File | null, auth: import('@/types').AuthInfo}>} params.inputs - The raw input data.
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
        .map((i) => ({ url: i.url, name: i.name, auth: i.auth }));
    storage.saveLastUsedStreams(streamsToSave);

    // --- Prepare inputs for the worker ---
    const workerInputs = validInputs.map((input) => ({
        ...input,
        isDebug: isDebugMode,
    }));

    debugLog(
        'startAnalysisUseCase',
        `Dispatching ${workerInputs.length} stream(s) to worker for fetching and analysis.`
    );

    try {
        const workerResults = await workerService.postTask('start-analysis', {
            inputs: workerInputs,
        });

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
}
