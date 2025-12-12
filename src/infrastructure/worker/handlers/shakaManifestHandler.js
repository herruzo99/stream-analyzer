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
const MAX_SEGMENT_HISTORY = 300;

/**
 * Detects the protocol based on content first, then hint.
 * Fixes issue where default 'dash' hint forced XML parsing on HLS playlists.
 */
function detectProtocol(manifestString, hint) {
    if (typeof manifestString !== 'string') return hint || 'dash';

    const trimmed = manifestString.trim();

    // 1. Strong Content Signals (Override Hint)
    if (trimmed.startsWith('#EXTM3U')) {
        return 'hls';
    }
    if (/<MPD/i.test(trimmed)) {
        return 'dash';
    }

    // 2. Fallback to Hint
    if (hint && hint !== 'unknown') {
        return hint;
    }

    // 3. Default
    return 'dash';
}

/**
 * Identifies whether the URL corresponds to the Master Playlist or a known Variant.
 * Robust matching against base URLs and historical redirects.
 */
function identifyPlaylist(url, baseUrl, variantStateArray) {
    const normalize = (u) => (u ? u.split('?')[0] : '');
    const target = normalize(url);

    // 1. Check against Base URL (likely Master)
    if (baseUrl && normalize(baseUrl) === target) return 'master';

    // 2. Check against known Variants
    if (variantStateArray && Array.isArray(variantStateArray)) {
        for (const entry of variantStateArray) {
            // Ensure entry is a valid [key, value] pair
            if (!Array.isArray(entry) || entry.length < 2) continue;
            const [id, state] = entry;
            if (!state) continue;

            if (normalize(state.uri) === target) return id;
            if (state.historicalUris && state.historicalUris.some(u => normalize(u) === target)) return id;
        }
    }

    // Default to master if we can't find it
    return 'master';
}

