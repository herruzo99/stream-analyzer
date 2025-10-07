import { parseISOBMFF } from './infrastructure/segment/isobmff/parser.js';
import { parse as parseTsSegment } from './infrastructure/segment/ts/index.js';
import { parseManifest as parseDashManifestString } from './infrastructure/manifest/dash/parser.js';
import { parseManifest as parseHlsManifest } from './infrastructure/manifest/hls/parser.js';
import { parseAllSegmentUrls as parseDashSegments } from './infrastructure/manifest/dash/segment-parser.js';
import { runChecks } from './domain/compliance/engine.js';
import { validateSteeringManifest } from './domain/hls/steering-validator.js';
import {
    analyzeDashCoverage,
    analyzeParserDrift,
} from './domain/debug/coverage-analyzer.js';
import { DOMParser, XMLSerializer } from 'xmldom';
import xpath from 'xpath';

/** @typedef {import('./app/types.js').SerializedStream} SerializedStream */

// --- XML Patch Logic ---
/**
 * Applies an RFC 5261 XML patch to a source XML document.
 * @param {string} sourceXml - The original XML string.
 * @param {string} patchXml - The patch XML string.
 * @returns {string} The new, patched XML string.
 */
function applyXmlPatch(sourceXml, patchXml) {
    const domParser = new DOMParser();
    const serializer = new XMLSerializer();

    const sourceDoc = domParser.parseFromString(sourceXml, 'application/xml');
    const patchDoc = domParser.parseFromString(patchXml, 'application/xml');

    const patchOps = Array.from(patchDoc.documentElement.childNodes).filter(
        (n) => n.nodeType === 1
    ); // Only element nodes

    const select = xpath.useNamespaces({ d: 'urn:mpeg:dash:schema:mpd:2011' });

    for (const op of patchOps) {
        const selector = op.getAttribute('sel');
        if (!selector) continue;

        const targets = select(selector, sourceDoc);
        if (!Array.isArray(targets)) {
            continue;
        }

        for (const target of targets) {
            // Ensure target is a Node with expected methods
            if (typeof target !== 'object' || !target.nodeType) {
                continue;
            }
            const targetNode = /** @type {Node} */ (target);

            switch (op.nodeName) {
                case 'add': {
                    const content = op.firstChild;
                    if (
                        content &&
                        targetNode.nodeType === 1 /* ELEMENT_NODE */
                    ) {
                        /** @type {Element} */ (targetNode).appendChild(
                            content.cloneNode(true)
                        );
                    }
                    break;
                }
                case 'replace': {
                    const content = op.firstChild;
                    if (content && targetNode.parentNode) {
                        targetNode.parentNode.replaceChild(
                            content.cloneNode(true),
                            targetNode
                        );
                    }
                    break;
                }
                case 'remove': {
                    if (targetNode.parentNode) {
                        targetNode.parentNode.removeChild(targetNode);
                    }
                    break;
                }
            }
        }
    }

    return serializer.serializeToString(sourceDoc);
}

// --- HLS Delta Update Logic (moved from delta-updater.js) ---

/**
 * Applies a delta update to an old HLS playlist object.
 * @param {object} oldParsedHls The fully parsed object of the previous manifest.
 * @param {object} deltaParsedHls The fully parsed object of the new delta update manifest.
 * @returns {object} A new, fully resolved parsed HLS object.
 */
