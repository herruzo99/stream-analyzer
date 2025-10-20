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
import { parseSegment } from './segmentParsingHandler.js';
import { fetchWithAuth } from '../http.js';
import xmlFormatter from 'xml-formatter';

async function fetchAndParseSegment(url, formatHint) {
    // This internal fetcher does not need to handle caching or UI updates.
    const response = await fetchWithAuth(url, null, 'init');
    if (!response.ok) {
        throw new Error(`HTTP error ${response.status} for segment ${url}`);
    }
    const data = await response.arrayBuffer();
    // Re-use the core parsing logic now exported from the segment handler
    return parseSegment({ data, formatHint, url });
}

async function preProcessInput(input) {
    let protocol, manifestString;

    if (input.file) {
        manifestString = await input.file.text();
    } else {
        const response = await fetchWithAuth(
            input.url,
            input.auth,
            'manifest',
            input.id
        );
        if (!response.ok) {
            throw new Error(
                `HTTP error ${response.status} fetching manifest from ${input.url}`
            );
        }
        manifestString = await response.text();
    }

    const trimmedManifest = manifestString.trim();

    if (trimmedManifest.startsWith('#EXTM3U')) {
        protocol = 'hls';
    } else if (/<MPD/i.test(trimmedManifest)) {
        protocol = 'dash';
    } else {
        const name = (input.url || input.file.name).toLowerCase();
        protocol = name.includes('.m3u8') ? 'hls' : 'dash';
    }

    return { ...input, protocol, manifestString };
}

async function parse(input) {
    let manifestIR, serializedManifestObject, finalBaseUrl;
    const context = { fetchAndParseSegment, manifestUrl: input.url };

    if (input.protocol === 'hls') {
        const { manifest, definedVariables, baseUrl } = await parseHlsManifest(
            input.manifestString,
            input.url,
            undefined, // parentVariables
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
                    input.auth,
                    'manifest',
                    input.id
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
            await parseDashManifest(input.manifestString, input.url, context);
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
    // ... Analysis logic is unchanged ...
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
    const {
        featureAnalysisResults,
        semanticData,
        steeringTag,
        complianceResults,
        coverageReport,
    } = analysisResults;

    const streamObject = {
        id: input.id,
        name: input.url ? new URL(input.url).hostname : input.file.name,
        originalUrl: input.url,
        baseUrl: finalBaseUrl,
        protocol: input.protocol,
        isPolling: manifestIR.type === 'dynamic',
        manifest: manifestIR,
        rawManifest: input.manifestString,
        auth: input.auth,
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
    };

    if (input.protocol === 'hls') {
        if (manifestIR.isMaster) {
            streamObject.mediaPlaylists.set('master', {
                manifest: manifestIR,
                rawManifest: streamObject.rawManifest,
                lastFetched: new Date(),
            });

            // Populate hlsVariantState for ALL available renditions (video, audio, subtitles)
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
                            freshSegmentUrls: new Set(),
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
            streamObject.hlsVariantState.set(streamObject.originalUrl, {
                segments: manifestIR.segments || [],
                freshSegmentUrls: new Set(
                    (manifestIR.segments || []).map((s) => s.uniqueId)
                ),
                isLoading: false,
                isPolling: manifestIR.type === 'dynamic',
                isExpanded: true, // If it's the only playlist, expand it
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

            streamObject.dashRepresentationState.set(key, {
                segments: allSegments,
                freshSegmentUrls: new Set(allSegments.map((s) => s.uniqueId)),
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

    // Serialize hlsVariantState, including the freshSegmentUrls Set
    const hlsVariantStateArray = [];
    for (const [key, value] of streamObject.hlsVariantState.entries()) {
        hlsVariantStateArray.push([
            key,
            { ...value, freshSegmentUrls: Array.from(value.freshSegmentUrls) },
        ]);
    }
    serialized.hlsVariantState = hlsVariantStateArray;

    const dashRepStateArray = [];
    for (const [key, value] of streamObject.dashRepresentationState.entries()) {
        dashRepStateArray.push([
            key,
            { ...value, freshSegmentUrls: Array.from(value.freshSegmentUrls) },
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
    // Ensure nested Maps are also serialized if they exist
    if (streamObject.manifest?.hlsDefinedVariables) {
        serialized.manifest.hlsDefinedVariables = Array.from(
            streamObject.manifest.hlsDefinedVariables.entries()
        );
    }

    return serialized;
}

async function processSingleStream(input) {
    const preProcessed = await preProcessInput(input);
    const parsed = await parse(preProcessed);
    const analysisResults = await runAllAnalyses(parsed);
    const streamObject = await buildStreamObject(parsed, analysisResults);
    return serializeStreamForTransport(streamObject);
}

export async function handleStartAnalysis({ inputs }) {
    // Correctly await the results of all stream processing promises.
    // If any promise in Promise.all rejects, it will short-circuit and
    // the entire handleStartAnalysis function will reject, which is then
    // caught by the main worker listener.
    const results = await Promise.all(inputs.map(processSingleStream));

    if (results.length === 0) {
        throw new Error('All streams failed to process.');
    }

    return results;
}
