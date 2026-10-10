/**
 * Creates the process-local synthetic stream shared by legacy rollback and the
 * bounded F-052 pipeline. No File or raw bytes are retained here.
 * @param {{ uniqueId: string, parsedData: object, label?: string }[]} parsed
 */
export function createLocalSegmentAnalysisResult(parsed) {
    const count = parsed.length;
    const streamInput = {
        id: 1,
        name:
            count > 1
                ? `${count} Local Files`
                : parsed[0]?.label || 'Local File',
        url: '',
        file: null,
        auth: { headers: [], queryParams: [] },
        drmAuth: {
            licenseServerUrl: '',
            serverCertificate: null,
            headers: [],
            queryParams: [],
        },
    };

    /** @type {import('@/types.ts').Manifest} */
    const manifest = {
        id: null,
        type: 'static',
        profiles: 'local-file',
        minBufferTime: 0,
        publishTime: null,
        availabilityStartTime: null,
        availabilityEndTime: null,
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
        segmentFormat: parsed[0]?.parsedData?.format || 'unknown',
        periods: [],
        events: [],
        serializedManifest: {},
        summary: null,
        serverControl: null,
    };

    /** @type {import('@/types.ts').MediaSegment[]} */
    const segments = parsed.map(({ uniqueId, parsedData, label }, index) => ({
        repId: 'local-rep',
        type: 'Media',
        number: index + 1,
        uniqueId,
        resolvedUrl: `local://segment_${index}`,
        template: label || parsedData.url || `Local segment ${index + 1}`,
        time: 0,
        duration: 0,
        timescale: 1,
        gap: false,
        flags: [],
    }));

    /** @type {import('@/types.ts').Stream} */
    const stream = {
        id: 1,
        name: 'Local Segments',
        originalUrl: null,
        baseUrl: '',
        protocol: 'local',
        isPolling: false,
        manifest,
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
        segments,
        segmentPollingReps: new Set(),
    };
    const urls = new Set(segments.map(({ uniqueId }) => uniqueId));
    stream.dashRepresentationState.set('0-local-rep', {
        segments,
        currentSegmentUrls: urls,
        newlyAddedSegmentUrls: urls,
        diagnostics: {},
    });

    return Object.freeze({ stream, streamInput });
}
