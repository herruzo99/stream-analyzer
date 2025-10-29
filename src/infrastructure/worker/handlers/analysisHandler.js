import { parseManifest as parseDashManifest } from '@/infrastructure/parsing/dash/parser';
import { parseManifest as parseHlsManifest } from '@/infrastructure/parsing/hls/index';
import { runChecks } from '@/features/compliance/domain/engine';
import { validateSteeringManifest } from '@/features/compliance/domain/hls/steering-validator';
import {
    analyzeDashCoverage,
    analyzeParserDrift,
} from '@/features/parserCoverage/domain/coverage-analyzer';
import { generateFeatureAnalysis } from '@/features/featureAnalysis/domain/analyzer';
import { parseAllSegmentUrls as parseDashSegments } from '@/infrastructure/parsing/dash/segment-parser';
import { diffManifest } from '@/ui/shared/diff';
import { parseSegment } from '../parsingService.js';
import { fetchWithAuth } from '../http.js';
import xmlFormatter from 'xml-formatter';
import { debugLog } from '@/shared/utils/debug';

async function fetchAndParseSegment(
    url,
    formatHint,
    range = null,
    auth = null
) {
    debugLog('analysisHandler.fetchAndParseSegment', 'Fetching segment...', {
        url,
        formatHint,
        range,
    });
    const response = await fetchWithAuth(url, auth, range);
    if (!response.ok) {
        throw new Error(`HTTP error ${response.status} for segment ${url}`);
    }
    const data = await response.arrayBuffer();
    return parseSegment({ data, formatHint, url });
}

