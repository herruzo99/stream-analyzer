import { parseManifest as parseDashManifest } from '@/infrastructure/parsing/dash/parser';
import { parseManifest as parseHlsManifest } from '@/infrastructure/parsing/hls/index';
import { generateDashSummary } from '@/infrastructure/parsing/dash/summary-generator';
import { generateHlsSummary } from '@/infrastructure/parsing/hls/summary-generator';
import { runChecks } from '@/features/compliance/domain/engine';
import { diffManifest } from '@/ui/shared/diff';
import xmlFormatter from 'xml-formatter';
import { fetchWithAuth } from '../http.js';
import { parseAllSegmentUrls as parseDashSegments } from '@/infrastructure/parsing/dash/segment-parser';
import { appLog } from '@/shared/utils/debug';
import { resolveAdAvailsInWorker } from '@/features/advertising/application/resolveAdAvailWorker';
import { parseSegment } from '../parsingService.js';

const SCTE35_SCHEME_ID = 'urn:scte:scte35:2013:bin';

async function fetchAndParseSegment(
    url,
    formatHint,
    range = null,
    auth = null,
    loggingContext = {},
    context = {}
) {
    appLog(
        'shakaManifestHandler.fetchAndParseSegment',
        'info',
        'Fetching segment for in-band event discovery...',
        {
            url,
            formatHint,
            range,
        }
    );
    const response = await fetchWithAuth(
        url,
        auth,
        range,
        {},
        null,
        null,
        loggingContext
    );
    if (!response.ok) {
        throw new Error(`HTTP error ${response.status} for segment ${url}`);
    }
    const data = await response.arrayBuffer();
    const parsedData = await parseSegment({ data, formatHint, url, context });
    return { parsedData, rawBuffer: data };
}

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
        auth,
        baseUrl,
        hlsDefinedVariables,
        oldDashRepresentationState: oldDashRepStateArray,
        oldAdAvails,
        segmentPollingReps,
    } = payload;
    const now = Date.now();
    const detectedProtocol = detectProtocol(
        newManifestString,
        payload.protocol
    );

    let newManifestObject, newSerializedObject;
    if (detectedProtocol === 'hls') {
        const { manifest } = await parseHlsManifest(
            newManifestString,
            baseUrl,
            hlsDefinedVariables
        );
        newManifestObject = manifest;
        newSerializedObject = manifest.serializedManifest;

        if (!newManifestObject.isMaster) {
            appLog(
                'shakaManifestHandler',
                'info',
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
                    inbandEvents: [],
                },
            });
            return;
        }

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

    if (newManifestString.trim() === oldRawManifest.trim()) {
        if (newManifestObject.type !== 'dynamic') {
            appLog(
                'shakaManifestHandler',
                'info',
                'VOD manifest is unchanged. No update needed.'
            );
            return;
        }
        appLog(
            'shakaManifestHandler',
            'info',
            'Live manifest string is unchanged, but proceeding with analysis due to sliding window.'
        );
    }

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
    const newlyDiscoveredInbandEvents = [];

    if (detectedProtocol === 'dash') {
        const segmentsByCompositeKey = await parseDashSegments(
            newSerializedObject,
            baseUrl,
            { now }
        );
        const newDashRepState = new Map();
        const oldDashRepState = new Map(oldDashRepStateArray);
        const activePollingSet = new Set(segmentPollingReps || []);

        for (const [key, data] of Object.entries(segmentsByCompositeKey)) {
            const oldRepState = oldDashRepState.get(key);
            const newWindowSegments = data.segments || [];
            const initSegment = data.initSegment;

            // --- ARCHITECTURAL FIX: Correct state reconciliation logic ---
            // Create a map of old segments for efficient lookup.
            const oldSegmentMap = new Map(
                (oldRepState?.segments || []).map((seg) => [seg.uniqueId, seg])
            );

            // Create the new segment list for the current window, merging with old state.
            const mergedWindowSegments = newWindowSegments.map((newSeg) => {
                const oldSeg = oldSegmentMap.get(newSeg.uniqueId);
                // Merge, preserving properties from oldSeg (like inbandEvents)
                // that newSeg (from parser) wouldn't have.
                return { ...oldSeg, ...newSeg };
            });

            // Re-add the init segment (if it exists) to the final list.
            const finalSegments = [initSegment, ...mergedWindowSegments].filter(
                Boolean
            );
            // --- END FIX ---

            const oldSegmentIds = new Set(
                (oldRepState?.segments || []).map((s) => s.uniqueId)
            );
            const currentSegmentUrlsInWindow = newWindowSegments.map(
                (s) => s.uniqueId
            );
            const newlyAddedSegmentUrls = currentSegmentUrlsInWindow.filter(
                (id) => !oldSegmentIds.has(id)
            );

            if (activePollingSet.has(key) && newlyAddedSegmentUrls.length > 0) {
                appLog(
                    'shakaManifestHandler',
                    'info',
                    `Actively polling rep ${key}. Fetching ${newlyAddedSegmentUrls.length} new segments.`
                );
                const segmentsToFetch = newWindowSegments.filter((s) =>
                    newlyAddedSegmentUrls.includes(s.uniqueId)
                );

                const fetchPromises = segmentsToFetch.map((segment) =>
                    fetchAndParseSegment(
                        segment.resolvedUrl,
                        'isobff',
                        segment.range,
                        auth,
                        { streamId, resourceType: 'video' }
                    )
                        .then((parsed) => ({ ...parsed, segment }))
                        .catch(() => null)
                );

                const parsedSegments = await Promise.all(fetchPromises);
                for (const result of parsedSegments) {
                    if (
                        result?.parsedData?.data?.events &&
                        result.parsedData.data.events.length > 0
                    ) {
                        const events = result.parsedData.data.events.map(
                            (e) => ({
                                ...e,
                                sourceSegmentId: result.segment.uniqueId,
                            })
                        );
                        newlyDiscoveredInbandEvents.push(...events);
                    }
                }
            }

            newDashRepState.set(key, {
                segments: finalSegments, // Use the correctly merged and filtered list
                currentSegmentUrls: currentSegmentUrlsInWindow,
                newlyAddedSegmentUrls,
                diagnostics: data.diagnostics,
            });
        }

        const eventsBySegmentId = {};
        for (const event of newlyDiscoveredInbandEvents) {
            if (!eventsBySegmentId[event.sourceSegmentId]) {
                eventsBySegmentId[event.sourceSegmentId] = [];
            }
            eventsBySegmentId[event.sourceSegmentId].push(event);
        }

        for (const repState of newDashRepState.values()) {
            repState.segments = repState.segments.map((segment) => {
                const eventsForSeg = eventsBySegmentId[segment.uniqueId];
                if (eventsForSeg) {
                    return {
                        ...segment,
                        inbandEvents: [
                            ...(segment.inbandEvents || []),
                            ...eventsForSeg,
                        ],
                    };
                }
                return segment;
            });
        }

        dashRepStateForUpdate = Array.from(newDashRepState.entries());
    } else {
        // HLS
        const oldHlsVariantState = new Map(payload.oldHlsVariantState || []);
        hlsVariantStateForUpdate = [];
        for (const variant of newManifestObject.variants || []) {
            const variantUri = variant.resolvedUri;
            if (variantUri) {
                const oldState = oldHlsVariantState.get(variantUri) || {};
                hlsVariantStateForUpdate.push([
                    variantUri,
                    {
                        ...oldState,
                        currentSegmentUrls: [],
                        newlyAddedSegmentUrls: [],
                    },
                ]);
            }
        }
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
            diffHtml,
            changes,
            dashRepresentationState: dashRepStateForUpdate,
            hlsVariantState: hlsVariantStateForUpdate,
            adAvails: finalAdAvails,
            inbandEvents: newlyDiscoveredInbandEvents,
        },
    });
}

export async function handleShakaManifestFetch(payload, signal) {
    const { streamId, url, auth } = payload;
    const startTime = performance.now();
    appLog('shakaManifestHandler', 'info', `Fetching manifest for ${url}`);

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

    analyzeUpdateAndNotify(payload, newManifestString, response.url);

    appLog(
        'shakaManifestHandler',
        'info',
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