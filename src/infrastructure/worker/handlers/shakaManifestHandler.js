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

/**
 * An asynchronous, non-blocking function to perform all application-level analysis for a live manifest update.
 * @param {object} payload - The original payload received by the handler.
 * @param {string} newManifestString - The newly fetched manifest content.
 * @param {string} finalUrl - The final URL after any redirects.
 */
async function analyzeUpdateAndNotify(payload, newManifestString, finalUrl) {
    const {
        streamId,
        oldRawManifest,
        baseUrl,
        hlsDefinedVariables,
        oldDashRepresentationState: oldDashRepStateArray,
        oldAdAvails,
    } = payload;
    const now = Date.now();
    const detectedProtocol = detectProtocol(
        newManifestString,
        payload.protocol
    );

    // --- REFACTORED LOGIC ---
    // 1. Unconditionally parse the new manifest and generate its summary.
    let newManifestObject, newSerializedObject;
    if (detectedProtocol === 'hls') {
        const { manifest } = await parseHlsManifest(
            newManifestString,
            baseUrl,
            hlsDefinedVariables
        );
        newManifestObject = manifest;
        newSerializedObject = manifest.serializedManifest;

        // --- FIX: Handle media playlist updates directly from the player ---
        if (!newManifestObject.isMaster) {
            debugLog(
                'shakaManifestHandler',
                'Detected HLS media playlist update from player.'
            );

            const oldHlsVariantState = new Map(
                payload.oldHlsVariantState || []
            );
            const oldSegments =
                oldHlsVariantState.get(finalUrl)?.segments || [];
            const newSegments = newManifestObject.segments || [];
            const oldSegmentIds = new Set(oldSegments.map((s) => s.uniqueId));
            const currentSegmentUrls = newSegments.map((s) => s.uniqueId);
            const newSegmentUrls = currentSegmentUrls.filter(
                (id) => !oldSegmentIds.has(id)
            );

            self.postMessage({
                type: 'hls-media-playlist-updated-by-player',
                payload: {
                    streamId: payload.streamId,
                    variantUri: finalUrl,
                    manifest: newManifestObject,
                    manifestString: newManifestString,
                    segments: newSegments,
                    currentSegmentUrls,
                    newSegmentUrls,
                },
            });
            // Stop further processing for this media playlist update.
            return;
        }
        // --- END FIX ---

        newManifestObject.summary = await generateHlsSummary(newManifestObject);
    } else {
        const { manifest, serializedManifest } = await parseDashManifest(
            newManifestString,
            baseUrl
        );
        newManifestObject = manifest;
        newSerializedObject = serializedManifest;
        newManifestObject.summary = await generateDashSummary(
            newManifestObject,
            newSerializedObject
        );
    }
    newManifestObject.serializedManifest = newSerializedObject;

    // 2. Check for changes. If none, ONLY short-circuit for VOD streams.
    if (newManifestString.trim() === oldRawManifest.trim()) {
        if (newManifestObject.type !== 'dynamic') {
            debugLog(
                'shakaManifestHandler',
                'VOD manifest is unchanged. No update needed.'
            );
            return; // No changes to a static manifest, so we are done.
        }
        debugLog(
            'shakaManifestHandler',
            'Live manifest string is unchanged, but proceeding with analysis due to sliding window.'
        );
    }

    // 3. If changed (or live), proceed with full diff, compliance, and segment analysis.
    let formattedOld = oldRawManifest;
    let formattedNew = newManifestString;
    if (detectedProtocol === 'dash') {
        const formatOptions = { indentation: '  ', lineSeparator: '\n' };
        formattedOld = xmlFormatter(oldRawManifest || '', formatOptions);
        formattedNew = xmlFormatter(newManifestString || '', formatOptions);
    }

    const { diffHtml, changes } = diffManifest(
        formattedOld,
        formattedNew,
        detectedProtocol
    );

    const manifestObjectForChecks =
        detectedProtocol === 'hls' ? newManifestObject : newSerializedObject;
    const complianceResults = runChecks(
        manifestObjectForChecks,
        detectedProtocol
    );

    let dashRepStateForUpdate, hlsVariantStateForUpdate;
    if (detectedProtocol === 'dash') {
        const segmentsByCompositeKey = await parseDashSegments(
            newSerializedObject,
            baseUrl,
            { now }
        );
        dashRepStateForUpdate = [];
        const oldDashRepState = new Map(oldDashRepStateArray);

        for (const [key, data] of Object.entries(segmentsByCompositeKey)) {
            const oldRepState = oldDashRepState.get(key);
            const newWindowSegments = data.segments || [];
            const initSegment = data.initSegment;

            // Merge old and new segments using a Map to handle deduplication and updates.
            const segmentMap = new Map();
            if (oldRepState?.segments) {
                oldRepState.segments.forEach((seg) =>
                    segmentMap.set(seg.uniqueId, seg)
                );
            }

            if (initSegment) {
                segmentMap.set(initSegment.uniqueId, initSegment);
            }

            newWindowSegments.forEach((seg) =>
                segmentMap.set(seg.uniqueId, seg)
            );

            const mergedSegments = Array.from(segmentMap.values());

            const oldSegmentIds = new Set(
                (oldRepState?.segments || []).map((s) => s.uniqueId)
            );

            // currentSegmentUrls should represent only the segments in the LATEST manifest window.
            const currentSegmentUrlsInWindow = newWindowSegments.map(
                (s) => s.uniqueId
            );

            const newlyAddedSegmentUrls = currentSegmentUrlsInWindow.filter(
                (id) => !oldSegmentIds.has(id)
            );

            dashRepStateForUpdate.push([
                key,
                {
                    segments: mergedSegments,
                    currentSegmentUrls: currentSegmentUrlsInWindow,
                    newlyAddedSegmentUrls,
                    diagnostics: data.diagnostics,
                },
            ]);
        }
    } else {
        const oldHlsVariantState = new Map(payload.oldHlsVariantState || []);
        hlsVariantStateForUpdate = [];
        for (const variant of newManifestObject.variants || []) {
            const variantUri = variant.resolvedUri;
            if (variantUri) {
                const oldState = oldHlsVariantState.get(variantUri) || {};
                hlsVariantStateForUpdate.push([
                    variantUri,
                    {
                        ...oldState, // Preserve existing segments, isLoading state, etc.
                        currentSegmentUrls: [], // This will be calculated on the main thread now
                        newlyAddedSegmentUrls: [],
                    },
                ]);
            }
        }
    }

    const oldAvailsById = new Map((oldAdAvails || []).map((a) => [a.id, a]));
    const potentialNewAvails = newManifestObject.adAvails || [];
    const availsToResolve = potentialNewAvails.filter(
        (a) => !oldAvailsById.has(a.id)
    );
    const newlyResolvedAvails = await resolveAdAvailsInWorker(availsToResolve);
    const newlyResolvedAvailsById = new Map(
        newlyResolvedAvails.map((a) => [a.id, a])
    );

    const finalAdAvails = potentialNewAvails.map((avail) => {
        if (oldAvailsById.has(avail.id)) {
            return oldAvailsById.get(avail.id);
        }
        return newlyResolvedAvailsById.get(avail.id) || avail;
    });

    self.postMessage({
        type: 'livestream:manifest-updated',
        payload: {
            streamId,
            newManifestObject,
            newManifestString,
            complianceResults,
            serializedManifest: newSerializedObject,
            diffHtml,
            changes,
            dashRepresentationState: dashRepStateForUpdate,
            hlsVariantState: hlsVariantStateForUpdate,
            adAvails: finalAdAvails,
        },
    });
}

export async function handleShakaManifestFetch(payload, signal) {
    const { streamId, url, auth } = payload;
    const startTime = performance.now();
    debugLog('shakaManifestHandler', `Fetching manifest for ${url}`);

    const response = await fetchWithAuth(url, auth, null, {}, null, signal);
    const requestHeadersForLogging = {};
    if (auth?.headers) {
        for (const header of auth.headers) {
            if (header.key) requestHeadersForLogging[header.key] = header.value;
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
                breakdown: null,
            },
        },
    });

    if (!response.ok) {
        throw new Error(
            `HTTP error ${response.status} fetching manifest for ${url}`
        );
    }

    const newManifestString = await response.text();

    // Always trigger the analysis and notification pipeline. The `analyzeUpdateAndNotify`
    // function is smart enough to differentiate between a VOD manifest that hasn't
    // changed and a live manifest that needs re-evaluation.
    analyzeUpdateAndNotify(payload, newManifestString, response.url);

    debugLog(
        'shakaManifestHandler',
        'Returning raw manifest to Shaka player immediately.'
    );
    return {
        uri: response.url,
        originalUri: url,
        data: new TextEncoder().encode(newManifestString).buffer,
        headers: response.headers,
        status: response.status,
    };
}
