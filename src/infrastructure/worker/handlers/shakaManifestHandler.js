import { parseManifest as parseDashManifest } from '@/infrastructure/parsing/dash/parser';
import { parseManifest as parseHlsManifest } from '@/infrastructure/parsing/hls/index';
import { runChecks } from '@/features/compliance/domain/engine';
import { diffManifest } from '@/ui/shared/diff';
import xmlFormatter from 'xml-formatter';
import { fetchWithAuth } from '../http.js';
import { parseAllSegmentUrls as parseDashSegments } from '@/infrastructure/parsing/dash/segment-parser';
import { debugLog } from '@/shared/utils/debug';

function detectProtocol(manifestString, hint) {
    if (hint) return hint;
    if (typeof manifestString !== 'string') return 'dash';
    const trimmed = manifestString.trim();
    if (trimmed.startsWith('#EXTM3U')) return 'hls';
    if (/<MPD/i.test(trimmed)) return 'dash';
    return 'dash';
}

export async function handleShakaManifestFetch(payload, signal) {
    const {
        streamId,
        url,
        auth,
        isPlayerLoadRequest, // CRITICAL FIX: Receive the context flag
        oldRawManifest,
        protocol: protocolHint,
        baseUrl,
        hlsDefinedVariables,
        oldDashRepresentationState: oldDashRepStateArray,
    } = payload;

    const startTime = performance.now();
    const now = Date.now();
    debugLog('shakaManifestHandler', `Fetching manifest for ${url}`);

    const response = await fetchWithAuth(url, auth, null, {}, null, signal);

    self.postMessage({
        type: 'worker:network-event',
        payload: {
            id: crypto.randomUUID(),
            url: response.url,
            resourceType: 'manifest',
            streamId,
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
        throw new Error(`HTTP ${response.status} fetching manifest for ${url}`);
    }

    const newManifestString = await response.text();
    debugLog(
        'shakaManifestHandler',
        `Fetched new manifest content (length: ${newManifestString.length}).`
    );
    const detectedProtocol = detectProtocol(newManifestString, protocolHint);

    // --- ARCHITECTURAL FIX: Prevent player loads from corrupting state ---
    if (isPlayerLoadRequest) {
        debugLog(
            'shakaManifestHandler',
            'Request is for initial player load. Bypassing analysis and returning raw manifest to player.'
        );
        return {
            uri: response.url,
            originalUri: url,
            data: new TextEncoder().encode(newManifestString).buffer,
            headers: response.headers,
            status: response.status,
        };
    }
    // --- END FIX ---

    if (
        detectedProtocol === 'hls' &&
        !newManifestString.includes('#EXT-X-STREAM-INF')
    ) {
        debugLog(
            'shakaManifestHandler',
            'Detected HLS Media Playlist during non-player-load. Returning to player without updating main state.'
        );
        return {
            uri: response.url,
            originalUri: url,
            data: new TextEncoder().encode(newManifestString).buffer,
            headers: response.headers,
            status: response.status,
        };
    }

    let formattedOld = oldRawManifest;
    let formattedNew = newManifestString;
    if (detectedProtocol === 'dash') {
        const formatOptions = { indentation: '  ', lineSeparator: '\n' };
        formattedOld = xmlFormatter(oldRawManifest || '', formatOptions);
        formattedNew = xmlFormatter(newManifestString || '', formatOptions);
    }

    debugLog(
        'shakaManifestHandler',
        'Processing master/main manifest update. Posting to main thread.'
    );
    const diffHtml = diffManifest(formattedOld, formattedNew, detectedProtocol);

    let newManifestObject;
    let newSerializedObject;
    let dashRepStateForUpdate = null;
    let hlsVariantStateForUpdate = null;

    if (detectedProtocol === 'dash') {
        const { manifest, serializedManifest } = await parseDashManifest(
            newManifestString,
            baseUrl
        );
        newManifestObject = manifest;
        newSerializedObject = serializedManifest;
        const segmentsByCompositeKey = await parseDashSegments(
            newSerializedObject,
            baseUrl,
            { now }
        );
        dashRepStateForUpdate = [];
        const oldDashRepState = new Map(oldDashRepStateArray);

        for (const [key, data] of Object.entries(segmentsByCompositeKey)) {
            const allSegments = [
                data.initSegment,
                ...(data.segments || []),
            ].filter(Boolean);
            const oldRepState = oldDashRepState.get(key);
            const oldSegmentIds = new Set(
                (oldRepState?.segments || []).map((s) => s.uniqueId)
            );
            const currentSegmentUrls = allSegments.map((s) => s.uniqueId);
            const newSegmentUrls = currentSegmentUrls.filter(
                (id) => !oldSegmentIds.has(id)
            );
            dashRepStateForUpdate.push([
                key,
                {
                    segments: allSegments,
                    currentSegmentUrls: currentSegmentUrls,
                    newSegmentUrls: newSegmentUrls,
                    diagnostics: data.diagnostics,
                },
            ]);
        }
    } else {
        const { manifest } = await parseHlsManifest(
            newManifestString,
            baseUrl,
            hlsDefinedVariables
        );
        newManifestObject = manifest;
        newSerializedObject = manifest.serializedManifest;
        const oldHlsVariantState = new Map(payload.oldHlsVariantState || []);
        hlsVariantStateForUpdate = [];
        for (const variant of newManifestObject.variants || []) {
            const variantUri = variant.resolvedUri;
            if (variantUri) {
                const oldState = oldHlsVariantState.get(variantUri) || {};
                hlsVariantStateForUpdate.push([
                    variantUri,
                    {
                        segments: oldState.segments || [],
                        currentSegmentUrls: oldState.currentSegmentUrls || [],
                        newlyAddedSegmentUrls: [],
                        isLoading: false,
                        isPolling: false,
                        isExpanded: oldState.isExpanded || false,
                        displayMode: oldState.displayMode || 'all',
                        error: null,
                    },
                ]);
            }
        }
    }

    const manifestObjectForChecks =
        detectedProtocol === 'hls' ? newManifestObject : newSerializedObject;
    const complianceResults = runChecks(
        manifestObjectForChecks,
        detectedProtocol
    );

    newManifestObject.serializedManifest = newSerializedObject;

    self.postMessage({
        type: 'livestream:manifest-updated',
        payload: {
            streamId,
            newManifestObject,
            newManifestString,
            complianceResults,
            serializedManifest: newSerializedObject,
            diffHtml,
            dashRepresentationState: dashRepStateForUpdate,
            hlsVariantState: hlsVariantStateForUpdate,
        },
    });

    return {
        uri: response.url,
        originalUri: url,
        data: new TextEncoder().encode(newManifestString).buffer,
        headers: response.headers,
        status: response.status,
    };
}