function applyDeltaUpdate(oldParsedHls, deltaParsedHls) {
    const skipTag = deltaParsedHls.tags.find((t) => t.name === 'EXT-X-SKIP');
    if (!skipTag) {
        // This isn't a delta update, return the new playlist as-is.
        return deltaParsedHls;
    }

    const skippedSegments = skipTag.value['SKIPPED-SEGMENTS'];

    // Deep clone the old playlist to avoid mutation
    const resolvedHls = JSON.parse(JSON.stringify(oldParsedHls));

    // Update sequences and playlist type from the delta manifest
    resolvedHls.mediaSequence = deltaParsedHls.mediaSequence;
    resolvedHls.discontinuitySequence = deltaParsedHls.discontinuitySequence;
    resolvedHls.playlistType = deltaParsedHls.playlistType;

    // Filter out the skipped segments from the old playlist
    const oldSegmentCount = resolvedHls.segments.length;
    resolvedHls.segments = resolvedHls.segments.slice(
        oldSegmentCount - (oldSegmentCount - skippedSegments)
    );

    // Append new segments from the delta playlist
    resolvedHls.segments.push(...deltaParsedHls.segments);

    // Replace all top-level tags with tags from the delta manifest, except for EXT-X-SKIP itself.
    resolvedHls.tags = deltaParsedHls.tags.filter(
        (t) => t.name !== 'EXT-X-SKIP'
    );

    // Update other properties from the delta
    resolvedHls.targetDuration = deltaParsedHls.targetDuration;
    resolvedHls.partInf = deltaParsedHls.partInf;
    resolvedHls.serverControl = deltaParsedHls.serverControl;
    resolvedHls.isLive = deltaParsedHls.isLive;

    return resolvedHls;
}

/**
 * Serializes a parsed HLS object back into a manifest string.
 * @param {object} parsedHls The parsed HLS object.
 * @returns {string} The manifest string.
 */
function serializeHls(parsedHls) {
    const lines = ['#EXTM3U'];
    if (parsedHls.version > 1) {
        lines.push(`#EXT-X-VERSION:${parsedHls.version}`);
    }
    if (parsedHls.targetDuration) {
        lines.push(`#EXT-X-TARGETDURATION:${parsedHls.targetDuration}`);
    }
    if (parsedHls.mediaSequence) {
        lines.push(`#EXT-X-MEDIA-SEQUENCE:${parsedHls.mediaSequence}`);
    }
    // Add other header tags...
    if (parsedHls.partInf) {
        lines.push(
            `#EXT-X-PART-INF:PART-TARGET=${parsedHls.partInf['PART-TARGET']}`
        );
    }
    if (parsedHls.serverControl) {
        const attrs = Object.entries(parsedHls.serverControl)
            .map(([k, v]) => `${k}=${v}`)
            .join(',');
        lines.push(`#EXT-X-SERVER-CONTROL:${attrs}`);
    }

    let lastKey = null;

    parsedHls.segments.forEach((segment) => {
        if (segment.discontinuity) {
            lines.push('#EXT-X-DISCONTINUITY');
        }
        if (
            segment.key &&
            JSON.stringify(segment.key) !== JSON.stringify(lastKey)
        ) {
            const attrs = Object.entries(segment.key)
                .map(([k, v]) => `${k}="${v}"`)
                .join(',');
            lines.push(`#EXT-X-KEY:${attrs}`);
            lastKey = segment.key;
        }
        if (segment.dateTime) {
            lines.push(`#EXT-X-PROGRAM-DATE-TIME:${segment.dateTime}`);
        }
        lines.push(
            `#EXTINF:${segment.duration.toFixed(5)},${segment.title || ''}`
        );
        if (segment.uri) {
            lines.push(segment.uri);
        }
        segment.parts.forEach((part) => {
            const attrs = Object.entries(part)
                .map(([k, v]) => `${k}="${v}"`)
                .join(',');
            lines.push(`#EXT-X-PART:${attrs}`);
        });
    });

    if (!parsedHls.isLive) {
        lines.push('#EXT-X-ENDLIST');
    }

    return lines.join('\n');
}

// --- Worker Logic ---

