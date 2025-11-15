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
    let protocol, manifestString, finalUrl, isLive;

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
    
    // Liveness for HLS will be determined after parsing all media playlists.
    isLive =
        protocol === 'dash'
            ? /<MPD[^>]*type\s*=\s*["']dynamic["']/.test(trimmedManifest)
            : false; // Default HLS to false, will be updated later.

    return { ...input, protocol, manifestString, finalUrl, isLive };
}

async function _fetchAndParseHlsPresentation(input, signal) {
    const { manifestString, finalUrl, auth } = input;
    const {
        manifest: masterIR,
        definedVariables,
        baseUrl: masterBaseUrl,
    } = await parseHlsManifest(manifestString, finalUrl);

    if (!masterIR.isMaster) {
        // If it's a media playlist, the URL is the only key we have.
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
    
    const uriToVariantIdMap = new Map(allReps.map(r => [r.__variantUri, r.id]));

    const mediaPlaylistUris = [...uriToVariantIdMap.keys()].filter(Boolean);

    const mediaPlaylistPromises = mediaPlaylistUris.map((uri) =>
        fetchWithAuth(uri, auth, null, {}, null, signal)
            .then((res) => {
                if (!res.ok)
                    throw new Error(`HTTP ${res.status} fetching ${uri}`);
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
                const variantId = uriToVariantIdMap.get(result.uri);
                if (variantId) {
                    mediaPlaylists.set(variantId, {
                        manifest: mediaIR,
                        rawManifest: result.text,
                        lastFetched: new Date(),
                        updates: [],
                        activeUpdateId: null,
                    });
                }
            } catch (e) {
                appLog(
                    'analysisHandler',
                    'warn',
                    `Failed to parse media playlist ${result.uri}`,
                    e
                );
            }
        }
    }

    if (isStreamLive) {
        masterIR.type = 'dynamic';
    }

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
        protocol: input.protocol,
        isPolling: manifestIR.type === 'dynamic',
        manifest: manifestIR,
        rawManifest: input.manifestString,
        auth: input.auth,
        drmAuth: input.drmAuth,
        steeringInfo: steeringTag,
        manifestUpdates: [],
        activeManifestUpdateId: null,
        mediaPlaylists: analysisResults.mediaPlaylists || new Map(),
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
                                input.auth,
                                { streamId: input.id, resourceType: 'video' },
                                signal
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
                updates: streamObject.manifestUpdates,
                activeUpdateId: streamObject.manifestUpdates[0]?.id || null,
            });

            const allAdaptationSets = manifestIR.periods.flatMap(
                (p) => p.adaptationSets
            );
            for (const as of allAdaptationSets) {
                for (const rep of as.representations) {
                    const variantId = rep.id; // Use the stable ID as the key
                    const uri =
                        rep.__variantUri ||
                        rep.serializedManifest.resolvedUri;
                    if (
                        variantId &&
                        !streamObject.hlsVariantState.has(variantId)
                    ) {
                        const mediaPlaylistData = analysisResults.mediaPlaylists.get(variantId);
                        streamObject.hlsVariantState.set(variantId, {
                            uri: uri, // Store the current URI
                            historicalUris: [uri], // Start historical tracking
                            segments: mediaPlaylistData?.manifest.segments || [],
                            currentSegmentUrls: new Set((mediaPlaylistData?.manifest.segments || []).map(s => s.uniqueId)),
                            newlyAddedSegmentUrls: new Set((mediaPlaylistData?.manifest.segments || []).map(s => s.uniqueId)),
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
            // Media playlist directly
            const variantId = streamObject.originalUrl;
            const allSegmentUrls = (manifestIR.segments || []).map(
                (s) => s.uniqueId
            );
            streamObject.hlsVariantState.set(variantId, {
                uri: variantId, // URI is the ID here
                historicalUris: [variantId],
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
                if (!repState.segments) continue;
                let repModified = false;
                const newSegments = repState.segments.map((segment) => {
                    const eventsForSeg = eventsBySegmentId[segment.uniqueId];
                    if (eventsForSeg) {
                        repModified = true;
                        const newFlags = new Set(segment.flags || []);
                        if(eventsForSeg.some(e => e.scte35)) {
                            newFlags.add('scte35');
                        }
                        return {
                            ...segment,
                            inbandEvents: [...(segment.inbandEvents || []), ...eventsForSeg],
                            flags: Array.from(newFlags),
                        };
                    }
                    return segment;
                });
                if (repModified) {
                    newRepStateMap.set(key, { ...repState, segments: newSegments });
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

    // --- ARCHITECTURAL FIX: Create a baseline diff model, not a diff ---
    const initialDiffModel = formattedInitial
        .trimEnd()
        .split('\n')
        .map(line => ({
            type: 'common',
            indentation: line.match(/^(\s*)/)?.[1] || '',
            content: line.trim(),
        }));

    const changes = { additions: 0, removals: 0, modifications: 0 };
    // --- END FIX ---

    streamObject.manifestUpdates.push({
        id: `${streamObject.id}-${Date.now()}`,
        sequenceNumber: 1,
        timestamp: new Date().toLocaleTimeString(),
        diffModel: initialDiffModel,
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
            const streamIdentifier = input.name || input.url || `Input #${i + 1}`;
            postProgress(`Analyzing ${i + 1} of ${totalCount}: ${streamIdentifier}`);

            const preProcessed = await preProcessInput(input, signal);

            let manifestIR, serializedManifestObject, finalBaseUrl, mediaPlaylists;
            let segmentsToCache = [];

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
                    loggingContext
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
                isLive: preProcessed.isLive,
                signal,
            };

            if (preProcessed.protocol === 'hls') {
                const hlsResult = await _fetchAndParseHlsPresentation(preProcessed, signal);
                manifestIR = hlsResult.masterIR;
                serializedManifestObject = hlsResult.serializedManifestObject;
                finalBaseUrl = hlsResult.finalUrl;
                mediaPlaylists = hlsResult.mediaPlaylists;
                preProcessed.isLive = manifestIR.type === 'dynamic';

                const hlsSummaryResult = await generateHlsSummary(
                    manifestIR,
                    { ...context, mediaPlaylists }
                );
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

                manifestIR.summary = await generateDashSummary(
                    manifestIR,
                    serializedManifestObject,
                    {
                        ...context,
                        manifestUrl: finalBaseUrl,
                    }
                );
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
                preProcessed.protocol,
                { isLive: preProcessed.isLive }
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
                mediaPlaylists,
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

            processingResults.push({ streamObject, segmentsToCache: segmentsWithId });
        }
        
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