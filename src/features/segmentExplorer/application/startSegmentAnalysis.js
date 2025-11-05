import { eventBus } from '@/application/event-bus';
import { analysisActions } from '@/state/analysisStore';
import { uiActions } from '@/state/uiStore';
import { workerService } from '@/infrastructure/worker/workerService';
import { debugLog } from '@/shared/utils/debug';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';

/**
 * Orchestrates the business logic of starting a new analysis directly from segment files.
 * @param {object} params
 * @param {File[]} params.files - The array of File objects to analyze.
 */
export async function startSegmentAnalysisUseCase({ files }) {
    if (!files || files.length === 0) {
        eventBus.dispatch('ui:show-status', {
            message: 'Please select one or more segment files to analyze.',
            type: 'warn',
        });
        return;
    }

    const analysisStartTime = performance.now();
    debugLog(
        'startSegmentAnalysisUseCase',
        'Starting segment analysis pipeline...'
    );
    analysisActions.startAnalysis(); // Resets the application state
    eventBus.dispatch('analysis:started');

    try {
        const { set: setInCache } = useSegmentCacheStore.getState();

        const parsingPromises = files.map(async (file, index) => {
            const data = await file.arrayBuffer();
            const initialParsedData = await workerService.postTask(
                'parse-segment-structure',
                {
                    data,
                    url: file.name,
                }
            ).promise;

            const uniqueId = `local-segment-${index}-${
                initialParsedData.data?.boxes?.[0]?.offset ||
                initialParsedData.data?.packets?.[0]?.offset ||
                index
            }`;

            // ARCHITECTURAL FIX: Cache the raw data and parsed structure immediately.
            setInCache(uniqueId, {
                status: 200,
                data: data,
                parsedData: initialParsedData,
            });

            return { uniqueId, parsedData: initialParsedData };
        });

        const parsedSegmentsInfo = await Promise.all(parsingPromises);

        const syntheticStreamInput = {
            id: 1,
            name:
                files.length > 1
                    ? `${files.length} Local Files`
                    : files[0].name,
            url: '',
            file: files.length > 0 ? files[0] : null,
            auth: { headers: [], queryParams: [] },
            drmAuth: {
                licenseServerUrl: '',
                serverCertificate: null,
                headers: [],
                queryParams: [],
            },
        };

        /** @type {import('@/types.ts').Manifest} */
        const syntheticManifest = {
            id: null,
            type: 'static',
            profiles: 'local-file',
            minBufferTime: 0,
            publishTime: null,
            availabilityStartTime: null,
            timeShiftBufferDepth: null,
            minimumUpdatePeriod: null,
            duration: 0,
            maxSegmentDuration: null,
            maxSubsegmentDuration: null,
            programInformations: [],
            metrics: [],
            locations: [],
            patchLocations: [],
            serviceDescriptions: [],
            initializationSets: [],
            segmentFormat: parsedSegmentsInfo[0]?.parsedData?.format || 'unknown',
            periods: [],
            events: [],
            serializedManifest: {},
            summary: null,
            serverControl: null,
        };

        /** @type {import('@/types').Stream} */
        const syntheticStream = {
            id: 1,
            name: 'Local Segments',
            originalUrl: null,
            baseUrl: '',
            protocol: 'local',
            isPolling: false,
            manifest: syntheticManifest,
            rawManifest: 'Synthetic manifest for local segment analysis.',
            manifestUpdates: [],
            activeManifestUpdateId: null,
            dashRepresentationState: new Map(),
            hlsVariantState: new Map(),
            semanticData: new Map(),
            adAvails: [],
            inbandEvents: [],
            steeringInfo: null,
            mediaPlaylists: new Map(),
            activeMediaPlaylistUrl: null,
            featureAnalysis: { results: new Map(), manifestCount: 1 },
            adaptationEvents: [],
            auth: { headers: [], queryParams: [] },
            drmAuth: {
                licenseServerUrl: '',
                serverCertificate: null,
                headers: [],
                queryParams: [],
            },
            licenseServerUrl: '',
            segments: parsedSegmentsInfo.map(({ uniqueId, parsedData }, index) => ({
                repId: 'local-rep',
                type: 'Media',
                number: index + 1,
                uniqueId: uniqueId,
                resolvedUrl: `local://segment_${index}`,
                template: parsedData.url,
                time: 0,
                duration: 0,
                timescale: 1,
                gap: false,
                flags: [],
            })),
        };

        const allSegmentUrls = new Set(
            syntheticStream.segments.map((s) => s.uniqueId)
        );
        syntheticStream.dashRepresentationState.set('0-local-rep', {
            segments: syntheticStream.segments,
            currentSegmentUrls: allSegmentUrls,
            newlyAddedSegmentUrls: allSegmentUrls,
            diagnostics: {},
        });

        analysisActions.completeAnalysis(
            [syntheticStream],
            [],
            [syntheticStreamInput]
        );
        uiActions.setActiveTab('explorer');

        debugLog(
            'startSegmentAnalysisUseCase',
            `Segment Analysis Pipeline (success): ${(
                performance.now() - analysisStartTime
            ).toFixed(2)}ms`
        );
    } catch (error) {
        console.error('Error during segment analysis:', error);
        eventBus.dispatch('analysis:error', {
            message: `Failed to parse segment(s): ${error.message}`,
            error,
        });
        eventBus.dispatch('analysis:failed');
    }
}