import { parseManifest as parseDashManifest } from '@/infrastructure/parsing/dash/parser';
import { parseManifest as parseHlsManifest } from '@/infrastructure/parsing/hls/index';
import { generateDashSummary } from '@/infrastructure/parsing/dash/summary-generator';
import { generateHlsSummary } from '@/infrastructure/parsing/hls/summary-generator';
import { runChecks } from '@/features/compliance/domain/engine';
import { validateSteeringManifest } from '@/features/compliance/domain/hls/steering-validator';
import {
    analyzeDashCoverage,
    analyzeParserDrift,
} from '@/features/parserCoverage/domain/coverage-analyzer';
import { generateFeatureAnalysis } from '@/features/featureAnalysis/domain/analyzer';
import { parseAllSegmentUrls as parseDashSegments } from '@/infrastructure/parsing/dash/segment-parser';
import { diffManifest } from '@/ui/shared/diff';
import { handleParseSegmentStructure } from '../parsingService.js';
import { fetchWithAuth } from '../http.js';
import xmlFormatter from 'xml-formatter';
import { appLog } from '@/shared/utils/debug';
import { resolveAdAvailsInWorker } from '@/features/advertising/application/resolveAdAvailWorker';

const SCTE35_SCHEME_ID = 'urn:scte:scte35:2013:bin';

async function preProcessInput(input, signal) {
    let protocol, manifestString, finalUrl;

    if (input.file) {
        manifestString = await input.file.text();
        finalUrl = input.file.name;
    } else {
        const response = await fetchWithAuth(
            input.url,
            input.auth,
            null,
            {},
            null,
            signal,
            { streamId: input.id, resourceType: 'manifest' }
        );

        if (!response.ok) {
            throw new Error(
                `HTTP error ${response.status} fetching manifest from ${input.url}`
            );
        }
        manifestString = await response.text();
        finalUrl = response.url; // Capture the final URL after redirects

        const wasRedirected = response.url !== input.url;

        if (!manifestString || manifestString.trim() === '') {
            if (wasRedirected) {
                throw new Error(
                    `Manifest fetch redirected to a new location which returned an empty response. Original: ${input.url}, Final: ${response.url}`
                );
            } else {
                throw new Error(
                    'Manifest content is empty. This may be due to a network or CORS issue.'
                );
            }
        }
    }

    const trimmedManifest = manifestString.trim();
    if (trimmedManifest.startsWith('#EXTM3U')) {
        protocol = 'hls';
    } else if (/<MPD/i.test(trimmedManifest)) {
        protocol = 'dash';
    } else if (/<SmoothStreamingMedia/i.test(trimmedManifest)) {
        throw new Error(
            'Unsupported Format: This appears to be a Microsoft Smooth Streaming manifest, which is not supported.'
        );
    } else {
        const name = (finalUrl || input.file?.name || '').toLowerCase();
        protocol = name.includes('.m3u8') ? 'hls' : 'dash';
    }

    return { ...input, protocol, manifestString, finalUrl };
}

