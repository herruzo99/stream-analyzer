import xmlFormatter from 'xml-formatter';
import { resolveAdAvailsInWorker } from '../../../features/advertising/application/resolveAdAvailWorker.js';
import { runChecks } from '../../../features/compliance/domain/engine.js';
import { validateSteeringManifest } from '../../../features/compliance/domain/hls/steering-validator.js';
import { generateFeatureAnalysis } from '../../../features/featureAnalysis/domain/analyzer.js';
import {
    analyzeDashCoverage,
    analyzeParserDrift,
} from '../../../features/parserCoverage/domain/coverage-analyzer.js';
import { parseManifest as parseDashManifest } from '../../parsing/dash/parser.js';
import { parseAllSegmentUrls as parseDashSegments } from '../../parsing/dash/segment-parser.js';
import { generateDashSummary } from '../../parsing/dash/summary-generator.js';
import { parseManifest as parseHlsManifest } from '../../parsing/hls/index.js';
import { generateHlsSummary } from '../../parsing/hls/summary-generator.js';

import { appLog } from '../../../shared/utils/debug.js';
import { fetchWithAuth } from '../http.js';
import { handleParseSegmentStructure } from '../parsingService.js';

const SCTE35_SCHEME_ID = 'urn:scte:scte35:2013:bin';

function createSyntheticManifest(url, name) {
    const manifest = {
        id: 'synthetic-manifest',
        type: 'static',
        minBufferTime: 0,
        duration: 0,
        profiles: 'urn:mpeg:dash:profile:isoff-on-demand:2011',
        publishTime: null,
        availabilityStartTime: null,
        availabilityEndTime: null,
        timeShiftBufferDepth: null,
        minimumUpdatePeriod: null,
        maxSegmentDuration: null,
        maxSubsegmentDuration: null,
        programInformations: [],
        metrics: [],
        locations: [],
        patchLocations: [],
        serviceDescriptions: [],
        initializationSets: [],
        segmentFormat: 'unknown',
        events: [],
        adAvails: [],
        tags: [],
        isMaster: false,
        periods: [
            {
                id: 'p0',
                start: 0,
                duration: 0,
                bitstreamSwitching: null,
                assetIdentifier: null,
                subsets: [],
                preselections: [],
                serviceDescriptions: [],
                eventStreams: [],
                events: [],
                adAvails: [],
                supplementalProperties: [],
                serializedManifest: {},
                adaptationSets: [
                    {
                        id: '0',
                        contentType: 'video',
                        mimeType: 'video/mp4',
                        lang: 'und',
                        profiles: null,
                        group: null,
                        bitstreamSwitching: null,
                        segmentAlignment: true,
                        subsegmentAlignment: true,
                        subsegmentStartsWithSAP: null,
                        width: null,
                        height: null,
                        maxWidth: null,
                        maxHeight: null,
                        maxFrameRate: null,
                        sar: null,
                        maximumSAPPeriod: null,
                        audioSamplingRate: null,
                        contentProtection: [],
                        audioChannelConfigurations: [],
                        framePackings: [],
                        ratings: [],
                        viewpoints: [],
                        accessibility: [],
                        labels: [],
                        groupLabels: [],
                        roles: [],
                        contentComponents: [],
                        resyncs: [],
                        outputProtection: null,
                        stableRenditionId: null,
                        bitDepth: null,
                        sampleRate: null,
                        channels: null,
                        assocLanguage: null,
                        characteristics: null,
                        forced: false,
                        serializedManifest: {},
                        inbandEventStreams: [],
                        representations: [
                            {
                                id: '1',
                                bandwidth: 0,
                                width: { value: 0, source: 'synthetic' },
                                height: { value: 0, source: 'synthetic' },
                                codecs: [],
                                serializedManifest: {
                                    BaseURL: [{ '#text': url }],
                                },
                                mimeType: 'video/mp4',
                                profiles: null,
                                qualityRanking: null,
                                dependencyId: null,
                                associationId: null,
                                associationType: null,
                                frameRate: null,
                                sar: null,
                                audioSamplingRate: null,
                                scanType: null,
                                startWithSAP: null,
                                selectionPriority: 1,
                                mediaStreamStructureId: null,
                                maximumSAPPeriod: null,
                                maxPlayoutRate: null,
                                codingDependency: null,
                                eptDelta: null,
                                pdDelta: null,
                                representationIndex: null,
                                failoverContent: null,
                                contentProtection: [],
                                audioChannelConfigurations: [],
                                framePackings: [],
                                ratings: [],
                                viewpoints: [],
                                accessibility: [],
                                labels: [],
                                groupLabels: [],
                                roles: [],
                                subRepresentations: [],
                                resyncs: [],
                                outputProtection: null,
                                extendedBandwidth: null,
                                stableVariantId: null,
                                pathwayId: null,
                                supplementalCodecs: null,
                                reqVideoLayout: null,
                                tag: null,
                                segmentProfiles: null,
                            },
                        ],
                    },
                ],
            },
        ],
        serializedManifest: {
            Period: [
                {
                    AdaptationSet: [
                        {
                            Representation: [
                                {
                                    BaseURL: [{ '#text': url }],
                                },
                            ],
                        },
                    ],
                },
            ],
        },
        summary: null,
        serverControl: null,
    };
    return {
        manifest,
        serializedManifest: manifest.serializedManifest,
        baseUrl: url,
    };
}

