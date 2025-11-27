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
    } = payload;
    const now = Date.now();
    const detectedProtocol = detectProtocol(
        newManifestString,
        payload.protocol
    );

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
            fetchWithAuth(uri, auth)
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

    let formattedOld = oldRawManifest;
    let formattedNew = newManifestString;
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
        const newDashRepState = new Map();
        const oldDashRepState = new Map(oldDashRepStateArray);

        for (const [key, data] of Object.entries(segmentsByCompositeKey)) {
            const oldRepState = oldDashRepState.get(key);
            const initSegment = data.initSegment;
            const newWindowSegments = data.segments || [];

            const existingSegments = oldRepState?.segments || [];
            const existingSegmentIds = new Map(
                existingSegments.map((s) => [s.uniqueId, s])
            );

            if (initSegment && !existingSegmentIds.has(initSegment.uniqueId)) {
                existingSegmentIds.set(initSegment.uniqueId, initSegment);
            }

            for (const newSeg of newWindowSegments) {
                if (!existingSegmentIds.has(newSeg.uniqueId)) {
                    existingSegmentIds.set(newSeg.uniqueId, newSeg);
                }
            }
            const finalSegments = Array.from(existingSegmentIds.values());

            const oldSegmentIds = new Set(
                (oldRepState?.segments || []).map((s) => s.uniqueId)
            );
            const currentSegmentUrlsInWindow = newWindowSegments.map(
                (s) => s.uniqueId
            );
            const newlyAddedSegmentUrls = currentSegmentUrlsInWindow.filter(
                (id) => !oldSegmentIds.has(id)
            );

            newDashRepState.set(key, {
                segments: finalSegments,
                currentSegmentUrls: currentSegmentUrlsInWindow,
                newlyAddedSegmentUrls,
                diagnostics: data.diagnostics,
            });
        }
        dashRepStateForUpdate = Array.from(newDashRepState.entries());
    } else {
        // HLS
        const newVariantsById = new Map();
        for (const as of newManifestObject.periods[0].adaptationSets) {
            for (const rep of as.representations) {
                newVariantsById.set(rep.id, rep);
            }
        }

        const oldHlsVariantState = new Map(payload.oldHlsVariantState || []);
        const newHlsVariantState = new Map();

        for (const [stableId, newRep] of newVariantsById.entries()) {
            const currentUri = newRep.serializedManifest.resolvedUri;
            const oldState = oldHlsVariantState.get(stableId);
            const mediaPlaylistData = newMediaPlaylists.get(stableId);

            const allSegmentsMap = new Map(
                (oldState?.segments || []).map((seg) => [seg.uniqueId, seg])
            );
            (mediaPlaylistData?.manifest?.segments || []).forEach((newSeg) => {
                const oldSeg = allSegmentsMap.get(newSeg.uniqueId);
                allSegmentsMap.set(newSeg.uniqueId, { ...oldSeg, ...newSeg });
            });
            const finalSegments = Array.from(allSegmentsMap.values());

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
                isLoading: false,
                error: null,
            };

            const oldSegmentIds = new Set(
                (oldState?.segments || []).map((s) => s.uniqueId)
            );
            mergedState.currentSegmentUrls = new Set(
                (mediaPlaylistData?.manifest.segments || []).map(
                    (s) => s.uniqueId
                )
            );
            mergedState.newlyAddedSegmentUrls = new Set(
                [...mergedState.currentSegmentUrls].filter(
                    (id) => !oldSegmentIds.has(id)
                )
            );

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
    const { streamId, url, auth, isLive, baseUrl } = payload;
    const startTime = performance.now();
    appLog('shakaManifestHandler', 'info', `Fetching manifest for ${url}`);

    // Pass empty object for loggingContext to disable fetchWithAuth's automatic logging,
    // because we log it manually below.
    const response = await fetchWithAuth(
        url,
        auth,
        null,
        {},
        null,
        signal,
        {}, // Disable auto logging
        'GET'
    );

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

    let newManifestString = await response.text();

    // --- ARCHITECTURAL FIX: Determine correct Base URI for Shaka ---
    // If the manifest was loaded from a Blob URL (patched), we must return
    // the original stream's base URL as the `uri` so that relative paths resolve correctly.
    let responseUri = response.url;
    if (response.url.startsWith('blob:') && baseUrl) {
        appLog(
            'shakaManifestHandler',
            'info',
            `Detected Blob URL manifest. Overriding response URI to: ${baseUrl}`
        );
        responseUri = baseUrl;

        // --- ADDITIONAL FIX: Inject BaseURL into DASH manifest ---
        // Shaka's internal DASH parser sometimes relies on the manifest content
        // itself to resolve relative paths if the MPD BaseURL handling logic kicks in.
        // Injecting the absolute BaseURL ensures no ambiguity.
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
                appLog(
                    'shakaManifestHandler',
                    'info',
                    `Injected <BaseURL> for DASH path resolution.`
                );
            }
        }
    }

    if (isLive) {
        await analyzeUpdateAndNotify(payload, newManifestString, responseUri);
    } else {
        appLog(
            'shakaManifestHandler',
            'info',
            'VOD stream detected. Skipping analysis and returning manifest to Shaka.'
        );
    }

    appLog(
        'shakaManifestHandler',
        'info',
        'Returning raw manifest to Shaka player immediately.'
    );

    return {
        uri: responseUri,
        originalUri: responseUri, // Override this too to prevent fallback logic in Shaka
        data: new TextEncoder().encode(newManifestString).buffer,
        headers: response.headers,
        status: response.status,
    };
}
