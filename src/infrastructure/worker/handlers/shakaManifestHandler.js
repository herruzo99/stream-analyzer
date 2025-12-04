import xmlFormatter from 'xml-formatter';
import { resolveAdAvailsInWorker } from '../../../features/advertising/application/resolveAdAvailWorker.js';
import { runChecks } from '../../../features/compliance/domain/engine.js';
import { appLog } from '../../../shared/utils/debug.js';
import { diffManifest } from '../../../ui/shared/diff.js';
import { parseManifest as parseDashManifest } from '../../parsing/dash/parser.js';
import { parseAllSegmentUrls as parseDashSegments } from '../../parsing/dash/segment-parser.js';
import { generateDashSummary } from '../../parsing/dash/summary-generator.js';
import { parseManifest as parseHlsManifest } from '../../parsing/hls/index.js';
import { generateHlsSummary } from '../../parsing/hls/summary-generator.js';
import { fetchWithAuth } from '../http.js';

// --- MEMORY PROTECTION SETTINGS ---
// Cap segment history to ~20-40 minutes depending on segment duration.
// This prevents unbounded array growth.
const MAX_SEGMENT_HISTORY = 300;

function detectProtocol(manifestString, hint) {
    if (hint) return hint;
    if (typeof manifestString !== 'string') return 'dash';
    const trimmed = manifestString.trim();
    if (trimmed.startsWith('#EXTM3U')) return 'hls';
    if (/<MPD/i.test(trimmed)) return 'dash';
    return 'dash';
}

