import { parseManifest as parseDashManifest } from '@/infrastructure/parsing/dash/parser';
import { parseManifest as parseHlsManifest } from '@/infrastructure/parsing/hls/index';
import { generateDashSummary } from '@/infrastructure/parsing/dash/summary-generator';
import { generateHlsSummary } from '@/infrastructure/parsing/hls/summary-generator';
import { runChecks } from '@/features/compliance/domain/engine';
import { diffManifest } from '@/ui/shared/diff';
import xmlFormatter from 'xml-formatter';
import { fetchWithAuth } from '../http.js';
import { parseAllSegmentUrls as parseDashSegments } from '@/infrastructure/parsing/dash/segment-parser';
import { debugLog } from '@/shared/utils/debug';
import { resolveAdAvailsInWorker } from '@/features/advertising/application/resolveAdAvailWorker';

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
        isPlayerLoadRequest,
        oldRawManifest,
        protocol: protocolHint,
        baseUrl,
        hlsDefinedVariables,
        oldDashRepresentationState: oldDashRepStateArray,
        oldAdAvails,
    } = payload;

    const startTime = performance.now();
    const now = Date.now();
    debugLog('shakaManifestHandler', `Fetching manifest for ${url}`);

    const response = await fetchWithAuth(url, auth, null, {}, null, signal);

    // --- BUG FIX: Correctly assemble request headers for logging ---
    const requestHeadersForLogging = {};
    if (auth?.headers) {
        for (const header of auth.headers) {
            if (header.key) {
                requestHeadersForLogging[header.key] = header.value;
            }
        }
    }

    self.postMessage({
        type: 'worker:network-event',
        payload: {
            id: crypto.randomUUID(),
            url: response.url,
            resourceType: 'manifest',
            streamId,
            request: { method: 'GET', headers: requestHeadersForLogging },
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
                breakdown: null, // This will be enriched by the main thread
            },
        },
    });
    // --- END BUG FIX ---

    if (!response.ok) {
        throw new Error(
            `HTTP error ${response.status} fetching manifest for ${url}`
        );
    }

    const newManifestString = await response.text();
    debugLog(
        'shakaManifestHandler',
        `Fetched new manifest content (length: ${newManifestString.length}).`
    );
    const detectedProtocol = detectProtocol(newManifestString, protocolHint);

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
            const newlyAddedSegmentUrls = currentSegmentUrls.filter(
                (id) => !oldSegmentIds.has(id)
            );
            dashRepStateForUpdate.push([
                key,
                {
                    segments: allSegments,
                    currentSegmentUrls: currentSegmentUrls,
                    newlyAddedSegmentUrls: newlyAddedSegmentUrls,
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

    // --- STATEFUL AD RESOLUTION LOGIC ---
    const oldAvailsById = new Map((oldAdAvails || []).map((a) => [a.id, a]));
    const potentialNewAvails = newManifestObject.adAvails || [];
    const availsToResolve = potentialNewAvails.filter(
        (a) => !oldAvailsById.has(a.id)
    );

    debugLog(
        'shakaManifestHandler',
        `Found ${potentialNewAvails.length} total avails in new manifest. ${availsToResolve.length} are new and require VAST resolution.`
    );

    const newlyResolvedAvails = await resolveAdAvailsInWorker(availsToResolve);
    const newlyResolvedAvailsById = new Map(
        newlyResolvedAvails.map((a) => [a.id, a])
    );

    // Reconstruct the final list based on the new manifest's periods,
    // using already resolved data for old avails and newly resolved data for new ones.
    const finalAdAvails = potentialNewAvails.map((avail) => {
        if (oldAvailsById.has(avail.id)) {
            return oldAvailsById.get(avail.id); // Return the memoized, already-resolved version
        }
        return newlyResolvedAvailsById.get(avail.id) || avail; // Return the newly resolved version, or the partial if resolution failed
    });
    // --- END STATEFUL AD RESOLUTION ---

    if (detectedProtocol === 'dash') {
        newManifestObject.summary = await generateDashSummary(
            newManifestObject,
            newSerializedObject
        );
    } else {
        newManifestObject.summary = await generateHlsSummary(newManifestObject);
    }

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
            adAvails: finalAdAvails, // Send the final merged list
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