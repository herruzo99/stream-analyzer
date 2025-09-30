import { parseISOBMFF } from './protocols/segment/isobmff/parser.js';
import { parse as parseTsSegment } from './protocols/segment/ts/index.js';
import { parseManifest as parseDashManifestString } from './protocols/manifest/dash/index.js';
import { parseManifest as parseHlsManifest } from './protocols/manifest/hls/parser.js';
import { parseAllSegmentUrls as parseDashSegments } from './protocols/manifest/dash/segment-parser.js';

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
        manifestIR,
        input.protocol,
        serializedManifestObject
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

    // Remove non-serializable properties before sending back to the main thread
    if (streamObject.manifest) {
        streamObject.manifest.rawElement = null;
        if (streamObject.manifest.summary) {
            // This was causing a circular reference issue
        }
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

self.onmessage = async (event) => {
    const { type, payload } = event.data;

    switch (type) {
        case 'start-analysis':
            await handleStartAnalysis(payload.inputs);
            break;
        case 'fetch-hls-media-playlist':
            await handleFetchHlsMediaPlaylist(payload);
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