async function buildStreamObject(
    input,
    manifestIR,
    serializedManifestObject,
    finalBaseUrl,
    analysisResults,
    fetchAndParseSegment
) {
    const {
        featureAnalysisResults,
        semanticData,
        steeringTag,
        complianceResults,
        coverageReport,
    } = analysisResults;

    const streamObject = {
        id: input.id,
        name:
            input.name ||
            (input.finalUrl
                ? new URL(input.finalUrl).hostname
                : input.file.name),
        originalUrl: input.finalUrl,
        baseUrl: finalBaseUrl,
        protocol: input.protocol,
        isPolling: manifestIR.type === 'dynamic',
        manifest: manifestIR,
        rawManifest: input.manifestString,
        auth: input.auth,
        drmAuth: input.drmAuth,
        steeringInfo: steeringTag,
        manifestUpdates: [],
        activeManifestUpdateId: null,
        mediaPlaylists: new Map(),
        activeMediaPlaylistUrl: null,
        featureAnalysis: {
            results: featureAnalysisResults,
            manifestCount: 1,
        },
        hlsVariantState: new Map(),
        dashRepresentationState: new Map(),
        hlsDefinedVariables: manifestIR.hlsDefinedVariables,
        semanticData: semanticData,
        coverageReport,
        adAvails: manifestIR.adAvails || [],
        inbandEvents: [],
        adaptationEvents: [],
        segmentPollingReps: new Set(),
    };

    let segmentsByCompositeKey = {};
    if (input.protocol === 'dash') {
        segmentsByCompositeKey = await parseDashSegments(
            serializedManifestObject,
            streamObject.baseUrl,
            { auth: input.auth, now: Date.now() }
        );
    }

    // --- Proactive In-band Event Discovery ---
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
                    const firstMediaSegment = (repState?.segments || []).find(
                        (s) => s.type === 'Media'
                    );

                    if (firstMediaSegment) {
                        segmentFetchPromises.push(
                            fetchAndParseSegment(
                                firstMediaSegment.resolvedUrl,
                                'isobff', // Assume isobff for inband events for now
                                firstMediaSegment.range,
                                'video'
                            )
                                .then((parsedSegment) => ({
                                    ...parsedSegment,
                                    sourceSegmentId: firstMediaSegment.uniqueId,
                                }))
                                .catch((e) => {
                                    appLog(
                                        'analysisHandler',
                                        'warn',
                                        `Failed to pre-fetch/parse segment for in-band events: ${e.message}`
                                    );
                                    return null;
                                })
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
            if (
                parsedSegment.parsedData?.data?.events &&
                parsedSegment.parsedData.data.events.length > 0
            ) {
                const eventsWithSource =
                    parsedSegment.parsedData.data.events.map((event) => ({
                        ...event,
                        sourceSegmentId: parsedSegment.sourceSegmentId,
                    }));
                streamObject.inbandEvents.push(...eventsWithSource);
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
                detectionMethod: /** @type {const} */ ('SCTE35_INBAND'),
            }));
        const resolvedInbandAvails =
            await resolveAdAvailsInWorker(inbandAdAvails);
        streamObject.adAvails.push(...resolvedInbandAvails);
    }

    if (input.protocol === 'hls') {
        if (manifestIR.isMaster) {
            streamObject.mediaPlaylists.set('master', {
                manifest: manifestIR,
                rawManifest: streamObject.rawManifest,
                lastFetched: new Date(),
            });

            const allAdaptationSets = manifestIR.periods.flatMap(
                (p) => p.adaptationSets
            );
            for (const as of allAdaptationSets) {
                for (const rep of as.representations) {
                    const uri =
                        rep.__variantUri ||
                        rep.serializedManifest?.resolvedUri ||
                        rep.id;
                    if (uri && !streamObject.hlsVariantState.has(uri)) {
                        streamObject.hlsVariantState.set(uri, {
                            segments: [],
                            currentSegmentUrls: new Set(),
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
            const allSegmentUrls = (manifestIR.segments || []).map(
                (s) => s.uniqueId
            );
            streamObject.hlsVariantState.set(streamObject.originalUrl, {
                segments: manifestIR.segments || [],
                currentSegmentUrls: new Set(allSegmentUrls),
                newlyAddedSegmentUrls: new Set(allSegmentUrls),
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
            streamObject.dashRepresentationState.set(key, {
                segments: allSegments,
                currentSegmentUrls: allSegmentUrls,
                newlyAddedSegmentUrls: allSegmentUrls,
                diagnostics: data.diagnostics,
            });
        }
    }

    if (streamObject.inbandEvents.length > 0) {
        const eventsBySegmentId = streamObject.inbandEvents.reduce(
            (acc, event) => {
                if (event.sourceSegmentId) {
                    if (!acc[event.sourceSegmentId])
                        acc[event.sourceSegmentId] = [];
                    acc[event.sourceSegmentId].push(event);
                }
                return acc;
            },
            {}
        );

        const attachToRepState = (currentRepStateMap) => {
            const newRepStateMap = new Map(currentRepStateMap);
            for (const [key, repState] of newRepStateMap.entries()) {
                let wasModified = false;
                const newSegments = repState.segments.map((segment) => {
                    const eventsForSeg = eventsBySegmentId[segment.uniqueId];
                    if (eventsForSeg) {
                        wasModified = true;
                        // --- ENRICHMENT: Also attach mediaInfo if available from parsed segment ---
                        const parsedSegment = parsedSegments.find(s => s?.sourceSegmentId === segment.uniqueId);
                        return {
                            ...segment,
                            inbandEvents: [
                                ...(segment.inbandEvents || []),
                                ...eventsForSeg,
                            ],
                            mediaInfo: parsedSegment?.parsedData?.mediaInfo || segment.mediaInfo,
                        };
                    }
                    return segment;
                });
                if (wasModified) {
                    newRepStateMap.set(key, {
                        ...repState,
                        segments: newSegments,
                    });
                }
            }
            return newRepStateMap;
        };

        if (streamObject.dashRepresentationState) {
            streamObject.dashRepresentationState = attachToRepState(streamObject.dashRepresentationState);
        }
        if (streamObject.hlsVariantState) {
            streamObject.hlsVariantState = attachToRepState(streamObject.hlsVariantState);
        }
        streamObject.inbandEvents = [];
    }

    let formattedInitial = streamObject.rawManifest;
    if (streamObject.protocol === 'dash') {
        formattedInitial = xmlFormatter(formattedInitial, {
            indentation: '  ',
            lineSeparator: '\n',
        });
    }
    const { diffHtml, changes } = diffManifest(
        '',
        formattedInitial,
        streamObject.protocol
    );

    streamObject.manifestUpdates.push({
        id: `${streamObject.id}-${Date.now()}`,
        sequenceNumber: 1,
        timestamp: new Date().toLocaleTimeString(),
        diffHtml,
        rawManifest: streamObject.rawManifest,
        complianceResults,
        hasNewIssues: false,
        serializedManifest: serializedManifestObject,
        changes: changes,
    });

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
        const serializedValue = {
            ...value,
            currentSegmentUrls: Array.from(value.currentSegmentUrls),
            newlyAddedSegmentUrls: Array.from(value.newlyAddedSegmentUrls),
        };
        dashRepStateArray.push([key, serializedValue]);
    }
    serialized.dashRepresentationState = dashRepStateArray;

    if (serialized.featureAnalysis) {
        serialized.featureAnalysis.results = Array.from(
            streamObject.featureAnalysis.results.entries()
        );
    }
    serialized.semanticData = Array.from(streamObject.semanticData.entries());
    serialized.mediaPlaylists = Array.from(
        streamObject.mediaPlaylists.entries()
    );
    if (streamObject.manifest?.hlsDefinedVariables) {
        serialized.manifest.hlsDefinedVariables = Array.from(
            streamObject.manifest.hlsDefinedVariables.entries()
        );
    }

    serialized.segmentPollingReps = Array.from(
        streamObject.segmentPollingReps || []
    );

    return serialized;
}

export async function handleStartAnalysis({ inputs }, signal) {
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

        const processingPromises = workerInputs.map(async (input) => {
            const preProcessed = await preProcessInput(input, signal);

            const getBaseUrlDirectory = (url) => {
                try {
                    const parsedUrl = new URL(url);
                    parsedUrl.pathname = parsedUrl.pathname.substring(
                        0,
                        parsedUrl.pathname.lastIndexOf('/') + 1
                    );
                    return parsedUrl.href;
                } catch (_e) {
                    return url.substring(0, url.lastIndexOf('/') + 1);
                }
            };
            const baseUrlDirectory = getBaseUrlDirectory(preProcessed.finalUrl);

            let manifestIR, serializedManifestObject, finalBaseUrl;
            let segmentsToCache = [];
            if (preProcessed.protocol === 'hls') {
                const { manifest, definedVariables, baseUrl } =
                    await parseHlsManifest(
                        preProcessed.manifestString,
                        baseUrlDirectory
                    );
                manifestIR = manifest;
                serializedManifestObject = manifest.serializedManifest;
                manifestIR.hlsDefinedVariables = definedVariables;
                finalBaseUrl = baseUrl;
            } else {
                const { manifest, serializedManifest, baseUrl } =
                    await parseDashManifest(
                        preProcessed.manifestString,
                        baseUrlDirectory
                    );
                manifestIR = manifest;
                serializedManifestObject = serializedManifest;
                finalBaseUrl = baseUrl;
            }

            if (manifestIR.adAvails && manifestIR.adAvails.length > 0) {
                const enrichedAdAvails = await resolveAdAvailsInWorker(
                    manifestIR.adAvails
                );
                manifestIR.adAvails = enrichedAdAvails;
            }

            const manifestObjectForChecks =
                preProcessed.protocol === 'hls'
                    ? manifestIR
                    : serializedManifestObject;
            const complianceResults = runChecks(
                manifestObjectForChecks,
                preProcessed.protocol
            );
            const rawInitialAnalysis = generateFeatureAnalysis(
                manifestIR,
                preProcessed.protocol,
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
                      ...analyzeParserDrift(manifestIR),
                  ]
                : [];
            const semanticData = new Map();

            const fetchAndParseSegment = async (
                url,
                formatHint,
                range = null,
                /** @type {import('@/types').ResourceType} */ resourceType = 'video'
            ) => {
                const response = await fetchWithAuth(
                    url,
                    input.auth,
                    range,
                    {},
                    null,
                    signal,
                    { streamId: input.id, resourceType }
                );
                if (!response.ok) {
                    throw new Error(
                        `HTTP error ${response.status} for segment ${url}`
                    );
                }
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
                fetchAndParseSegment: fetchAndParseSegment,
                manifestUrl: preProcessed.finalUrl,
                fetchWithAuth: (url) =>
                    fetchWithAuth(url, input.auth, null, {}, null, signal, {
                        streamId: input.id,
                        resourceType: 'manifest',
                    }),
                parseHlsManifest: (manifestString, baseUrl, parentVars) =>
                    parseHlsManifest(
                        manifestString,
                        baseUrl,
                        parentVars,
                        context
                    ),
            };

            if (preProcessed.protocol === 'hls') {
                const hlsSummaryResult = await generateHlsSummary(
                    manifestIR,
                    context
                );
                manifestIR.summary = hlsSummaryResult.summary;
                segmentsToCache =
                    hlsSummaryResult.opportunisticallyCachedSegments;
            } else {
                manifestIR.summary = await generateDashSummary(
                    manifestIR,
                    serializedManifestObject,
                    {
                        ...context,
                        manifestUrl: finalBaseUrl,
                    }
                );
            }

            const steeringTag =
                preProcessed.protocol === 'hls' && manifestIR.isMaster
                    ? (manifestIR.tags || []).find(
                          (t) => t.name === 'EXT-X-CONTENT-STEERING'
                      )
                    : null;
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

            const analysisResults = {
                featureAnalysisResults,
                semanticData,
                steeringTag,
                complianceResults,
                coverageReport,
            };

            const streamObject = await buildStreamObject(
                preProcessed,
                manifestIR,
                serializedManifestObject,
                finalBaseUrl,
                analysisResults,
                fetchAndParseSegment
            );

            // Associate streamId with each cached segment
            const segmentsWithId = segmentsToCache.map((segment) => ({
                ...segment,
                streamId: streamObject.id,
            }));

            return { streamObject, segmentsToCache: segmentsWithId };
        });

        const processingResults = await Promise.all(processingPromises);
        const streamObjects = processingResults.map((r) => r.streamObject);
        const allCachedSegments = processingResults.flatMap(
            (r) => r.segmentsToCache
        );
        const urlAuthMap = new Map();
        for (const stream of streamObjects) {
            const context = { streamId: stream.id, auth: stream.auth };
            if (stream.originalUrl) urlAuthMap.set(stream.originalUrl, context);
            if (stream.baseUrl) urlAuthMap.set(stream.baseUrl, context);
            if (stream.hlsVariantState) {
                for (const [uri, state] of stream.hlsVariantState.entries()) {
                    urlAuthMap.set(uri, context);
                    if (state.segments) {
                        for (const seg of state.segments) {
                            urlAuthMap.set(seg.resolvedUrl, context);
                        }
                    }
                }
            }
            if (stream.dashRepresentationState) {
                for (const [
                    ,
                    state,
                ] of stream.dashRepresentationState.entries()) {
                    if (state.segments) {
                        for (const seg of state.segments) {
                            urlAuthMap.set(seg.resolvedUrl, context);
                        }
                    }
                }
            }
        }
        const urlAuthMapArray = Array.from(urlAuthMap.entries());

        const workerResults = streamObjects.map(serializeStreamForTransport);

        if (
            workerResults.length > 0 &&
            !workerResults[0]?.rawManifest?.trim()
        ) {
            throw new Error(
                'Manifest content is empty after processing. This may be due to a network or CORS issue.'
            );
        }

        appLog(
            'handleStartAnalysis',
            'info',
            `Initial Analysis Pipeline (success): ${(
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