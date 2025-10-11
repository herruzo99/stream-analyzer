import { parseManifest as parseDashManifest } from '@/infrastructure/parsing/dash/parser';
import { parseManifest as parseHlsManifest } from '@/infrastructure/parsing/hls/index';
import { runChecks } from '@/features/compliance/domain/engine';
import { validateSteeringManifest } from '@/domain/hls/steering-validator';
import {
    analyzeDashCoverage,
    analyzeParserDrift,
} from '@/features/parserCoverage/domain/coverage-analyzer';
import { generateFeatureAnalysis } from '@/features/featureAnalysis/domain/analyzer';
import { parseAllSegmentUrls as parseDashSegments } from '@/infrastructure/parsing/dash/segment-parser';
import { diffManifest } from '@/ui/shared/diff';
import { parseSegment } from './segmentParsingHandler.js';
import xmlFormatter from 'xml-formatter';

async function fetchAndParseSegment(url, formatHint) {
    // This internal fetcher does not need to handle caching or UI updates.
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error ${response.status} for segment ${url}`);
    }
    const data = await response.arrayBuffer();
    // Re-use the core parsing logic now exported from the segment handler
    return parseSegment({ data, formatHint, url });
}

async function preProcessInput(input) {
    const trimmedManifest = input.manifestString.trim();
    let protocol;

    if (trimmedManifest.startsWith('#EXTM3U')) {
        protocol = 'hls';
    } else if (/<MPD/i.test(trimmedManifest)) {
        protocol = 'dash';
    } else if (input.url || input.file?.name) {
        const name = (input.url || input.file.name).toLowerCase();
        protocol = name.includes('.m3u8') ? 'hls' : 'dash';
    } else {
        protocol = 'dash';
    }

    return { ...input, protocol };
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
                const response = await fetch(firstVariantUrl);
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
            (manifestIR.variants || []).forEach((variant) => {
                streamObject.hlsVariantState.set(variant.resolvedUri, {
                    segments: [],
                    freshSegmentUrls: new Set(),
                    isLoading: false,
                    isPolling: false,
                    isExpanded: false,
                    displayMode: 'all',
                    error: null,
                });
            });
        } else {
            streamObject.hlsVariantState.set(streamObject.originalUrl, {
                segments: manifestIR.segments || [],
                freshSegmentUrls: new Set(
                    (manifestIR.segments || []).map((s) => s.resolvedUrl)
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
                freshSegmentUrls: new Set(
                    allSegments.map((s) => s.resolvedUrl)
                ),
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
    serialized.hlsVariantState = Array.from(
        streamObject.hlsVariantState.entries()
    );
    serialized.dashRepresentationState = Array.from(
        streamObject.dashRepresentationState.entries()
    );
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
    const results = await Promise.all(inputs.map(processSingleStream));
    // The error was happening during hydration on the main thread.
    // Let's re-verify the structure before sending.
    results.forEach((stream) => {
        if (
            !stream ||
            stream.hlsVariantState === undefined ||
            stream.dashRepresentationState === undefined
        ) {
            throw new Error(
                'Worker produced a malformed stream object before transport.'
            );
        }
    });
    return results;
}