async function preProcessInput(input, signal) {
    let protocol, manifestString, finalUrl, isLive;
    let isDirectFile = false;

    const lowerName = (input.url || input.file?.name || '').toLowerCase();
    if (
        lowerName.endsWith('.mp4') ||
        lowerName.endsWith('.webm') ||
        lowerName.endsWith('.mkv') ||
        lowerName.endsWith('.mov')
    ) {
        isDirectFile = true;
    }

    if (input.file) {
        if (isDirectFile) {
            manifestString = '';
            finalUrl = input.url;
        } else {
            manifestString = await input.file.text();
            finalUrl = input.file.name;
        }
    } else {
        if (isDirectFile) {
            finalUrl = input.url;
            manifestString = '';
        } else {
            const response = await fetchWithAuth(
                input.url,
                input.auth,
                null,
                {},
                null,
                signal,
                { streamId: input.id, resourceType: 'manifest' },
                'GET'
            );

            if (!response.ok) {
                throw new Error(
                    `HTTP error ${response.status} fetching manifest from ${input.url}`
                );
            }

            const contentType = (
                response.headers['content-type'] || ''
            ).toLowerCase();

            const isManifestMime =
                contentType.includes('mpegurl') ||
                contentType.includes('dash+xml') ||
                contentType.includes('vnd.apple.mpegurl');

            if (
                !isManifestMime &&
                (contentType.includes('video/') ||
                    contentType.includes('audio/'))
            ) {
                isDirectFile = true;
                manifestString = '';
                finalUrl = response.url;
            } else {
                manifestString = await response.text();
                finalUrl = response.url;
            }
        }
    }

    if (isDirectFile) {
        protocol = 'direct';
        isLive = false;
    } else {
        const trimmedManifest = manifestString.trim();
        if (trimmedManifest.startsWith('#EXTM3U')) {
            protocol = 'hls';
        } else if (/<MPD/i.test(trimmedManifest)) {
            protocol = 'dash';
        } else if (/<SmoothStreamingMedia/i.test(trimmedManifest)) {
            throw new Error(
                'Unsupported Format: Microsoft Smooth Streaming is not supported.'
            );
        } else {
            if (manifestString.length < 500 && !manifestString.includes('<')) {
                throw new Error('Unknown manifest format.');
            }
            protocol = 'dash';
        }

        isLive =
            protocol === 'dash'
                ? /<MPD[^>]*type\s*=\s*["']dynamic["']/i.test(trimmedManifest)
                : false;
    }

    return { ...input, protocol, manifestString, finalUrl, isLive };
}

async function _fetchAndParseHlsPresentation(input, signal, postProgress) {
    appLog(
        'AnalysisHandler',
        'info',
        `Starting HLS Presentation Fetch for ${input.finalUrl}`
    );
    const { manifestString, finalUrl, auth } = input;
    const { manifest: masterIR, definedVariables } = await parseHlsManifest(
        manifestString,
        finalUrl
    );

    if (!masterIR.isMaster) {
        appLog(
            'AnalysisHandler',
            'info',
            'Manifest is a Media Playlist (not Master).'
        );
        const mediaPlaylists = new Map();
        mediaPlaylists.set(finalUrl, {
            manifest: masterIR,
            rawManifest: manifestString,
            lastFetched: new Date(),
            updates: [],
            activeUpdateId: null,
        });
        return {
            masterIR,
            mediaPlaylists,
            serializedManifestObject: masterIR.serializedManifest,
            finalUrl: finalUrl,
            manifestString: manifestString,
            definedVariables,
        };
    }

    const allReps = masterIR.periods
        .flatMap((p) => p.adaptationSets)
        .flatMap((as) => as.representations);

    const uriToVariantIdsMap = new Map();
    allReps.forEach((r) => {
        if (r.__variantUri) {
            if (!uriToVariantIdsMap.has(r.__variantUri)) {
                uriToVariantIdsMap.set(r.__variantUri, []);
            }
            uriToVariantIdsMap.get(r.__variantUri).push(r.id);
        }
    });

    const mediaPlaylistUris = Array.from(uriToVariantIdsMap.keys());
    const totalPlaylists = mediaPlaylistUris.length;

    if (postProgress)
        postProgress(`Fetching ${totalPlaylists} HLS Media Playlists...`);

    const mediaPlaylistPromises = mediaPlaylistUris.map((uri) =>
        fetchWithAuth(uri, auth, null, {}, null, signal)
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.text();
            })
            .then((text) => ({ uri, text }))
            .catch((err) => ({ uri, error: err }))
    );

    const mediaPlaylistResults = await Promise.all(mediaPlaylistPromises);
    const mediaPlaylists = new Map();
    let isStreamLive = false;

    for (const result of mediaPlaylistResults) {
        if ('text' in result && result.text) {
            if (!result.text.includes('#EXT-X-ENDLIST')) {
                isStreamLive = true;
            }
            try {
                const { manifest: mediaIR } = await parseHlsManifest(
                    result.text,
                    result.uri,
                    definedVariables
                );
                const variantIds = uriToVariantIdsMap.get(result.uri) || [];
                variantIds.forEach((variantId) => {
                    mediaPlaylists.set(variantId, {
                        manifest: mediaIR,
                        rawManifest: result.text,
                        lastFetched: new Date(),
                        updates: [],
                        activeUpdateId: null,
                    });
                });
            } catch (e) {
                appLog(
                    'AnalysisHandler',
                    'warn',
                    `Failed to parse media playlist ${result.uri}`,
                    e
                );
            }
        }
    }

    if (isStreamLive) masterIR.type = 'dynamic';

    return {
        masterIR,
        mediaPlaylists,
        serializedManifestObject: masterIR.serializedManifest,
        finalUrl: finalUrl,
        manifestString: manifestString,
        definedVariables,
    };
}