async function processSingleStream(input) {
    // --- Determine protocol FIRST ---
    const trimmedManifest = input.manifestString.trim();
    if (trimmedManifest.startsWith('#EXTM3U')) {
        input.protocol = 'hls';
    } else if (trimmedManifest.includes('<MPD')) {
        input.protocol = 'dash';
    } else {
        input.protocol = (input.url || input.file.name)
            .toLowerCase()
            .includes('.m3u8')
            ? 'hls'
            : 'dash';
    }

    self.postMessage({
        type: 'status-update',
        payload: { message: `Parsing (${input.protocol.toUpperCase()})...` },
    });

    let manifestIR;
    let serializedManifestObject;
    let finalBaseUrl = input.url;

    if (input.protocol === 'hls') {
        const { manifest, definedVariables, baseUrl } = await parseHlsManifest(
            input.manifestString,
            input.url
        );
        manifestIR = manifest;
        serializedManifestObject = manifest.serializedManifest; // HLS adapter places the parsed object here
        manifestIR.hlsDefinedVariables = definedVariables;
        finalBaseUrl = baseUrl;

        // --- Live Stream Detection for HLS ---
        if (manifestIR.isMaster && manifestIR.variants.length > 0) {
            try {
                const firstVariantUrl = manifestIR.variants[0].resolvedUri;
                const response = await fetch(firstVariantUrl);
                const mediaPlaylistString = await response.text();
                if (!mediaPlaylistString.includes('#EXT-X-ENDLIST')) {
                    manifestIR.type = 'dynamic';
                } else {
                    manifestIR.type = 'static';
                }
            } catch (e) {
                console.error(
                    'Could not fetch first variant to determine liveness, defaulting to VOD.',
                    e
                );
                manifestIR.type = 'static';
            }
        }
        // The parser now sets isLive correctly for media playlists, which adaptHlsToIr uses
    } else {
        // DASH
        const { manifest, serializedManifest, baseUrl } =
            await parseDashManifestString(input.manifestString, input.url);
        manifestIR = manifest;
        serializedManifestObject = serializedManifest;
        finalBaseUrl = baseUrl;
    }

    // Pass serializedManifestObject explicitly to functions that need to traverse it
    const { generateFeatureAnalysis } = await import(
        './domain/feature-analysis/analyzer.js'
    );
    const rawInitialAnalysis = generateFeatureAnalysis(
        manifestIR, // HLS analyzer uses the IR
        input.protocol,
        serializedManifestObject // DASH analyzer uses the serialized object
    );
    const featureAnalysisResults = new Map(Object.entries(rawInitialAnalysis));

    const { diffManifest } = await import('./shared/utils/diff.js');
    const xmlFormatter = (await import('xml-formatter')).default;

    const semanticData = new Map();

    // --- Content Steering Validation ---
    const steeringTag =
        input.protocol === 'hls' && manifestIR.isMaster
            ? (manifestIR.tags || []).find(
                  (t) => t.name === 'EXT-X-CONTENT-STEERING'
              ) || null
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

    // Ensure rawElement is the correct serializable object before sending
    manifestIR.serializedManifest = serializedManifestObject;

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
        manifestUpdates: [], // Initialize empty
        activeManifestUpdateIndex: 0,
        mediaPlaylists: new Map(),
        activeMediaPlaylistUrl: null,
        activeManifestForView: manifestIR,
        featureAnalysis: {
            results: featureAnalysisResults,
            manifestCount: 1,
        },
        hlsVariantState: new Map(),
        dashRepresentationState: new Map(),
        hlsDefinedVariables: manifestIR.hlsDefinedVariables,
        semanticData: semanticData,
        coverageReport: [],
    };

    // --- Parser Coverage Analysis ---
    if (input.isDebug) {
        let coverageFindings = [];
        if (streamObject.protocol === 'dash') {
            coverageFindings = analyzeDashCoverage(serializedManifestObject);
        }
        // HLS coverage analysis would go here if implemented

        const driftFindings = analyzeParserDrift(manifestIR);
        streamObject.coverageReport = [...coverageFindings, ...driftFindings];
    }

    // --- Always add the initial manifest to manifestUpdates for compliance reports ---
    let formattedInitial = streamObject.rawManifest;
    if (streamObject.protocol === 'dash') {
        formattedInitial = xmlFormatter(streamObject.rawManifest, {
            indentation: '  ',
            lineSeparator: '\n',
        });
    }
    const initialDiffHtml = diffManifest(
        '', // No previous manifest to diff against for the first entry
        formattedInitial,
        streamObject.protocol
    );
    streamObject.manifestUpdates.push({
        timestamp: new Date().toLocaleTimeString(),
        diffHtml: initialDiffHtml,
        rawManifest: streamObject.rawManifest,
        complianceResults,
        hasNewIssues: false,
        serializedManifest: serializedManifestObject,
    });
    // --- End of initial manifest update logic ---

    if (input.protocol === 'hls') {
        if (manifestIR.isMaster) {
            (manifestIR.variants || []).forEach((v, index) => {
                if (streamObject.hlsVariantState.has(v.resolvedUri)) return;
                streamObject.hlsVariantState.set(v.resolvedUri, {
                    segments: [],
                    freshSegmentUrls: new Set(),
                    isLoading: false,
                    isPolling: manifestIR.type === 'dynamic',
                    isExpanded: index === 0, // Expand the first variant by default
                    displayMode: 'last10',
                    error: null,
                });
            });
        } else {
            // This is a media playlist, so its state should be pre-populated
            streamObject.hlsVariantState.set(streamObject.originalUrl, {
                segments: manifestIR.segments || [],
                freshSegmentUrls: new Set(
                    (manifestIR.segments || []).map((s) => s.resolvedUrl)
                ),
                isLoading: false,
                isPolling: manifestIR.type === 'dynamic',
                isExpanded: true, // Expand media playlists by default
                displayMode: 'last10',
                error: null,
            });
        }
    } else if (input.protocol === 'dash') {
        // Use the serializedManifestObject here explicitly
        const segmentsByCompositeKey = parseDashSegments(
            serializedManifestObject,
            streamObject.baseUrl
        );
        Object.entries(segmentsByCompositeKey).forEach(
            ([compositeKey, segments]) => {
                streamObject.dashRepresentationState.set(compositeKey, {
                    segments: segments,
                    freshSegmentUrls: new Set(
                        segments.map((s) => s.resolvedUrl)
                    ),
                });
            }
        );
    }

    // Explicitly cast to the SerializedStream type to satisfy TS
    const serializedStreamObject = /** @type {SerializedStream} */ (
        /** @type {any} */ (streamObject)
    );

    // Serialize Maps to Arrays before returning
    serializedStreamObject.hlsVariantState = Array.from(
        streamObject.hlsVariantState.entries()
    );
    serializedStreamObject.dashRepresentationState = Array.from(
        streamObject.dashRepresentationState.entries()
    );
    serializedStreamObject.featureAnalysis.results = Array.from(
        streamObject.featureAnalysis.results.entries()
    );
    serializedStreamObject.semanticData = Array.from(
        streamObject.semanticData.entries()
    );

    return serializedStreamObject;
}

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

        const freshSegmentUrls = new Set(
            (manifest.segments || []).map((s) => s.resolvedUrl)
        );

        self.postMessage({
            type: 'hls-media-playlist-fetched',
            payload: {
                streamId,
                variantUri,
                manifest, // Send the full manifest IR
                manifestString, // Send the raw string
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
    patchString, // New optional parameter
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
            // Apply the XML patch to get the new manifest string
            finalManifestString = applyXmlPatch(oldRawManifest, patchString);
        } else {
            finalManifestString = newManifestString;
        }

        if (protocol === 'dash') {
            const { manifest, serializedManifest } =
                await parseDashManifestString(finalManifestString, baseUrl);
            newManifestObject = manifest;
            newSerializedObject = serializedManifest;
        } else {
            // HLS: Check for Delta Update
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

                // Re-adapt and re-serialize to get the final state
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

        // Attach the serializable object to the IR before sending back
        newManifestObject.serializedManifest = newSerializedObject;

        self.postMessage({
            type: 'live-update-parsed',
            payload: {
                streamId,
                newManifestObject,
                finalManifestString,
                oldRawManifest,
                complianceResults,
                // Add the pristine object for the compliance view
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
        let type = 'vod'; // Default to VOD

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
            // Use a simple regex to avoid full parsing for this quick check
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
        case 'parse-segment': {
            const { url, data } = payload;
            let parsedData = null;
            try {
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
                self.postMessage({ url, parsedData, error: null });
            } catch (e) {
                self.postMessage({
                    url,
                    parsedData: { error: e.message },
                    error: e.message,
                });
            }
            break;
        }
    }
}

self.addEventListener('message', handleMessage);
