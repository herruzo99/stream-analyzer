import { eventBus } from '@/application/event-bus.js';
import { analysisActions } from '@/state/analysisStore.js';
import { isDebugMode } from '@/application/utils/env.js';
import { debugLog } from '@/application/utils/debug.js';

/**
 * Orchestrates the business logic of starting a new stream analysis.
 * It is independent of the UI and any framework.
 * @param {object} params
 * @param {Array<{id: number, url: string, name: string, file: File | null}>} params.inputs - The raw input data.
 * @param {object} services - Injected dependencies.
 * @param {{saveLastUsedStreams: Function}} services.storage - Storage service.
 * @param {import('@/infrastructure/worker/workerService.js').WorkerService} services.workerService - The worker service.
 * @param {import('@/application/event-bus.js').EventBus} services.eventBus - The application event bus.
 * @param {import('@/state/analysisStore.js').AnalysisActions} services.analysisActions - The analysis state actions.
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

    const workerInputs = [];
    for (const input of validInputs) {
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
                    throw new Error(`HTTP Error ${response.status} for ${input.url}`);
                }
                manifestString = await response.text();
            } else {
                manifestString = await input.file.text();
            }
            workerInputs.push({
                ...input,
                manifestString,
                isDebug: isDebugMode,
            });
        } catch (e) {
            eventBus.dispatch('analysis:error', {
                message: `Failed to fetch or read input: ${e.message}`,
                error: e,
            });
        }
    }

    if (workerInputs.length > 0) {
        debugLog(
            'startAnalysisUseCase',
            `Pre-processing complete. Dispatching ${workerInputs.length} stream(s) to worker.`
        );
        try {
            const results = await workerService.postTask('start-analysis', {
                inputs: workerInputs,
            });

            // Reconstruct Map objects from the serialized arrays
            results.forEach((stream) => {
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
            });

            // --- Generate initial diff on main thread ---
            const { diffManifest } = await import('@/ui/shared/diff.js');
            const xmlFormatter = (await import('xml-formatter')).default;

            results.forEach((stream) => {
                if (stream.manifestUpdates.length > 0) {
                    const initialUpdate = stream.manifestUpdates[0];
                    let formattedInitial = initialUpdate.rawManifest;
                    if (stream.protocol === 'dash') {
                        formattedInitial = xmlFormatter(formattedInitial, {
                            indentation: '  ',
                            lineSeparator: '\n',
                        });
                    }
                    initialUpdate.diffHtml = diffManifest(
                        '',
                        formattedInitial,
                        stream.protocol
                    );
                }
            });

            analysisActions.completeAnalysis(results);
            const tEndTotal = performance.now();
            debugLog(
                'startAnalysisUseCase',
                `Total Analysis Pipeline (success): ${(
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
    } else {
        eventBus.dispatch('analysis:failed');
    }
}