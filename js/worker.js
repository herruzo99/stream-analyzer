import { parseISOBMFF } from './protocols/segment/isobmff/parser.js';
import { parse as parseTsSegment } from './protocols/segment/ts/index.js';
import { parseManifest as parseDashManifestString } from './protocols/manifest/dash/parser.js';
import { parseManifest as parseHlsManifest } from './protocols/manifest/hls/parser.js';
import { parseAllSegmentUrls as parseDashSegments } from './protocols/manifest/dash/segment-parser.js';

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
        serializedManifestObject = manifest.rawElement; // HLS adapter places the parsed object here
        manifestIR.hlsDefinedVariables = definedVariables;
        finalBaseUrl = baseUrl;
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
        './engines/feature-analysis/analyzer.js'
    );
    const rawInitialAnalysis = generateFeatureAnalysis(
        manifestIR, // HLS analyzer uses the IR
        input.protocol,
        serializedManifestObject // DASH analyzer uses the serialized object
    );
    const featureAnalysisResults = new Map(Object.entries(rawInitialAnalysis));

    const { diffManifest } = await import('./shared/utils/diff.js');
    const xmlFormatter = (await import('xml-formatter')).default;

    let steeringInfo = null;
    if (input.protocol === 'hls' && manifestIR.isMaster) {
        steeringInfo =
            (manifestIR.tags || []).find(
                (t) => t.name === 'EXT-X-CONTENT-STEERING'
            ) || null;
    }

    // Ensure rawElement is the correct serializable object before sending
    manifestIR.rawElement = serializedManifestObject;

    const streamObject = {
        id: input.id,
        name: input.url ? new URL(input.url).hostname : input.file.name,
        originalUrl: input.url,
        baseUrl: finalBaseUrl,
        protocol: input.protocol,
        isPolling: manifestIR.type === 'dynamic',
        manifest: manifestIR,
        rawManifest: input.manifestString,
        steeringInfo,
        manifestUpdates: [],
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
        semanticData: new Map(),
    };

    if (input.protocol === 'hls') {
        if (manifestIR.isMaster) {
            (manifestIR.variants || []).forEach((v) => {
                if (streamObject.hlsVariantState.has(v.resolvedUri)) return;
                streamObject.hlsVariantState.set(v.resolvedUri, {
                    segments: [],
                    freshSegmentUrls: new Set(),
                    isLoading: false,
                    isPolling: manifestIR.type === 'dynamic',
                    isExpanded: false,
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
        const segmentsByRep = parseDashSegments(
            serializedManifestObject,
            streamObject.baseUrl
        );
        Object.entries(segmentsByRep).forEach(([repId, segments]) => {
            streamObject.dashRepresentationState.set(repId, {
                segments: segments,
                freshSegmentUrls: new Set(segments.map((s) => s.resolvedUrl)),
            });
        });
    }

    if (streamObject.manifest.type === 'dynamic') {
        let formattedInitial = streamObject.rawManifest;
        if (streamObject.protocol === 'dash') {
            formattedInitial = xmlFormatter(streamObject.rawManifest, {
                indentation: '  ',
                lineSeparator: '\n',
            });
        }
        const initialDiffHtml = diffManifest(
            '',
            formattedInitial,
            streamObject.protocol
        );
        streamObject.manifestUpdates.push({
            timestamp: new Date().toLocaleTimeString(),
            diffHtml: initialDiffHtml,
            rawManifest: streamObject.rawManifest,
        });
    }

    return streamObject;
}

async function handleStartAnalysis(inputs) {
    try {
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

async function handleFetchHlsMediaPlaylist({
    streamId,
    url,
    hlsDefinedVariables,
}) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const manifestString = await response.text();
        const { manifest } = await parseHlsManifest(
            manifestString,
            url,
            hlsDefinedVariables
        );

        manifest.rawElement = null;

        self.postMessage({
            type: 'hls-media-playlist-fetched',
            payload: { streamId, url, manifest, rawManifest: manifestString },
        });
    } catch (e) {
        self.postMessage({
            type: 'hls-media-playlist-error',
            payload: { streamId, url, error: e.message },
        });
    }
}

async function handleParseLiveUpdate({
    streamId,
    newManifestString,
    oldRawManifest,
    protocol,
    baseUrl,
    hlsDefinedVariables,
    oldManifestObjectForDelta,
}) {
    try {
        let finalManifestString = newManifestString;
        let newManifestObject;

        if (protocol === 'dash') {
            const { manifest } = await parseDashManifestString(
                newManifestString,
                baseUrl
            );
            newManifestObject = manifest;
        } else {
            // HLS: Check for Delta Update
            if (newManifestString.includes('#EXT-X-SKIP')) {
                const { manifest: deltaManifest } = await parseHlsManifest(
                    newManifestString,
                    baseUrl,
                    hlsDefinedVariables
                );
                const resolvedParsedHls = applyDeltaUpdate(
                    oldManifestObjectForDelta,
                    deltaManifest.rawElement
                );

                // Re-adapt and re-serialize to get the final state
                const { manifest: resolvedManifest } = await parseHlsManifest(
                    serializeHls(resolvedParsedHls),
                    baseUrl,
                    hlsDefinedVariables
                );
                newManifestObject = resolvedManifest;
                finalManifestString = serializeHls(resolvedParsedHls);
            } else {
                const { manifest } = await parseHlsManifest(
                    newManifestString,
                    baseUrl,
                    hlsDefinedVariables
                );
                newManifestObject = manifest;
            }
        }

        // Remove non-serializable properties before sending back
        newManifestObject.rawElement = null;

        self.postMessage({
            type: 'live-update-parsed',
            payload: {
                streamId,
                newManifestObject,
                finalManifestString,
                oldRawManifest,
            },
        });
    } catch (e) {
        self.postMessage({
            type: 'live-update-error',
            payload: { streamId, error: e.message },
        });
    }
}

self.onmessage = async (event) => {
    const { type, payload } = event.data;

    switch (type) {
        case 'start-analysis':
            await handleStartAnalysis(payload.inputs);
            break;
        case 'fetch-hls-media-playlist':
            await handleFetchHlsMediaPlaylist(payload);
            break;
        case 'parse-live-update':
            await handleParseLiveUpdate(payload);
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
};