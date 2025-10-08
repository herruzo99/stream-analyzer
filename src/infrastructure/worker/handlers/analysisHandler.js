import { parseManifest as parseDashManifest } from '@/infrastructure/parsing/dash/parser.js';
import { parseManifest as parseHlsManifest } from '@/infrastructure/parsing/hls/index.js';
import { runChecks } from '@/features/compliance/domain/engine.js';
import { validateSteeringManifest } from '@/domain/hls/steering-validator.js';
import {
    analyzeDashCoverage,
    analyzeParserDrift,
} from '@/features/parserCoverage/domain/coverage-analyzer.js';
import { generateFeatureAnalysis } from '@/features/featureAnalysis/domain/analyzer.js';
import { parseAllSegmentUrls as parseDashSegments } from '@/infrastructure/parsing/dash/segment-parser.js';

async function preProcessInput(input) {
    const trimmedManifest = input.manifestString.trim();
    let protocol;

    // Content-first detection, now with a more robust regex for DASH.
    if (trimmedManifest.startsWith('#EXTM3U')) {
        protocol = 'hls';
    } else if (/<MPD/i.test(trimmedManifest)) {
        protocol = 'dash';
    }
    // Fallback to URL extension only if content is truly ambiguous.
    else if (input.url || input.file?.name) {
        const name = (input.url || input.file.name).toLowerCase();
        protocol = name.includes('.m3u8') ? 'hls' : 'dash';
    } else {
        protocol = 'dash'; // Default assumption
    }

    return { ...input, protocol };
}

async function parse(input) {
    let manifestIR, serializedManifestObject, finalBaseUrl;

    if (input.protocol === 'hls') {
        const { manifest, definedVariables, baseUrl } = await parseHlsManifest(
            input.manifestString,
            input.url
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
            await parseDashManifest(input.manifestString, input.url);
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

    if (input.protocol === 'hls' && manifestIR.isMaster) {
        (manifestIR.variants || []).forEach((v, index) => {
            streamObject.hlsVariantState.set(v.resolvedUri, {
                segments: [],
                freshSegmentUrls: new Set(),
                isLoading: false,
                isPolling: manifestIR.type === 'dynamic',
                isExpanded: index === 0,
                displayMode: 'last10',
                error: null,
            });
        });
        (serializedManifestObject.media || []).forEach((media) => {
            if (media.URI) {
                const resolvedUri = new URL(media.URI, finalBaseUrl).href;
                streamObject.hlsVariantState.set(resolvedUri, {
                    segments: [],
                    freshSegmentUrls: new Set(),
                    isLoading: false,
                    isPolling: manifestIR.type === 'dynamic',
                    isExpanded: false,
                    displayMode: 'last10',
                    error: null,
                });
            }
        });
    } else if (input.protocol === 'dash') {
        const segmentsByCompositeKey = parseDashSegments(
            serializedManifestObject,
            streamObject.baseUrl
        );
        Object.entries(segmentsByCompositeKey).forEach(([key, segments]) => {
            streamObject.dashRepresentationState.set(key, {
                segments,
                freshSegmentUrls: new Set(segments.map((s) => s.resolvedUrl)),
            });
        });
    }

    streamObject.manifestUpdates.push({
        timestamp: new Date().toLocaleTimeString(),
        diffHtml: '',
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
    serialized.featureAnalysis.results = Array.from(
        streamObject.featureAnalysis.results.entries()
    );
    serialized.semanticData = Array.from(streamObject.semanticData.entries());
    serialized.mediaPlaylists = Array.from(
        streamObject.mediaPlaylists.entries()
    );
    streamObject.manifest.serializedManifest = JSON.parse(
        JSON.stringify(streamObject.manifest.serializedManifest)
    );

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
    return Promise.all(inputs.map(processSingleStream));
}