async function buildStreamObject(
    input,
    manifestIR,
    serializedManifestObject,
    finalBaseUrl,
    analysisResults,
    fetchAndParseSegment,
    signal
) {
    const {
        featureAnalysisResults,
        semanticData,
        steeringTag,
        complianceResults,
        coverageReport,
        segmentsByCompositeKey,
    } = analysisResults;

    const streamObject = {
        id: input.id,
        name:
            input.name ||
            (input.finalUrl
                ? new URL(input.finalUrl).hostname
                : input.file.name),
        originalUrl: input.url,
        resolvedUrl: input.finalUrl !== input.url ? input.finalUrl : null,
        baseUrl: finalBaseUrl,
        protocol: input.protocol === 'direct' ? 'dash' : input.protocol,
        isPolling: manifestIR.type === 'dynamic',
        manifest: manifestIR,
        rawManifest: input.manifestString || 'Binary/Direct File',
        auth: input.auth,
        drmAuth: input.drmAuth,
        steeringInfo: steeringTag,
        manifestUpdates: [],
        activeManifestUpdateId: null,
        mediaPlaylists: analysisResults.mediaPlaylists || new Map(),
        activeMediaPlaylistUrl: null,
        featureAnalysis: { results: featureAnalysisResults, manifestCount: 1 },
        hlsVariantState: new Map(),
        dashRepresentationState: new Map(),
        hlsDefinedVariables: manifestIR.hlsDefinedVariables,
        semanticData: semanticData,
        coverageReport,
        adAvails: manifestIR.adAvails || [],
        inbandEvents: [],
        adaptationEvents: [],
        segmentPollingReps: new Set(),
        initialTimeOffset: 0,
    };

    if (input.protocol === 'hls' && streamObject.mediaPlaylists.size > 0) {
        const uniqueAvails = new Map(
            streamObject.adAvails.map((a) => [a.id, a])
        );

        for (const playlistData of streamObject.mediaPlaylists.values()) {
            if (playlistData.manifest?.adAvails) {
                for (const avail of playlistData.manifest.adAvails) {
                    if (!uniqueAvails.has(avail.id)) {
                        uniqueAvails.set(avail.id, avail);
                    }
                }
            }
        }
        streamObject.adAvails = Array.from(uniqueAvails.values()).sort(
            (a, b) => a.startTime - b.startTime
        );
    }

    if (streamObject.manifest?.type === 'dynamic') {
        const manifest = streamObject.manifest;
        const dvrWindow = manifest.timeShiftBufferDepth || 0;
        const isZeroBasedSim = manifest.availabilityStartTime?.getTime() === 0;

        if (
            isZeroBasedSim &&
            streamObject.protocol === 'dash' &&
            Object.keys(segmentsByCompositeKey).length > 0
        ) {
            const liveEdgeTimes = Object.values(segmentsByCompositeKey)
                .map((repState) => repState.liveEdgeTime)
                .filter((t) => t !== null && t > 0);
            if (liveEdgeTimes.length > 0) {
                streamObject.initialTimeOffset = Math.max(
                    0,
                    Math.max(...liveEdgeTimes) - dvrWindow
                );
            }
        } else if (manifest.publishTime && manifest.availabilityStartTime) {
            const liveEdgeSeconds =
                (manifest.publishTime.getTime() -
                    manifest.availabilityStartTime.getTime()) /
                1000;
            streamObject.initialTimeOffset = Math.max(
                0,
                liveEdgeSeconds - dvrWindow
            );
        }
    }

    if (input.protocol !== 'direct') {
        const segmentFetchPromises = [];
        manifestIR.periods.forEach((period, periodIndex) => {
            for (const as of period.adaptationSets) {
                const hasScte35 = (as.inbandEventStreams || []).some(
                    (ies) => ies.schemeIdUri === SCTE35_SCHEME_ID
                );
                if (hasScte35) {
                    const rep = as.representations[0];
                    if (rep) {
                        const compositeKey = `${period.id ?? periodIndex}-${rep.id}`;
                        const repState = segmentsByCompositeKey[compositeKey];
                        const firstMediaSegment = (
                            repState?.segments || []
                        ).find((s) => s.type === 'Media');
                        if (firstMediaSegment) {
                            segmentFetchPromises.push(
                                fetchAndParseSegment(
                                    firstMediaSegment.resolvedUrl,
                                    'isobff',
                                    firstMediaSegment.range,
                                    input.auth,
                                    {
                                        streamId: input.id,
                                        resourceType: 'video',
                                    },
                                    signal
                                )
                                    .then((parsed) => ({
                                        ...parsed,
                                        sourceSegmentId:
                                            firstMediaSegment.uniqueId,
                                    }))
                                    .catch(() => null)
                            );
                        }
                    }
                }
            }
        });
        const parsedSegments = await Promise.all(segmentFetchPromises);
        for (const parsedSegment of parsedSegments) {
            if (parsedSegment) {
                self.postMessage({
                    type: 'worker:shaka-segment-loaded',
                    payload: {
                        uniqueId: parsedSegment.sourceSegmentId,
                        streamId: streamObject.id,
                        data: parsedSegment.rawBuffer,
                        parsedData: parsedSegment.parsedData,
                        status: 200,
                    },
                });
                if (parsedSegment.parsedData?.data?.events?.length > 0) {
                    streamObject.inbandEvents.push(
                        ...parsedSegment.parsedData.data.events.map((e) => ({
                            ...e,
                            sourceSegmentId: parsedSegment.sourceSegmentId,
                        }))
                    );
                }
            }
        }
    }

    if (streamObject.inbandEvents.length > 0) {
        const inbandAdAvails = streamObject.inbandEvents
            .filter((e) => e.scte35)
            .map((event) => ({
                id:
                    String(
                        event.scte35?.splice_command?.splice_event_id ||
                            event.scte35?.descriptors?.[0]
                                ?.segmentation_event_id
                    ) || String(event.startTime),
                startTime: event.startTime,
                duration:
                    event.duration ||
                    (event.scte35?.splice_command?.break_duration?.duration ||
                        0) / 90000,
                scte35Signal: event.scte35,
                adManifestUrl:
                    event.scte35?.descriptors?.[0]?.segmentation_upid_type ===
                    0x0c
                        ? event.scte35.descriptors[0].segmentation_upid
                        : null,
                creatives: [],
                detectionMethod: 'SCTE35_INBAND',
            }));
        const resolved = await resolveAdAvailsInWorker(inbandAdAvails);
        streamObject.adAvails.push(...resolved);
    }

    if (input.protocol === 'hls') {
        if (manifestIR.isMaster) {
            streamObject.mediaPlaylists.set('master', {
                manifest: manifestIR,
                rawManifest: streamObject.rawManifest,
                lastFetched: new Date(),
                // ARCHITECTURAL FIX: Link Master Playlist history to the main stream history
                // This ensures the initial fetch is visible in the Update Feed.
                updates: streamObject.manifestUpdates,
                activeUpdateId: null,
            });
            const allAdaptationSets = manifestIR.periods.flatMap(
                (p) => p.adaptationSets
            );
            for (const as of allAdaptationSets) {
                for (const rep of as.representations) {
                    const variantId = rep.id;
                    const uri =
                        rep.__variantUri || rep.serializedManifest.resolvedUri;
                    const mediaPlaylistData =
                        analysisResults.mediaPlaylists.get(variantId);
                    if (variantId) {
                        const originalSegments =
                            mediaPlaylistData?.manifest.segments || [];

                        const segments = originalSegments.map((s) => ({
                            ...s,
                            repId: variantId,
                        }));

                        streamObject.hlsVariantState.set(variantId, {
                            uri: uri,
                            historicalUris: [uri],
                            segments: segments,
                            currentSegmentUrls: new Set(
                                segments.map((s) => s.uniqueId)
                            ),
                            newlyAddedSegmentUrls: new Set(),
                            isLoading: false,
                            isPolling: false,
                            isExpanded: false,
                            displayMode: 'all',
                            error: null,
                        });
                    }
                }
            }
        } else {
            const variantId = streamObject.originalUrl;
            const segments = (manifestIR.segments || []).map((s) => ({
                ...s,
                repId: variantId,
            }));
            const allSegmentUrls = segments.map((s) => s.uniqueId);

            streamObject.hlsVariantState.set(variantId, {
                uri: variantId,
                historicalUris: [variantId],
                segments: segments,
                currentSegmentUrls: new Set(allSegmentUrls),
                newlyAddedSegmentUrls: new Set(),
                isLoading: false,
                isPolling: manifestIR.type === 'dynamic',
                isExpanded: true,
                displayMode: 'all',
                error: null,
            });
        }
    } else if (input.protocol === 'dash') {
        for (const [key, data] of Object.entries(segmentsByCompositeKey)) {
            const mediaSegments = data.segments || [];
            const allSegments = [data.initSegment, ...mediaSegments].filter(
                Boolean
            );
            const allSegmentUrls = new Set(allSegments.map((s) => s.uniqueId));

            // Find the representation in the parsed manifest to get metadata
            let repMetadata = null;
            if (manifestIR && manifestIR.periods) {
                for (const [
                    periodIndex,
                    period,
                ] of manifestIR.periods.entries()) {
                    for (const as of period.adaptationSets) {
                        for (const rep of as.representations) {
                            // MATCHING LOGIC: Must match parseDashSegments composite key
                            const compositeKey = `${period.id || periodIndex}-${rep.id}`;

                            if (compositeKey === key) {
                                repMetadata = {
                                    mediaType: as.contentType,
                                    mimeType: rep.mimeType || as.mimeType,
                                    codecs: rep.codecs?.[0]?.value || null,
                                };
                                break;
                            }
                        }
                        if (repMetadata) break;
                    }
                    if (repMetadata) break;
                }
            }

            streamObject.dashRepresentationState.set(key, {
                segments: allSegments,
                currentSegmentUrls: allSegmentUrls,
                newlyAddedSegmentUrls: new Set(),
                diagnostics: data.diagnostics,
                mediaType: repMetadata?.mediaType,
                mimeType: repMetadata?.mimeType,
                codecs: repMetadata?.codecs,
            });
        }
    }

    let formattedInitial = streamObject.rawManifest;

    if (
        streamObject.protocol === 'dash' &&
        streamObject.rawManifest.includes('<')
    ) {
        try {
            formattedInitial = xmlFormatter(formattedInitial, {
                indentation: '  ',
                lineSeparator: '\n',
                collapseContent: true,
            });
        } catch {
            /* ignore if not xml */
        }
    } else if (streamObject.protocol === 'hls') {
        const lines = formattedInitial.replace(/\r\n/g, '\n').split('\n');
        formattedInitial = lines
            .map((line) => {
                const trimmed = line.trim();
                if (!trimmed) return '';
                if (!trimmed.startsWith('#')) {
                    return '  ' + trimmed;
                }
                return trimmed;
            })
            .filter((l) => l.length > 0)
            .join('\n');
    }

    const initialDiffModel = formattedInitial
        .trimEnd()
        .split('\n')
        .map((line) => {
            const match = line.match(/^(\s*)(.*)$/);
            const indentation = match ? match[1] : '';
            const content = match ? match[2] : line.trim();

            return {
                type: 'common',
                indentation,
                content,
            };
        });

    streamObject.manifestUpdates.push({
        id: `${streamObject.id}-${Date.now()}`,
        sequenceNumber: 1,
        timestamp: new Date().toLocaleTimeString(),
        diffModel: initialDiffModel,
        rawManifest: streamObject.rawManifest,
        complianceResults: complianceResults || [],
        hasNewIssues: false,
        serializedManifest: serializedManifestObject,
        changes: { additions: 0, removals: 0, modifications: 0 },
    });

    // Fix active ID logic to point to the created update
    streamObject.activeManifestUpdateId = streamObject.manifestUpdates[0].id;
    if (streamObject.mediaPlaylists.has('master')) {
        streamObject.mediaPlaylists.get('master').activeUpdateId =
            streamObject.manifestUpdates[0].id;
    }

    return streamObject;
}

