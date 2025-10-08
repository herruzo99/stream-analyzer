import { parseManifest as parseDashManifest } from '@/infrastructure/parsing/dash/parser.js';
import { parseManifest as parseHlsManifest } from '@/infrastructure/parsing/hls/index.js';
import { parseISOBMFF } from '@/infrastructure/parsing/isobmff/parser.js';
import { parse as parseTsSegment } from '@/infrastructure/parsing/ts/index.js';
import { parseVTT } from '@/infrastructure/parsing/vtt/parser.js';

import { runChecks } from '@/features/compliance/domain/engine.js';
import { validateSteeringManifest } from '@/domain/hls/steering-validator.js';
import {
    analyzeDashCoverage,
    analyzeParserDrift,
} from '@/features/parserCoverage/domain/coverage-analyzer.js';
import { generateFeatureAnalysis } from '@/features/featureAnalysis/domain/analyzer.js';

import { applyXmlPatch } from '@/infrastructure/parsing/dash/patch.js';
import { applyDeltaUpdate, serializeHls } from '@/infrastructure/parsing/hls/delta-updater.js';

/** @typedef {import('@/types.ts').SerializedStream} SerializedStream */

// --- MODULARIZED ANALYSIS PIPELINE ---

async function preProcessInput(input) {
    const trimmedManifest = input.manifestString.trim();
    let protocol;
    if (trimmedManifest.startsWith('#EXTM3U')) {
        protocol = 'hls';
    } else if (trimmedManifest.includes('<MPD')) {
        protocol = 'dash';
    } else {
        protocol = (input.url || input.file.name)
            .toLowerCase()
            .includes('.m3u8')
            ? 'hls'
            : 'dash';
    }

    self.postMessage({
        type: 'status-update',
        payload: { message: `Parsing (${protocol.toUpperCase()})...` },
    });

    return { ...input, protocol };
}