async function analyzeUpdateAndNotify(payload, newManifestString, finalUrl) {
    const {
        streamId,
        oldRawManifest,
        auth,
        baseUrl,
        hlsDefinedVariables,
        oldDashRepresentationState: oldDashRepStateArray,
        oldAdAvails,
        isLive,
        interventionRules, // Extract rules
    } = payload;
    const now = Date.now();
    const detectedProtocol = detectProtocol(
        newManifestString,
        payload.protocol
    );

    // --- Aggressive Normalization for Comparison ---
    const normalizeText = (str, protocol) => {
        if (!str) return '';
        let lines = str.replace(/\r\n/g, '\n').split('\n');

        if (protocol === 'hls') {
            lines = lines.map((line) => {
                const trimmed = line.trim();
                if (!trimmed) return '';
                // If it's not a tag/comment, it's a URI. Strip query string.
                if (!trimmed.startsWith('#')) {
                    try {
                        const idx = trimmed.indexOf('?');
                        return idx > -1 ? trimmed.substring(0, idx) : trimmed;
                    } catch (_e) {
                        return trimmed;
                    }
                }
                return trimmed;
            });
        } else {
            lines = lines.map((l) => l.trim());
        }

        return lines.filter((l) => l.length > 0).join('\n');
    };

    const normalizedOld = normalizeText(oldRawManifest, detectedProtocol);
    const normalizedNew = normalizeText(newManifestString, detectedProtocol);

    let newManifestObject, newSerializedObject, newMediaPlaylists;
    let opportunisticallyCachedSegments = [];

    if (detectedProtocol === 'hls') {
        const { manifest: masterIR, definedVariables } = await parseHlsManifest(
            newManifestString,
            baseUrl,
            hlsDefinedVariables,
            { isLive }
        );

        const allReps = masterIR.periods
            .flatMap((p) => p.adaptationSets)
            .flatMap((as) => as.representations);

        const uriToVariantIdMap = new Map(
            allReps.map((r) => [r.__variantUri, r.id])
        );
        const mediaPlaylistUris = [...uriToVariantIdMap.keys()].filter(Boolean);

        const mediaPlaylistPromises = mediaPlaylistUris.map((uri) =>
            fetchWithAuth(
                uri,
                auth,
                null,
                {},
                null,
                null,
                { streamId, resourceType: 'manifest' }, // Add context for logging blocked requests
                'GET',
                interventionRules // Pass rules
            )
                .then((res) => {
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return res.text();
                })
                .then((text) => ({ uri, text }))
                .catch((err) => ({ uri, error: err }))
        );
        const mediaPlaylistResults = await Promise.all(mediaPlaylistPromises);

        newMediaPlaylists = new Map();
        for (const result of mediaPlaylistResults) {
            if ('text' in result && result.text) {
                try {
                    const { manifest: mediaIR } = await parseHlsManifest(
                        result.text,
                        result.uri,
                        definedVariables
                    );
                    const variantId = uriToVariantIdMap.get(result.uri);
                    if (variantId) {
                        newMediaPlaylists.set(variantId, {
                            manifest: mediaIR,
                            rawManifest: result.text,
                            lastFetched: new Date(),
                            updates: [],
                            activeUpdateId: null,
                        });
                    }
                } catch (_) {
                    /* Ignore parsing errors for individual playlists */
                }
            }
        }

        newManifestObject = masterIR;
        newSerializedObject = masterIR.serializedManifest;

        const hlsSummaryResult = await generateHlsSummary(newManifestObject, {
            mediaPlaylists: newMediaPlaylists,
        });
        newManifestObject.summary = hlsSummaryResult.summary;
        opportunisticallyCachedSegments =
            hlsSummaryResult.opportunisticallyCachedSegments;
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

    if (opportunisticallyCachedSegments.length > 0) {
        for (const segment of opportunisticallyCachedSegments) {
            self.postMessage({
                type: 'worker:shaka-segment-loaded',
                payload: { ...segment, streamId: payload.streamId },
            });
        }
    }

    let formattedOld = normalizedOld;
    let formattedNew = normalizedNew;

    if (detectedProtocol === 'dash') {
        const formatOptions = { indentation: '  ', lineSeparator: '\n' };
        formattedOld = xmlFormatter(oldRawManifest || '', formatOptions);
        formattedNew = xmlFormatter(newManifestString || '', formatOptions);
    }

    const { diffModel, changes } = diffManifest(formattedOld, formattedNew);

    const manifestObjectForChecks =
        detectedProtocol === 'hls' ? newManifestObject : newSerializedObject;
    const complianceResults = runChecks(
        manifestObjectForChecks,
        detectedProtocol
    );

    let dashRepStateForUpdate, hlsVariantStateForUpdate;
    const newlyDiscoveredInbandEvents = [];

    if (detectedProtocol === 'dash') {
        const segmentsByCompositeKey = await parseDashSegments(
            newSerializedObject,
            baseUrl,
            { now }
        );

        // Initialize new state with OLD state to preserve history of periods
        const oldDashRepState = new Map(oldDashRepStateArray);
        const newDashRepState = new Map(oldDashRepState);

        for (const [key, data] of Object.entries(segmentsByCompositeKey)) {
            const oldRepState = oldDashRepState.get(key);
            const initSegment = data.initSegment;
            const newWindowSegments = data.segments || [];

            const existingSegments = oldRepState?.segments || [];
            const existingSegmentIds = new Map(
                existingSegments.map((s) => [s.uniqueId, s])
            );

            // Robust "New" Detection
            const oldSegmentNumbers = new Set();
            const oldSegmentTimes = new Set();
            const oldSegmentUniqueIds = new Set();

            existingSegments.forEach((s) => {
                if (typeof s.number === 'number')
                    oldSegmentNumbers.add(s.number);
                if (typeof s.time === 'number') oldSegmentTimes.add(s.time);
                oldSegmentUniqueIds.add(s.uniqueId);
            });

            const isSegmentNew = (seg) => {
                // For DASH, Time is the most reliable absolute identifier if SegmentTimeline is used
                if (typeof seg.time === 'number' && oldSegmentTimes.size > 0) {
                    return !oldSegmentTimes.has(seg.time);
                }
                // Fallback to Number (Sequence)
                if (
                    typeof seg.number === 'number' &&
                    oldSegmentNumbers.size > 0
                ) {
                    return !oldSegmentNumbers.has(seg.number);
                }
                // Fallback to URL
                return !oldSegmentUniqueIds.has(seg.uniqueId);
            };

            if (initSegment && !existingSegmentIds.has(initSegment.uniqueId)) {
                existingSegmentIds.set(initSegment.uniqueId, initSegment);
            }

            // Merge new segments
            for (const newSeg of newWindowSegments) {
                if (!existingSegmentIds.has(newSeg.uniqueId)) {
                    existingSegmentIds.set(newSeg.uniqueId, newSeg);
                }
            }

            // --- MEMORY FIX: Prune History ---
            let finalSegments = Array.from(existingSegmentIds.values());
            if (finalSegments.length > MAX_SEGMENT_HISTORY) {
                // Always keep Init segment if it exists
                const init = finalSegments.filter((s) => s.type === 'Init');
                const media = finalSegments.filter((s) => s.type === 'Media');

                // Keep the newest N segments
                const keptMedia = media.slice(-MAX_SEGMENT_HISTORY);
                finalSegments = [...init, ...keptMedia];
            }

            const currentSegmentUrlsInWindow = newWindowSegments.map(
                (s) => s.uniqueId
            );

            // Determine truly new segments this cycle
            const newlyAddedSegmentUrls = newWindowSegments
                .filter(isSegmentNew)
                .map((s) => s.uniqueId);

            newDashRepState.set(key, {
                segments: finalSegments,
                currentSegmentUrls: currentSegmentUrlsInWindow,
                newlyAddedSegmentUrls,
                diagnostics: data.diagnostics,
            });
        }
        dashRepStateForUpdate = Array.from(newDashRepState.entries());
    } else {
        // HLS State Update
        const newVariantsById = new Map();
        for (const as of newManifestObject.periods[0].adaptationSets) {
            for (const rep of as.representations) {
                newVariantsById.set(rep.id, rep);
            }
        }

        const oldHlsVariantState = new Map(payload.oldHlsVariantState || []);
        const newHlsVariantState = new Map(oldHlsVariantState);

        for (const [stableId, newRep] of newVariantsById.entries()) {
            const currentUri = newRep.serializedManifest.resolvedUri;
            const oldState = oldHlsVariantState.get(stableId);
            const mediaPlaylistData = newMediaPlaylists.get(stableId);

            const allSegmentsMap = new Map(
                (oldState?.segments || []).map((seg) => [seg.uniqueId, seg])
            );
            const newSegmentsList = mediaPlaylistData?.manifest?.segments || [];

            newSegmentsList.forEach((newSeg) => {
                allSegmentsMap.set(newSeg.uniqueId, newSeg);
            });

            // --- MEMORY FIX: Prune History ---
            let finalSegments = Array.from(allSegmentsMap.values());
            if (finalSegments.length > MAX_SEGMENT_HISTORY) {
                finalSegments = finalSegments.slice(-MAX_SEGMENT_HISTORY);
            }

            // HLS New Detection: Rely on Media Sequence Number if available
            const oldSegmentNumbers = new Set(
                (oldState?.segments || [])
                    .filter((s) => typeof s.number === 'number')
                    .map((s) => s.number)
            );
            const oldSegmentIds = new Set(
                (oldState?.segments || []).map((s) => s.uniqueId)
            );

            const isSegmentNew = (seg) => {
                if (
                    typeof seg.number === 'number' &&
                    oldSegmentNumbers.size > 0
                ) {
                    return !oldSegmentNumbers.has(seg.number);
                }
                return !oldSegmentIds.has(seg.uniqueId);
            };

            const currentSegmentUrls = new Set(
                newSegmentsList.map((s) => s.uniqueId)
            );
            const newlyAddedSegmentUrls = newSegmentsList
                .filter(isSegmentNew)
                .map((s) => s.uniqueId);

            const mergedState = {
                ...(oldState || {}),
                uri: currentUri,
                historicalUris: [
                    ...new Set([
                        ...(oldState?.historicalUris || []),
                        currentUri,
                    ]),
                ],
                segments: finalSegments,
                currentSegmentUrls,
                newlyAddedSegmentUrls: new Set(newlyAddedSegmentUrls),
                isLoading: false,
                error: null,
            };

            newHlsVariantState.set(stableId, mergedState);
        }
        hlsVariantStateForUpdate = Array.from(newHlsVariantState.entries());
    }

    const oldAvailsById = new Map((oldAdAvails || []).map((a) => [a.id, a]));
    const potentialNewAvails = [
        ...(newManifestObject.adAvails || []),
        ...newlyDiscoveredInbandEvents
            .filter((e) => e.scte35)
            .map((event) => ({
                id:
                    String(
                        event.scte35?.splice_command?.splice_event_id ||
                            event.scte35?.descriptors?.[0]
                                ?.segmentation_event_id
                    ) || String(event.startTime),
                startTime: event.startTime,
                duration:
                    event.duration ||
                    (event.scte35?.splice_command?.break_duration?.duration ||
                        0) / 90000,
                scte35Signal: event.scte35,
                adManifestUrl:
                    event.scte35?.descriptors?.[0]?.segmentation_upid_type ===
                    0x0c
                        ? event.scte35.descriptors[0].segmentation_upid
                        : null,
                creatives: [],
                detectionMethod: /** @type {const} */ ('SCTE35_INBAND'),
            })),
    ];

    const hasUnconfirmed = (oldAdAvails || []).some(
        (a) => a.id === 'unconfirmed-inband-scte35'
    );
    const availsToResolve = potentialNewAvails.filter(
        (a) => a.id !== 'unconfirmed-inband-scte35' && !oldAvailsById.has(a.id)
    );

    const newlyResolvedAvails = await resolveAdAvailsInWorker(availsToResolve);

    let finalAdAvails = [...(oldAdAvails || [])];

    if (newlyResolvedAvails.length > 0 && hasUnconfirmed) {
        finalAdAvails = finalAdAvails.filter(
            (a) => a.id !== 'unconfirmed-inband-scte35'
        );
    }

    newlyResolvedAvails.forEach((newAvail) => {
        if (!finalAdAvails.some((a) => a.id === newAvail.id)) {
            finalAdAvails.push(newAvail);
        }
    });

    self.postMessage({
        type: 'livestream:manifest-updated',
        payload: {
            streamId,
            newManifestObject,
            newManifestString,
            complianceResults,
            serializedManifest: newSerializedObject,
            diffModel,
            changes,
            dashRepresentationState: dashRepStateForUpdate,
            hlsVariantState: hlsVariantStateForUpdate,
            adAvails: finalAdAvails,
            inbandEvents: newlyDiscoveredInbandEvents,
            finalUrl,
            newMediaPlaylists: Array.from(newMediaPlaylists || []),
        },
    });
}

export async function handleShakaManifestFetch(payload, signal) {
    const { streamId, url, auth, isLive, baseUrl, interventionRules } = payload; // Extract rules
    const startTime = performance.now();
    appLog('shakaManifestHandler', 'info', `Fetching manifest for ${url}`);

    const response = await fetchWithAuth(
        url,
        auth,
        null,
        {},
        null,
        signal,
        {}, // Logging Context
        'GET',
        interventionRules // Pass rules (9th arg)
    );

    const requestHeadersForLogging = {};
    if (auth?.headers) {
        for (const header of auth.headers) {
            if (header.key) requestHeadersForLogging[header.key] = header.value;
        }
    }

    // Log network event (Manual logic preserved)
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

    let newManifestString = await response.text();

    let responseUri = response.url;
    if (response.url.startsWith('blob:') && baseUrl) {
        responseUri = baseUrl;
        const detectedProtocol = detectProtocol(newManifestString);
        if (detectedProtocol === 'dash') {
            const mpdRegex = /<MPD[^>]*>/;
            const match = newManifestString.match(mpdRegex);
            if (match) {
                const insertIndex = match.index + match[0].length;
                const baseTag = `\n  <BaseURL>${baseUrl}</BaseURL>`;
                newManifestString =
                    newManifestString.slice(0, insertIndex) +
                    baseTag +
                    newManifestString.slice(insertIndex);
            }
        }
    }

    if (isLive) {
        await analyzeUpdateAndNotify(payload, newManifestString, responseUri);
    }

    return {
        uri: responseUri,
        originalUri: responseUri,
        data: new TextEncoder().encode(newManifestString).buffer,
        headers: response.headers,
        status: response.status,
    };
}