function serializeStreamForTransport(streamObject) {
    const serialized = { ...streamObject };
    const hlsVariantStateArray = [];
    for (const [key, value] of streamObject.hlsVariantState.entries()) {
        hlsVariantStateArray.push([
            key,
            {
                ...value,
                currentSegmentUrls: Array.from(value.currentSegmentUrls),
                newlyAddedSegmentUrls: Array.from(value.newlyAddedSegmentUrls),
            },
        ]);
    }
    serialized.hlsVariantState = hlsVariantStateArray;

    const dashRepStateArray = [];
    for (const [key, value] of streamObject.dashRepresentationState.entries()) {
        dashRepStateArray.push([
            key,
            {
                ...value,
                currentSegmentUrls: Array.from(value.currentSegmentUrls),
                newlyAddedSegmentUrls: Array.from(value.newlyAddedSegmentUrls),
            },
        ]);
    }
    serialized.dashRepresentationState = dashRepStateArray;

    if (serialized.featureAnalysis)
        serialized.featureAnalysis.results = Array.from(
            streamObject.featureAnalysis.results.entries()
        );
    serialized.semanticData = Array.from(streamObject.semanticData.entries());
    serialized.mediaPlaylists = Array.from(
        streamObject.mediaPlaylists.entries()
    );
    if (streamObject.manifest?.hlsDefinedVariables)
        serialized.manifest.hlsDefinedVariables = Array.from(
            streamObject.manifest.hlsDefinedVariables.entries()
        );
    serialized.segmentPollingReps = Array.from(
        streamObject.segmentPollingReps || []
    );

    return serialized;
}