// ... rest of the file is unchanged, no need to regenerate ...
async function preProcessInput(input, signal) {
    let protocol, manifestString, finalUrl;

    if (input.file) {
        manifestString = await input.file.text();
        finalUrl = input.file.name;
    } else {
        const startTime = performance.now();
        const response = await fetchWithAuth(
            input.url,
            input.auth,
            null,
            {},
            null,
            signal
        );

        self.postMessage({
            type: 'worker:network-event',
            payload: {
                id: crypto.randomUUID(),
                url: response.url,
                resourceType: 'manifest',
                streamId: input.id,
                request: { method: 'GET', headers: {} },
                response: {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                    contentLength:
                        Number(response.headers['content-length']) || null,
                    contentType: response.headers['content-type'],
                },
                timing: {
                    startTime,
                    endTime: performance.now(),
                    duration: performance.now() - startTime,
                    breakdown: null,
                },
            },
        });

        if (!response.ok) {
            throw new Error(
                `HTTP error ${response.status} fetching manifest from ${input.url}`
            );
        }
        manifestString = await response.text();
        finalUrl = response.url; // Capture the final URL after redirects

        const wasRedirected = response.url !== input.url;

        debugLog(
            'analysisHandler.preProcessInput',
            `Received manifest content. Length: ${manifestString.length} characters. Was Redirected: ${wasRedirected}. Final URL: ${finalUrl}`
        );

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

async function parse(input) {
    let manifestIR, serializedManifestObject, finalBaseUrl;
    const context = {
        fetchAndParseSegment: (url, format, range) =>
            fetchAndParseSegment(url, format, range, input.auth),
        manifestUrl: input.finalUrl,
    };

    // --- ARCHITECTURAL FIX ---
    // The base URL for resolving relative paths should be the directory containing the manifest,
    // not the manifest URL itself.
    const getBaseUrlDirectory = (url) => {
        try {
            const parsedUrl = new URL(url);
            parsedUrl.pathname = parsedUrl.pathname.substring(
                0,
                parsedUrl.pathname.lastIndexOf('/') + 1
            );
            return parsedUrl.href;
        } catch (e) {
            // Handle cases where the URL might not be a full URL (e.g., local file name)
            return url.substring(0, url.lastIndexOf('/') + 1);
        }
    };

    const baseUrlDirectory = getBaseUrlDirectory(input.finalUrl);

    if (input.protocol === 'hls') {
        const { manifest, definedVariables, baseUrl } = await parseHlsManifest(
            input.manifestString,
            baseUrlDirectory,
            undefined,
            context
        );
        manifestIR = manifest;
        serializedManifestObject = manifest.serializedManifest;
        manifestIR.hlsDefinedVariables = definedVariables;
        finalBaseUrl = baseUrl;

        if (manifestIR.isMaster && manifestIR.variants.length > 0) {
            try {
                const firstVariantUrl = manifestIR.variants[0].resolvedUri;
                const response = await fetchWithAuth(
                    firstVariantUrl,
                    input.auth
                );
                const mediaPlaylistString = await response.text();
                manifestIR.type = mediaPlaylistString.includes('#EXT-X-ENDLIST')
                    ? 'static'
                    : 'dynamic';
            } catch (_e) {
                manifestIR.type = 'static';
            }
        }
    } else {
        const { manifest, serializedManifest, baseUrl } =
            await parseDashManifest(
                input.manifestString,
                baseUrlDirectory,
                context
            );
        manifestIR = manifest;
        serializedManifestObject = serializedManifest;
        finalBaseUrl = baseUrl;
    }
    return { input, manifestIR, serializedManifestObject, finalBaseUrl };
}

async function runAllAnalyses({
    input,
    manifestIR,
    serializedManifestObject,
    finalBaseUrl,
}) {
    const rawInitialAnalysis = generateFeatureAnalysis(
        manifestIR,
        input.protocol,
        serializedManifestObject
    );
    const featureAnalysisResults = new Map(Object.entries(rawInitialAnalysis));
    const semanticData = new Map();

    const steeringTag =
        input.protocol === 'hls' && manifestIR.isMaster
            ? (manifestIR.tags || []).find(
                  (t) => t.name === 'EXT-X-CONTENT-STEERING'
              )
            : null;
    if (steeringTag) {
        const steeringUri = new URL(
            steeringTag.value['SERVER-URI'],
            finalBaseUrl
        ).href;
        const validationResult = await validateSteeringManifest(steeringUri);
        semanticData.set('steeringValidation', validationResult);
    }

    const manifestObjectForChecks =
        input.protocol === 'hls' ? manifestIR : serializedManifestObject;
    const complianceResults = runChecks(
        manifestObjectForChecks,
        input.protocol
    );

    let coverageReport = [];
    if (input.isDebug) {
        let findings =
            input.protocol === 'dash'
                ? analyzeDashCoverage(serializedManifestObject)
                : [];
        const drift = analyzeParserDrift(manifestIR);
        coverageReport = [...findings, ...drift];
    }

    return {
        featureAnalysisResults,
        semanticData,
        steeringTag,
        complianceResults,
        coverageReport,
    };
}

async function buildStreamObject(
    { input, manifestIR, serializedManifestObject, finalBaseUrl },
    analysisResults
) {
    debugLog('buildStreamObject', 'Building stream object from input:', input);
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
        licenseServerUrl: input.drmAuth.licenseServerUrl,
        steeringInfo: steeringTag,
        manifestUpdates: [],
        activeManifestUpdateIndex: 0,
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
        adaptationEvents: [],
    };

    debugLog('buildStreamObject', 'Constructed stream object:', streamObject);

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
                const representation = as.representations[0];
                if (
                    representation &&
                    representation.serializedManifest.resolvedUri
                ) {
                    const uri = representation.serializedManifest.resolvedUri;
                    if (!streamObject.hlsVariantState.has(uri)) {
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
        const segmentsByCompositeKey = await parseDashSegments(
            serializedManifestObject,
            streamObject.baseUrl
        );
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

    let formattedInitial = streamObject.rawManifest;
    if (streamObject.protocol === 'dash') {
        formattedInitial = xmlFormatter(formattedInitial, {
            indentation: '  ',
            lineSeparator: '\n',
        });
    }
    const diffHtml = diffManifest('', formattedInitial, streamObject.protocol);

    streamObject.manifestUpdates.push({
        timestamp: new Date().toLocaleTimeString(),
        diffHtml,
        rawManifest: streamObject.rawManifest,
        complianceResults,
        hasNewIssues: false,
        serializedManifest: serializedManifestObject,
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

    return serialized;
}

export async function handleStartAnalysis({ inputs }, signal) {
    const analysisStartTime = performance.now();
    debugLog('handleStartAnalysis', 'Starting analysis pipeline...');

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

        debugLog(
            'handleStartAnalysis',
            `Dispatching ${workerInputs.length} stream(s) for fetching and analysis.`,
            workerInputs
        );

        const processingPromises = workerInputs.map(async (input) => {
            const preProcessed = await preProcessInput(input, signal);
            const parsed = await parse(preProcessed);
            const analysisResults = await runAllAnalyses(parsed);
            const streamObject = await buildStreamObject(
                parsed,
                analysisResults
            );
            // Don't serialize yet, we need the full object to build the map.
            return streamObject;
        });

        const streamObjects = await Promise.all(processingPromises);

        // --- NEW: Build the URL -> Auth map ---
        const urlAuthMap = new Map();
        for (const stream of streamObjects) {
            const context = { streamId: stream.id, auth: stream.auth };
            if (stream.originalUrl) {
                urlAuthMap.set(stream.originalUrl, context);
            }
            if (stream.baseUrl) {
                urlAuthMap.set(stream.baseUrl, context);
            }
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
        debugLog(
            'handleStartAnalysis',
            `Built urlAuthMap with ${urlAuthMap.size} entries.`
        );
        // --- END NEW ---

        const workerResults = streamObjects.map(serializeStreamForTransport);

        if (
            workerResults.length > 0 &&
            !workerResults[0]?.rawManifest?.trim()
        ) {
            throw new Error(
                'Manifest content is empty after processing. This may be due to a network or CORS issue.'
            );
        }

        debugLog(
            'handleStartAnalysis',
            `Initial Analysis Pipeline (success): ${(
                performance.now() - analysisStartTime
            ).toFixed(2)}ms`
        );

        return { streams: workerResults, urlAuthMapArray };
    } catch (error) {
        debugLog('handleStartAnalysis', 'Analysis pipeline failed.', error);
        throw error;
    }
}
