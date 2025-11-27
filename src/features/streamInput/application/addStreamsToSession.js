import { appLog } from '@/shared/utils/debug';
import { isDebugMode } from '@/shared/utils/env';
import { useAnalysisStore } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { EVENTS } from '@/types/events';
import { showToast } from '@/ui/components/toast';

/**
 * Orchestrates adding new streams to an existing analysis session.
 * It filters out streams that have already been analyzed to avoid duplication and overhead.
 * @param {object} params
 * @param {Array<import('@/types').StreamInput>} params.inputs - The current list of inputs.
 * @param {object} services - Injected dependencies.
 * @param {import('@/infrastructure/worker/workerService').WorkerService} services.workerService
 * @param {import('@/application/event-bus').EventBus} services.eventBus
 * @param {typeof import('@/state/analysisStore').analysisActions} services.analysisActions
 */
export async function addStreamsToSessionUseCase({ inputs }, services) {
    const { workerService, eventBus, analysisActions } = services;

    // Identify pending streams (those in inputs but not in active streams)
    const { streams: activeStreams } = useAnalysisStore.getState();
    const activeStreamIds = new Set(activeStreams.map((s) => s.id));

    const pendingInputs = inputs.filter(
        (input) => (input.url || input.file) && !activeStreamIds.has(input.id)
    );

    if (pendingInputs.length === 0) {
        showToast({
            message: 'No new streams to add.',
            type: 'info',
        });
        return;
    }

    appLog(
        'addStreamsToSession',
        'info',
        `Adding ${pendingInputs.length} new streams...`
    );

    // We trigger a progress event to show the loader, but we don't fire ANALYSIS.STARTED
    // because that might trigger global resets in other listeners.
    eventBus.dispatch(EVENTS.ANALYSIS.PROGRESS, {
        message: 'Analyzing new streams...',
    });

    // --- Prepare inputs for the worker (Logic copied from startAnalysis.js) ---
    const workerInputsPromises = pendingInputs.map(async (input) => {
        const workerInput = {
            ...input,
            isDebug: isDebugMode,
        };

        if (input.drmAuth.serverCertificate instanceof File) {
            workerInput.drmAuth.serverCertificate =
                await input.drmAuth.serverCertificate.arrayBuffer();
        } else if (
            typeof input.drmAuth.serverCertificate === 'object' &&
            input.drmAuth.serverCertificate !== null &&
            !(input.drmAuth.serverCertificate instanceof ArrayBuffer)
        ) {
            const certObject = input.drmAuth.serverCertificate;
            /** @type {{ [key: string]: string | ArrayBuffer | File }} */
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

    try {
        const { streams, urlAuthMapArray, opportunisticallyCachedSegments } =
            await workerService.postTask('start-analysis', {
                inputs: workerInputs,
            }).promise;

        // Cache segments
        if (opportunisticallyCachedSegments) {
            const { set } = useSegmentCacheStore.getState();
            for (const segment of opportunisticallyCachedSegments) {
                set(segment.uniqueId, {
                    status: segment.status,
                    data: segment.data,
                    parsedData: segment.parsedData,
                });
            }
        }

        // Failsafe check
        if (!streams[0]?.rawManifest?.trim()) {
            throw new Error('Manifest content is empty or invalid.');
        }

        // Reconstruct Maps
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
            stream.adAvails = [];
        });

        // Append to store instead of replacing
        analysisActions.appendStreams(streams, urlAuthMapArray);

        showToast({
            message: `Added ${streams.length} stream(s) to session.`,
            type: 'pass',
        });

        eventBus.dispatch(EVENTS.STATE.ANALYSIS_COMPLETE, {
            streams: useAnalysisStore.getState().streams,
        });
    } catch (error) {
        console.error('Failed to add streams:', error);
        eventBus.dispatch(EVENTS.ANALYSIS.ERROR, {
            message: `Failed to add streams: ${error.message}`,
            error,
        });
    }
}