async function analyzeUpdateAndNotify(payload, newManifestString, finalUrl) {
    let currentStep = 'init';

    try {
        currentStep = 'destructuring';
        const {
            streamId,
            oldRawManifest,
            auth,
            baseUrl,
            hlsDefinedVariables,
            oldDashRepresentationState: oldDashRepStateArray,
            oldHlsVariantState: oldHlsVariantStateArray,
            oldAdAvails,
            isLive,
            interventionRules,
        } = payload;

        if (!newManifestString) throw new Error("New manifest string is empty/null");

        const now = Date.now();

        currentStep = 'protocol_detection';
        const detectedProtocol = detectProtocol(
            newManifestString,
            payload.protocol
        );

        // DIAGNOSTIC LOG
        if (payload.protocol && payload.protocol !== detectedProtocol) {
            appLog('shakaManifestHandler', 'warn', `Protocol Mismatch Detected. Hint: ${payload.protocol}, Detected: ${detectedProtocol}. Using Detected.`);
        }

        currentStep = 'playlist_identification';
        let updatedPlaylistId = 'master';
        if (detectedProtocol === 'hls') {
            updatedPlaylistId = identifyPlaylist(finalUrl, baseUrl, oldHlsVariantStateArray);
        }

        currentStep = 'text_normalization';
        const normalizeText = (str, protocol) => {
            if (!str) return '';
            let lines = str.replace(/\r\n/g, '\n').split('\n');

            if (protocol === 'hls') {
                lines = lines.map((line) => {
                    let trimmed = line.trim();
                    if (!trimmed) return '';
                    if (!trimmed.startsWith('#')) {
                        try {
                            const idx = trimmed.indexOf('?');
                            if (idx > -1) trimmed = trimmed.substring(0, idx);
                        } catch (_e) { /* ignore */ }
                        return '  ' + trimmed;
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
        const mediaPlaylistAdAvails = [];

        if (detectedProtocol === 'hls') {
            currentStep = 'hls_parsing';
            const { manifest: parsedIR, definedVariables } = await parseHlsManifest(
                newManifestString,
                finalUrl,
                hlsDefinedVariables,
                { isLive }
            );

            let treatAsMaster = (updatedPlaylistId === 'master' && parsedIR.isMaster);

            // Correction: If identifyPlaylist returned 'master' (fallback), but the parser sees Segments,
            // it's actually a Media Playlist.
            if (updatedPlaylistId === 'master' && !parsedIR.isMaster && parsedIR.segments.length > 0) {
                treatAsMaster = false;
            }

            if (treatAsMaster) {
                currentStep = 'hls_master_deep_scan';
                const allReps = parsedIR.periods
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
                        { streamId, resourceType: 'manifest' },
                        'GET',
                        interventionRules
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
                            if (mediaIR.adAvails && mediaIR.adAvails.length > 0) {
                                mediaPlaylistAdAvails.push(...mediaIR.adAvails);
                            }
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
                        } catch (_) { /* Ignore */ }
                    }
                }

                newManifestObject = parsedIR;
                newSerializedObject = parsedIR.serializedManifest;

                currentStep = 'hls_summary_gen';
                const hlsSummaryResult = await generateHlsSummary(newManifestObject, {
                    mediaPlaylists: newMediaPlaylists,
                });
                newManifestObject.summary = hlsSummaryResult.summary;
                opportunisticallyCachedSegments = hlsSummaryResult.opportunisticallyCachedSegments;

            } else {
                newManifestObject = parsedIR;
                newSerializedObject = parsedIR.serializedManifest;
                newMediaPlaylists = new Map();

                // If it's a specific variant update, update that state
                if (updatedPlaylistId !== 'master') {
                    newMediaPlaylists.set(updatedPlaylistId, {
                        manifest: parsedIR,
                        rawManifest: newManifestString,
                        lastFetched: new Date(),
                        updates: [],
                        activeUpdateId: null
                    });

                    if (parsedIR.adAvails && parsedIR.adAvails.length > 0) {
                        mediaPlaylistAdAvails.push(...parsedIR.adAvails);
                    }
                }
            }

        } else {
            currentStep = 'dash_parsing';
            const { manifest, serializedManifest } = await parseDashManifest(
                newManifestString,
                finalUrl
            );
            newManifestObject = manifest;
            newSerializedObject = serializedManifest;

            currentStep = 'dash_summary';
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

        currentStep = 'diff_prep';
        let formattedOld = normalizedOld;
        let formattedNew = normalizedNew;

        if (detectedProtocol === 'dash') {
            const formatOptions = {
                indentation: '  ',
                lineSeparator: '\n',
                collapseContent: true,
            };
            try {
                formattedOld = xmlFormatter(oldRawManifest || '', formatOptions);
            } catch (_e) {
                formattedOld = oldRawManifest || '';
            }
            try {
                formattedNew = xmlFormatter(newManifestString || '', formatOptions);
            } catch (_e) {
                formattedNew = newManifestString || '';
            }
        }

        currentStep = 'diff_calc';
        const { diffModel, changes } = diffManifest(formattedOld, formattedNew);

        currentStep = 'compliance_checks';
        const manifestObjectForChecks =
            detectedProtocol === 'hls' ? newManifestObject : newSerializedObject;
        const complianceResults = runChecks(
            manifestObjectForChecks,
            detectedProtocol
        );

        let dashRepStateForUpdate, hlsVariantStateForUpdate;
        const newlyDiscoveredInbandEvents = [];

        currentStep = 'state_reconcile';
        if (detectedProtocol === 'dash') {
            const segmentsByCompositeKey = await parseDashSegments(
                newSerializedObject,
                baseUrl,
                { now }
            );

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
                    if (typeof seg.time === 'number' && oldSegmentTimes.size > 0) {
                        return !oldSegmentTimes.has(seg.time);
                    }
                    if (
                        typeof seg.number === 'number' &&
                        oldSegmentNumbers.size > 0
                    ) {
                        return !oldSegmentNumbers.has(seg.number);
                    }
                    return !oldSegmentUniqueIds.has(seg.uniqueId);
                };

                if (initSegment && !existingSegmentIds.has(initSegment.uniqueId)) {
                    existingSegmentIds.set(initSegment.uniqueId, initSegment);
                }

                for (const newSeg of newWindowSegments) {
                    if (!existingSegmentIds.has(newSeg.uniqueId)) {
                        existingSegmentIds.set(newSeg.uniqueId, newSeg);
                    }
                }

                let finalSegments = Array.from(existingSegmentIds.values());
                if (finalSegments.length > MAX_SEGMENT_HISTORY) {
                    const init = finalSegments.filter((s) => s.type === 'Init');
                    const media = finalSegments.filter((s) => s.type === 'Media');
                    const keptMedia = media.slice(-MAX_SEGMENT_HISTORY);
                    finalSegments = [...init, ...keptMedia];
                }

                let currentSegmentUrlsInWindow;
                if (isLive && newWindowSegments.length === 0 && existingSegments.length > 0) {
                    currentSegmentUrlsInWindow = oldRepState.currentSegmentUrls || [];
                } else {
                    currentSegmentUrlsInWindow = newWindowSegments.map(s => s.uniqueId);
                }

                const newlyAddedSegmentUrls = newWindowSegments
                    .filter(isSegmentNew)
                    .map((s) => s.uniqueId);

                // Find the representation in the parsed manifest to get metadata
                let repMetadata = null;
                if (newManifestObject && newManifestObject.periods) {
                    for (const [periodIndex, period] of newManifestObject.periods.entries()) {
                        for (const as of period.adaptationSets) {
                            for (const rep of as.representations) {
                                // MATCHING LOGIC: Must match parseDashSegments composite key
                                const compositeKey = `${period.id || periodIndex}-${rep.id}`;

                                // appLog('shakaManifestHandler', 'info', `Checking key match: ${compositeKey} vs ${key}`);

                                if (compositeKey === key) {
                                    repMetadata = {
                                        mediaType: as.contentType,
                                        mimeType: rep.mimeType || as.mimeType,
                                        codecs: rep.codecs?.[0]?.value || null,
                                        // Handle DASH Label element or attribute. Use bracket notation to bypass strict type checks if needed.
                                        label: rep.label || rep['Label'] || as.label || as['Label'] || null
                                    };


                                    break;
                                }
                            }
                            if (repMetadata) break;
                        }
                        if (repMetadata) break;
                    }
                }

                newDashRepState.set(key, {
                    segments: finalSegments,
                    currentSegmentUrls: currentSegmentUrlsInWindow,
                    newlyAddedSegmentUrls,
                    diagnostics: data.diagnostics,
                    mediaType: repMetadata?.mediaType,
                    mimeType: repMetadata?.mimeType,
                    codecs: repMetadata?.codecs,
                    label: repMetadata?.label
                });
            }
            dashRepStateForUpdate = Array.from(newDashRepState.entries());
        } else {
            const oldHlsVariantState = new Map(oldHlsVariantStateArray || []);
            const newHlsVariantState = new Map(oldHlsVariantState);

            const processVariantState = (variantId, parsedPlaylist) => {
                if (!parsedPlaylist) return;

                const oldState = oldHlsVariantState.get(variantId);
                const currentUri = finalUrl;

                const allSegmentsMap = new Map(
                    (oldState?.segments || []).map((seg) => [seg.uniqueId, seg])
                );

                const newSegmentsList = parsedPlaylist.segments || [];

                let timeOffset = 0;
                if (newSegmentsList.length > 0 && oldState?.segments?.length > 0) {
                    const firstNewSeg = newSegmentsList[0];
                    const matchingOldSeg = oldState.segments.find(
                        (s) => typeof s.number === 'number' && s.number === firstNewSeg.number
                    );
                    if (matchingOldSeg) {
                        timeOffset = matchingOldSeg.time - firstNewSeg.time;
                    } else {
                        const lastOldSeg = oldState.segments[oldState.segments.length - 1];
                        if (lastOldSeg && typeof lastOldSeg.number === 'number' && typeof firstNewSeg.number === 'number') {
                            const seqDiff = firstNewSeg.number - lastOldSeg.number;
                            if (seqDiff > 0) {
                                const avgDuration = newManifestObject.summary?.hls?.targetDuration || 6;
                                timeOffset = (lastOldSeg.time + lastOldSeg.duration) + ((seqDiff - 1) * avgDuration) - firstNewSeg.time;
                            }
                        }
                    }
                }

                if (timeOffset !== 0) {
                    newSegmentsList.forEach(s => s.time += timeOffset);
                }

                newSegmentsList.forEach(newSeg => {
                    if (newSeg.repId === 'hls-media') newSeg.repId = variantId;
                    allSegmentsMap.set(newSeg.uniqueId, newSeg);
                });

                let finalSegments = Array.from(allSegmentsMap.values());
                if (finalSegments.length > MAX_SEGMENT_HISTORY) {
                    finalSegments.sort((a, b) => a.number - b.number);
                    finalSegments = finalSegments.slice(-MAX_SEGMENT_HISTORY);
                }

                const oldSegmentNumbers = new Set(
                    (oldState?.segments || []).filter(s => typeof s.number === 'number').map(s => s.number)
                );
                const oldSegmentIds = new Set((oldState?.segments || []).map(s => s.uniqueId));

                const isSegmentNew = (seg) => {
                    if (typeof seg.number === 'number' && oldSegmentNumbers.size > 0) {
                        return !oldSegmentNumbers.has(seg.number);
                    }
                    return !oldSegmentIds.has(seg.uniqueId);
                };

                let currentSegmentUrls;
                if (isLive && newSegmentsList.length === 0 && (oldState?.segments || []).length > 0) {
                    currentSegmentUrls = oldState.currentSegmentUrls || new Set();
                } else {
                    currentSegmentUrls = new Set(newSegmentsList.map(s => s.uniqueId));
                }

                const newlyAddedSegmentUrls = newSegmentsList.filter(isSegmentNew).map(s => s.uniqueId);

                // Extract label from Master Playlist IR
                let variantLabel = null;
                if (newManifestObject && newManifestObject.periods) {
                    for (const p of newManifestObject.periods) {
                        for (const as of p.adaptationSets) {
                            for (const r of as.representations) {
                                if (r.id === variantId) {
                                    // HLS 'NAME' attribute usually maps to 'name' or 'label' in IR
                                    variantLabel = r.name || r.label || null;
                                    break;
                                }
                            }
                            if (variantLabel) break;
                        }
                        if (variantLabel) break;
                    }
                }

                const mergedState = {
                    ...(oldState || {}),
                    uri: currentUri,
                    historicalUris: [...new Set([...(oldState?.historicalUris || []), currentUri])],
                    segments: finalSegments,
                    currentSegmentUrls,
                    newlyAddedSegmentUrls: new Set(newlyAddedSegmentUrls),
                    isLoading: false,
                    error: null,
                    label: variantLabel, // Store label
                };
                newHlsVariantState.set(variantId, mergedState);
            };

            if (updatedPlaylistId !== 'master') {
                processVariantState(updatedPlaylistId, newManifestObject);
            } else {
                newMediaPlaylists.forEach((playlistData, variantId) => {
                    processVariantState(variantId, playlistData.manifest);
                });
            }

            hlsVariantStateForUpdate = Array.from(newHlsVariantState.entries());
        }

        currentStep = 'ad_resolution';
        const oldAvailsById = new Map((oldAdAvails || []).map((a) => [a.id, a]));
        const potentialNewAvails = [
            ...(newManifestObject.adAvails || []),
            ...mediaPlaylistAdAvails,
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
                    detectionMethod: 'SCTE35_INBAND',
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

        currentStep = 'post_message';
        self.postMessage({
            type: 'livestream:manifest-updated',
            payload: {
                streamId,
                updatedPlaylistId,
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

    } catch (err) {
        // Enhanced error logging to pinpoint the failure
        let details = {};
        if (typeof err === 'object' && err !== null) {
            details = {
                message: err.message,
                stack: err.stack,
                step: currentStep,
                name: err.name
            };
        } else {
            details = {
                message: String(err),
                step: currentStep
            };
        }

        // Use console.error directly to bypass any potential stripping in appLog
        console.error(`[shakaManifestHandler] Analysis failed at step "${currentStep}":`, details);

        // Still send to appLog for UI visibility if possible
        appLog('shakaManifestHandler', 'error', 'Analysis failed during playback update', details);
    }
}

export async function handleShakaManifestFetch(payload, signal) {
    const { streamId, url, auth, isLive, baseUrl, interventionRules, purpose } = payload;
    const startTime = performance.now();

    const response = await fetchWithAuth(
        url,
        auth,
        null,
        {},
        null,
        signal,
        {},
        'GET',
        interventionRules
    );

    const requestHeadersForLogging = {};
    if (auth?.headers) {
        for (const header of auth.headers) {
            if (header.key) requestHeadersForLogging[header.key] = header.value;
        }
    }

    // Only log networking events for explicit analysis or player loads, to reduce noise for background polling?
    // Actually, primary polling is important. Let's keep logging.
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
                contentLength: Number(response.headers['content-length']) || null,
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

    // ARCHITECTURAL FIX: Decouple player fetch from analysis.
    // Only run full analysis logic if this request was explicitly for analysis (the monitor service).
    // If Shaka requested it (playback/buffering), we skip the heavy lift to prevent race conditions or state corruption.
    // We also support 'isPlayerLoadRequest' which is the *first* load, where we DO want to analyze.
    if ((isLive || payload.isPlayerLoadRequest) && purpose === 'analysis') {
        // Use non-blocking call to ensure response returns quickly
        analyzeUpdateAndNotify(payload, newManifestString, responseUri).catch(e => {
            console.error('[shakaManifestHandler] Background analysis failed', e);
        });
    }

    return {
        uri: responseUri,
        originalUri: responseUri,
        data: new TextEncoder().encode(newManifestString).buffer,
        headers: response.headers,
        status: response.status,
    };
}