export async function handleStartAnalysis({ inputs, postProgress }, signal) {
    const analysisStartTime = performance.now();

    try {
        const workerInputsPromises = inputs.map(async (input) => {
            const workerInput = { ...input, isDebug: input.isDebug };
            if (input.drmAuth.serverCertificate instanceof File) {
                workerInput.drmAuth.serverCertificate =
                    await input.drmAuth.serverCertificate.arrayBuffer();
            }
            return workerInput;
        });
        const workerInputs = await Promise.all(workerInputsPromises);
        const totalCount = workerInputs.length;

        const processingResults = [];

        for (let i = 0; i < workerInputs.length; i++) {
            const input = workerInputs[i];
            const streamIdentifier =
                input.name || input.url || `Input #${i + 1}`;
            postProgress(
                `Analyzing ${i + 1} of ${totalCount}: ${streamIdentifier}`
            );

            const preProcessed = await preProcessInput(input, signal);

            let manifestIR,
                serializedManifestObject,
                finalBaseUrl,
                mediaPlaylists = new Map();
            let segmentsToCache = [];
            let segmentsByCompositeKey = {};

            const fetchAndParseSegment = async (
                url,
                formatHint,
                range = null,
                auth = null,
                loggingContext = {},
                abortSignal = null
            ) => {
                const response = await fetchWithAuth(
                    url,
                    auth,
                    range,
                    {},
                    null,
                    abortSignal,
                    loggingContext,
                    'GET'
                );
                if (!response.ok)
                    throw new Error(`HTTP error ${response.status}`);
                const data = await response.arrayBuffer();
                const parsedData = await handleParseSegmentStructure({
                    data,
                    formatHint,
                    url,
                    context: {},
                });
                return { parsedData, rawBuffer: data };
            };

            const context = {
                fetchAndParseSegment,
                manifestUrl: preProcessed.finalUrl,
                isLive: preProcessed.isLive,
                signal,
            };

            if (preProcessed.protocol === 'direct') {
                appLog(
                    'handleStartAnalysis',
                    'info',
                    `Processing direct file: ${preProcessed.finalUrl}`
                );
                const synth = createSyntheticManifest(
                    preProcessed.finalUrl,
                    preProcessed.name
                );
                manifestIR = synth.manifest;
                serializedManifestObject = synth.serializedManifest;
                finalBaseUrl = synth.baseUrl;
            } else if (preProcessed.protocol === 'hls') {
                const hlsResult = await _fetchAndParseHlsPresentation(
                    preProcessed,
                    signal,
                    postProgress
                );
                manifestIR = hlsResult.masterIR;
                serializedManifestObject = hlsResult.serializedManifestObject;
                finalBaseUrl = hlsResult.finalUrl;
                mediaPlaylists = hlsResult.mediaPlaylists;
                preProcessed.isLive = manifestIR.type === 'dynamic';

                const hlsSummaryResult = await generateHlsSummary(manifestIR, {
                    ...context,
                    mediaPlaylists,
                });
                manifestIR.summary = hlsSummaryResult.summary;
                segmentsToCache =
                    hlsSummaryResult.opportunisticallyCachedSegments;
            } else {
                const { manifest, serializedManifest, baseUrl } =
                    await parseDashManifest(
                        preProcessed.manifestString,
                        preProcessed.finalUrl
                    );
                manifestIR = manifest;
                serializedManifestObject = serializedManifest;
                finalBaseUrl = baseUrl;
                segmentsByCompositeKey = await parseDashSegments(
                    serializedManifestObject,
                    finalBaseUrl,
                    { auth: input.auth, now: Date.now() }
                );

                manifestIR.summary = await generateDashSummary(
                    manifestIR,
                    serializedManifestObject,
                    {
                        ...context,
                        manifestUrl: finalBaseUrl,
                        onInitSegmentParsed: (seg) => {
                            segmentsToCache.push({
                                uniqueId: seg.uniqueId,
                                data: seg.data,
                                parsedData: seg.parsedData,
                                status: 200,
                            });
                        },
                        onSegmentFetched: (seg) => {
                            segmentsToCache.push({
                                uniqueId: seg.uniqueId,
                                data: seg.data,
                                parsedData: seg.parsedData,
                                status: 200,
                            });
                        },
                    }
                );
            }

            segmentsByCompositeKey = await parseDashSegments(
                serializedManifestObject,
                finalBaseUrl,
                {
                    auth: input.auth,
                    now: Date.now(),
                    onSegmentFetched: (seg) => {
                        segmentsToCache.push({
                            uniqueId: seg.uniqueId,
                            data: seg.data,
                            parsedData: seg.parsedData,
                            status: 200,
                        });
                    },
                }
            );

            if (manifestIR.adAvails && manifestIR.adAvails.length > 0) {
                manifestIR.adAvails = await resolveAdAvailsInWorker(
                    manifestIR.adAvails
                );
            }

            const manifestObjectForChecks =
                preProcessed.protocol === 'hls'
                    ? manifestIR
                    : serializedManifestObject;

            const complianceResults = runChecks(
                // @ts-ignore
                manifestObjectForChecks,
                preProcessed.protocol === 'direct'
                    ? 'dash'
                    : preProcessed.protocol,
                { isLive: preProcessed.isLive, segmentsByCompositeKey }
            );

            const rawInitialAnalysis = generateFeatureAnalysis(
                // @ts-ignore
                manifestIR,
                preProcessed.protocol === 'direct'
                    ? 'dash'
                    : preProcessed.protocol,
                serializedManifestObject
            );
            const featureAnalysisResults = new Map(
                Object.entries(rawInitialAnalysis)
            );

            const coverageReport = input.isDebug
                ? [
                      ...(preProcessed.protocol === 'dash'
                          ? analyzeDashCoverage(serializedManifestObject)
                          : []),
                      // @ts-ignore
                      ...analyzeParserDrift(manifestIR),
                  ]
                : [];

            const semanticData = new Map();
            // @ts-ignore
            if (preProcessed.protocol === 'hls' && manifestIR.isMaster) {
                // @ts-ignore
                const steeringTag = (manifestIR.tags || []).find(
                    (t) => t.name === 'EXT-X-CONTENT-STEERING'
                );
                if (steeringTag) {
                    const steeringUri = new URL(
                        steeringTag.value['SERVER-URI'],
                        finalBaseUrl
                    ).href;
                    semanticData.set(
                        'steeringValidation',
                        await validateSteeringManifest(steeringUri)
                    );
                }
            }

            const analysisResults = {
                featureAnalysisResults,
                semanticData,
                steeringTag: null,
                complianceResults,
                coverageReport,
                mediaPlaylists,
                segmentsByCompositeKey,
            };

            const streamObject = await buildStreamObject(
                preProcessed,
                manifestIR,
                serializedManifestObject,
                finalBaseUrl,
                analysisResults,
                fetchAndParseSegment,
                signal
            );

            const segmentsWithId = segmentsToCache.map((segment) => ({
                ...segment,
                streamId: streamObject.id,
            }));

            processingResults.push({
                streamObject,
                segmentsToCache: segmentsWithId,
            });
        }

        const streamObjects = processingResults.map((r) => r.streamObject);
        const allCachedSegments = processingResults.flatMap(
            (r) => r.segmentsToCache
        );
        const urlAuthMap = new Map();

        for (const stream of streamObjects) {
            const context = { streamId: stream.id, auth: stream.auth };
            if (stream.originalUrl) urlAuthMap.set(stream.originalUrl, context);
        }
        const urlAuthMapArray = Array.from(urlAuthMap.entries());
        const workerResults = streamObjects.map(serializeStreamForTransport);

        appLog(
            'handleStartAnalysis',
            'info',
            `Analysis complete in ${(
                performance.now() - analysisStartTime
            ).toFixed(2)}ms`
        );

        return {
            streams: workerResults,
            urlAuthMapArray,
            opportunisticallyCachedSegments: allCachedSegments,
        };
    } catch (error) {
        appLog(
            'handleStartAnalysis',
            'error',
            'Analysis pipeline failed.',
            error
        );
        throw error;
    }
}
