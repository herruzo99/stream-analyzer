import { appLog } from '@/shared/utils/debug';
import { isDebugMode } from '@/shared/utils/env';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { EVENTS } from '@/types/events';

/**
 * Orchestrates the business logic of starting a new stream analysis.
 * It is independent of the UI and any framework.
 * @param {object} params
 * @param {Array<{id: number, url: string, name: string, file: File | null, auth: import('@/types').AuthInfo, drmAuth: import('@/types').DrmAuthInfo}>} params.inputs - The raw input data.
 * @param {object} [params.options] - Optional analysis configuration.
 * @param {boolean} [params.options.resetStore] - Whether to reset the analysis store.
 * @param {boolean} [params.options.showLoader] - Whether to trigger the loading state.
 * @param {object} services - Injected dependencies.
 * @param {{saveLastUsedStreams: Function}} services.storage - Storage service.
 * @param {import('@/infrastructure/worker/workerService').WorkerService} services.workerService - The worker service.
 * @param {import('@/application/event-bus').EventBus} services.eventBus - The application event bus.
 * @param {typeof import('@/state/analysisStore').analysisActions} services.analysisActions - The analysis state actions.
 */
export async function startAnalysisUseCase({ inputs, options = {} }, services) {
    const { storage, workerService, eventBus, analysisActions } = services;

    // Default options
    const { resetStore = true, showLoader = true } = options;

    const analysisStartTime = performance.now();
    appLog('startAnalysisUseCase', 'info', 'Starting analysis pipeline...', { options });

    if (resetStore) {
        analysisActions.startAnalysis();
    }

    if (showLoader) {
        eventBus.dispatch(EVENTS.ANALYSIS.STARTED);
    }

    const validInputs = inputs.filter((input) => input.url || input.file);

    if (validInputs.length === 0) {
        eventBus.dispatch(EVENTS.UI.SHOW_STATUS, {
            message: 'Please provide a stream URL or file to analyze.',
            type: 'warn',
        });
        eventBus.dispatch(EVENTS.ANALYSIS.FAILED);
        return;
    }

    const streamsToSave = validInputs
        .filter((i) => i.url)
        .map((i) => ({
            url: i.url,
            name: i.name,
            auth: i.auth,
            drmAuth: i.drmAuth,
        }));
    storage.saveLastUsedStreams(streamsToSave);

    // --- Prepare inputs for the worker ---
    const workerInputsPromises = validInputs.map(async (input) => {
        const workerInput = {
            ...input,
            isDebug: isDebugMode,
        };

        if (input.drmAuth.serverCertificate instanceof File) {
            appLog(
                'startAnalysisUseCase',
                'info',
                `Reading certificate file "${input.drmAuth.serverCertificate.name}" into ArrayBuffer.`
            );
            workerInput.drmAuth.serverCertificate =
                await input.drmAuth.serverCertificate.arrayBuffer();
        } else if (
            typeof input.drmAuth.serverCertificate === 'object' &&
            input.drmAuth.serverCertificate !== null &&
            !(input.drmAuth.serverCertificate instanceof ArrayBuffer)
        ) {
            // Handle the new object-based structure for multiple certificates
            const certObject = input.drmAuth.serverCertificate;
            /** @type {{ [keySystem: string]: string | ArrayBuffer | File; }} */
            const processedCerts = {};
            for (const key in certObject) {
                const certValue = certObject[key];
                if (certValue instanceof File) {
                    processedCerts[key] = await certValue.arrayBuffer();
                } else {
                    processedCerts[key] = certValue;
                }
            }
            workerInput.drmAuth.serverCertificate = processedCerts;
        }

        return workerInput;
    });

    const workerInputs = await Promise.all(workerInputsPromises);

    appLog(
        'startAnalysisUseCase',
        'info',
        `Dispatching ${workerInputs.length} stream(s) to worker for fetching and analysis.`,
        workerInputs
    );

    try {
        const {
            streams,
            urlAuthMapArray,
            opportunisticallyCachedSegments,
            failedInputs,
        } = await workerService.postTask('start-analysis', {
            inputs: workerInputs,
        }).promise;

        // Manually populate the cache BEFORE completing analysis to prevent race conditions.
        if (opportunisticallyCachedSegments) {
            const { set } = useSegmentCacheStore.getState();
            for (const segment of opportunisticallyCachedSegments) {
                if (segment.uniqueId) {
                    set(segment.uniqueId, {
                        status: segment.status,
                        data: segment.data,
                        parsedData: segment.parsedData,
                    });
                } else {
                    console.warn(
                        '[startAnalysisUseCase] Received segment without uniqueId from worker.',
                        segment
                    );
                }
            }
            appLog(
                'startAnalysisUseCase',
                'info',
                `Pre-populated segment cache with ${opportunisticallyCachedSegments.length} opportunistically fetched segments.`
            );
        }

        // Check for partial or total failures
        if (failedInputs && failedInputs.length > 0) {
            // If we have some successful streams, we treat it as a partial failure
            // If NO streams succeeded, it's a total failure (but handled via the same partial flow for now to show the list)

            // Failsafe: If no streams and no failed inputs (shouldn't happen logic-wise but...)
            if (streams.length === 0 && failedInputs.length === 0) {
                throw new Error('No streams returned from analysis.');
            }

            return {
                status: 'partial',
                validStreams: streams,
                failedInputs,
                urlAuthMapArray,
                validInputs,
            };
        }

        // Failsafe check for empty manifest content which can result from network issues (e.g., 304 response)
        if (!streams[0]?.rawManifest?.trim()) {
            throw new Error(
                'Manifest content is empty. This may be due to a network or CORS issue.'
            );
        }

        // Reconstruct Map objects from the serialized arrays
        streams.forEach((stream) => {
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

        analysisActions.completeAnalysis(streams, urlAuthMapArray, validInputs);
        const tEndTotal = performance.now();
        appLog(
            'startAnalysisUseCase',
            'info',
            `Initial Analysis Pipeline (success): ${(
                tEndTotal - analysisStartTime
            ).toFixed(2)}ms`
        );
        return { status: 'success' };
    } catch (error) {
        eventBus.dispatch(EVENTS.ANALYSIS.ERROR, {
            message: error.message,
            error,
        });
        eventBus.dispatch(EVENTS.ANALYSIS.FAILED);
        return { status: 'error', error };
    }
}