async function parseManifest(input) {
    let manifestIR, serializedManifestObject, finalBaseUrl;
    const { parseAllSegmentUrls: parseDashSegments } = await import(
        '@/infrastructure/parsing/dash/segment-parser.js'
    );

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
        /** @type {any} */ (serializedManifestObject.media || []).forEach(
            (media) => {
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
            }
        );
    } else if (input.protocol === 'dash') {
        const { parseAllSegmentUrls: parseDashSegments } = await import(
            '@/infrastructure/parsing/dash/segment-parser.js'
        );
        const segmentsByCompositeKey = parseDashSegments(
            serializedManifestObject,
            streamObject.baseUrl
        );
        Object.entries(segmentsByCompositeKey).forEach(([key, segments]) => {
            streamObject.dashRepresentationState.set(key, {
                segments,
                freshSegmentUrls: new Set(
                    segments.map((s) => /** @type {any} */ (s).resolvedUrl)
                ),
            });
        });
    }

    streamObject.manifestUpdates.push({
        timestamp: new Date().toLocaleTimeString(),
        diffHtml: '', // This will be generated on the main thread
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

    return /** @type {SerializedStream} */ (/** @type {any} */ (serialized));
}

async function processSingleStream(input) {
    const preProcessed = await preProcessInput(input);
    const parsed = await parseManifest(preProcessed);
    const analysisResults = await runAllAnalyses(parsed);
    const streamObject = await buildStreamObject(parsed, analysisResults);
    return serializeStreamForTransport(streamObject);
}

// --- Worker Message Handlers ---

async function handleStartAnalysis(inputs) {
    try {
        self.postMessage({
            type: 'status-update',
            payload: {
                message: `Starting analysis of ${inputs.length} stream(s)...`,
            },
        });
        const results = await Promise.all(inputs.map(processSingleStream));
        self.postMessage({
            type: 'analysis-complete',
            payload: { streams: results.filter(Boolean) },
        });
    } catch (error) {
        self.postMessage({
            type: 'analysis-error',
            payload: {
                message: error.message,
                error: { message: error.message, stack: error.stack },
            },
        });
    }
}

async function handleFetchHlsMediaPlaylistInWorker({
    streamId,
    variantUri,
    hlsDefinedVariables,
}) {
    try {
        const response = await fetch(variantUri);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const manifestString = await response.text();
        const { manifest } = await parseHlsManifest(
            manifestString,
            variantUri,
            hlsDefinedVariables
        );

        const freshSegmentUrls = (manifest.segments || []).map(
            (s) => s.resolvedUrl
        );

        self.postMessage({
            type: 'hls-media-playlist-fetched',
            payload: {
                streamId,
                variantUri,
                manifest,
                manifestString,
                segments: manifest.segments,
                freshSegmentUrls,
            },
        });
    } catch (e) {
        self.postMessage({
            type: 'hls-media-playlist-error',
            payload: { streamId, variantUri, error: e.message },
        });
    }
}

async function handleParseLiveUpdate({
    streamId,
    newManifestString,
    oldRawManifest,
    patchString,
    protocol,
    baseUrl,
    hlsDefinedVariables,
    oldManifestObjectForDelta,
}) {
    try {
        let finalManifestString;
        let newManifestObject;
        let newSerializedObject;

        if (patchString) {
            finalManifestString = applyXmlPatch(oldRawManifest, patchString);
        } else {
            finalManifestString = newManifestString;
        }

        if (protocol === 'dash') {
            const { manifest, serializedManifest } = await parseDashManifest(
                finalManifestString,
                baseUrl
            );
            newManifestObject = manifest;
            newSerializedObject = serializedManifest;
        } else {
            if (finalManifestString.includes('#EXT-X-SKIP')) {
                const { manifest: deltaManifest } = await parseHlsManifest(
                    finalManifestString,
                    baseUrl,
                    hlsDefinedVariables
                );
                const resolvedParsedHls = applyDeltaUpdate(
                    oldManifestObjectForDelta,
                    deltaManifest.serializedManifest
                );
                finalManifestString = serializeHls(resolvedParsedHls);
                const { manifest: resolvedManifest } = await parseHlsManifest(
                    finalManifestString,
                    baseUrl,
                    hlsDefinedVariables
                );
                newManifestObject = resolvedManifest;
                newSerializedObject = resolvedParsedHls;
            } else {
                const { manifest } = await parseHlsManifest(
                    finalManifestString,
                    baseUrl,
                    hlsDefinedVariables
                );
                newManifestObject = manifest;
                newSerializedObject = manifest.serializedManifest;
            }
        }

        const manifestObjectForChecks =
            protocol === 'hls' ? newManifestObject : newSerializedObject;
        const complianceResults = runChecks(manifestObjectForChecks, protocol);

        newManifestObject.serializedManifest = newSerializedObject;

        self.postMessage({
            type: 'live-update-parsed',
            payload: {
                streamId,
                newManifestObject,
                finalManifestString,
                oldRawManifest,
                complianceResults,
                serializedManifest: newSerializedObject,
            },
        });
    } catch (e) {
        self.postMessage({
            type: 'live-update-error',
            payload: { streamId, error: e.message },
        });
    }
}

async function handleGetManifestMetadata({ id, manifestString }) {
    try {
        const trimmed = manifestString.trim();
        let protocol = 'unknown';
        let type = 'vod';

        if (trimmed.startsWith('#EXTM3U')) {
            protocol = 'hls';
            if (
                !trimmed.includes('#EXT-X-ENDLIST') &&
                !trimmed.includes('EXT-X-PLAYLIST-TYPE:VOD')
            ) {
                type = 'live';
            }
        } else if (trimmed.includes('<MPD')) {
            protocol = 'dash';
            if (/<MPD[^>]*type\s*=\s*["']dynamic["']/.test(trimmed)) {
                type = 'live';
            }
        } else {
            throw new Error('Could not determine manifest protocol.');
        }

        self.postMessage({
            type: 'manifest-metadata-result',
            payload: { id, metadata: { protocol, type } },
        });
    } catch (e) {
        self.postMessage({
            type: 'manifest-metadata-result',
            payload: { id, error: e.message },
        });
    }
}

async function handleParseSegment({ url, data }) {
    let parsedData = null;
    try {
        const decoder = new TextDecoder();
        const text = decoder.decode(data.slice(0, 10));
        if (text.startsWith('WEBVTT')) {
            const vttString = decoder.decode(data);
            parsedData = {
                format: 'vtt',
                data: parseVTT(vttString),
            };
        } else {
            const isLikelyTS =
                data.byteLength > 188 &&
                new DataView(data).getUint8(0) === 0x47 &&
                new DataView(data).getUint8(188) === 0x47;
            if (isLikelyTS || url.toLowerCase().endsWith('.ts')) {
                parsedData = parseTsSegment(data);
            } else {
                const { boxes, issues, events } = parseISOBMFF(data);
                parsedData = {
                    format: 'isobmff',
                    data: { boxes, issues, events },
                };
            }
        }
        self.postMessage({ url, parsedData, error: null });
    } catch (e) {
        self.postMessage({
            url,
            parsedData: { error: e.message },
            error: e.message,
        });
    }
}

async function handleMessage(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'start-analysis':
            await handleStartAnalysis(payload.inputs);
            break;
        case 'fetch-hls-media-playlist':
            await handleFetchHlsMediaPlaylistInWorker(payload);
            break;
        case 'parse-live-update':
            await handleParseLiveUpdate(payload);
            break;
        case 'get-manifest-metadata':
            await handleGetManifestMetadata(payload);
            break;
        case 'parse-segment':
            await handleParseSegment(payload);
            break;
    }
}

self.addEventListener('message', handleMessage);