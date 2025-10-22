import { eventBus } from '@/application/event-bus';
import { analysisActions } from '@/state/analysisStore';
import { uiActions } from '@/state/uiStore';
import { workerService } from '@/infrastructure/worker/workerService';
import { debugLog } from '@/shared/utils/debug';

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
        const parsingPromises = files.map(async (file) => {
            const data = await file.arrayBuffer();
            // The worker's 'parse-segment-structure' handler is perfect for this.
            return workerService.postTask('parse-segment-structure', {
                data,
                url: file.name,
            });
        });

        const parsedSegments = await Promise.all(parsingPromises);

        /** @type {import('@/types').Manifest} */
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
            segmentFormat: parsedSegments[0]?.format || 'unknown',
            periods: [],
            events: [],
            serializedManifest: {},
            summary: null,
            serverControl: null,
        };

        // Construct a "synthetic" stream object to hold the segments.
        // This allows us to reuse the entire results view.
        /** @type {import('@/types').Stream} */
        const syntheticStream = {
            id: 1,
            name: 'Local Segments',
            originalUrl: null,
            baseUrl: '',
            protocol: 'local', // A special protocol type for this workflow
            isPolling: false,
            manifest: syntheticManifest,
            rawManifest: 'Synthetic manifest for local segment analysis.',
            manifestUpdates: [],
            activeManifestUpdateIndex: 0,
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

            // Populate a synthetic representation with the uploaded segments
            segments: parsedSegments.map((ps, index) => ({
                repId: 'local-rep',
                type: 'Media',
                number: index + 1,
                uniqueId: `local-segment-${index}-${ps.data?.boxes?.[0]?.offset || ps.data?.packets?.[0]?.offset || index}`,
                resolvedUrl: `local://segment_${index}`,
                template: ps.url,
                time: 0,
                duration: 0,
                timescale: 1,
                gap: false,
                flags: [],
                // Attach the full parsed data for later use
                parsedData: ps,
            })),
        };

        // Use the generic `dashRepresentationState` to hold the segments
        syntheticStream.dashRepresentationState.set('0-local-rep', {
            segments: syntheticStream.segments,
            freshSegmentUrls: new Set(
                syntheticStream.segments.map((s) => s.uniqueId)
            ),
            diagnostics: {},
        });

        // Use the existing action to transition the app to the results view.
        analysisActions.completeAnalysis([syntheticStream]);
        uiActions.setActiveTab('explorer'); // Go directly to the segment explorer

        debugLog(
            'startSegmentAnalysisUseCase',
            `Segment Analysis Pipeline (success): ${(performance.now() - analysisStartTime).toFixed(2)}ms`
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