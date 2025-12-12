import { appLog } from '@/shared/utils/debug';
import { parseDuration } from '@/shared/utils/time';
import { fetchWithAuth } from '../../worker/http.js';
import { parseISOBMFF } from '../isobmff/parser.js';
import { findBoxRecursive } from '../isobmff/utils.js';
import { getDrmSystemName } from '../utils/drm.js';
import {
    getAttr,
    getInheritedElement,
    resolveBaseUrl,
} from '../utils/recursive-parser.js';

// --- Module-Level Cache ---
// Persists across worker message events to prevent re-fetching immutable index ranges
const sidxDataCache = new Map(); // Key: "url|range", Value: { sidxBox, timestamp }
const CACHE_TTL_MS = 60000 * 5; // 5 minutes

// Configuration for segment generation window
const LIVE_WINDOW_SEGMENTS = 20; // Number of segments to show for dynamic streams (sliding window)
const VOD_MAX_SEGMENTS = 300; // Cap for VOD to prevent memory exhaustion on huge lists

/**
 * Creates a single MediaSegment object from a URL using template information.
 */
export function createSegmentFromTemplateUrl(url, context) {
    const {
        repId,
        mediaTemplate,
        startNumber,
        timescale,
        segmentDuration,
        encryptionInfo,
        flags,
        periodStart,
    } = context;

    const numberMatch =
        mediaTemplate.match(/\$Number(%0(\d+)d)?\$/) ||
        mediaTemplate.match(/\$Number\$/);
    if (!numberMatch) return null;

    const regexStr = mediaTemplate
        .replace(/\$RepresentationID\$/g, repId)
        .replace(numberMatch[0], '(\\d+)');
    const urlMatch = new URL(url).pathname.match(new RegExp(regexStr));
    if (!urlMatch || !urlMatch[1]) return null;

    const segmentNumber = parseInt(urlMatch[1], 10);
    const time = (segmentNumber - startNumber) * segmentDuration;

    return {
        repId,
        type: 'Media',
        number: segmentNumber,
        resolvedUrl: url,
        uniqueId: url,
        template: mediaTemplate,
        time: time,
        periodStart: periodStart,
        duration: segmentDuration,
        timescale,
        presentationTimeOffset: context.presentationTimeOffset || 0, // Store PTO
        encryptionInfo,
        flags,
        gap: false,
    };
}

function generateSegments(
    repId,
    baseUrl,
    mediaTemplate,
    startNumber,
    firstSegmentNumber,
    numSegments,
    segmentDuration,
    timescale,
    periodStart,
    availabilityStartTime,
    availabilityTimeOffset,
    encryptionInfo,
    flags,
    presentationTimeOffset = 0 // Default to 0
) {
    const segments = [];
    for (let i = 0; i < numSegments; i++) {
        const segmentNumber = firstSegmentNumber + i;
        const time = (segmentNumber - startNumber) * segmentDuration;
        const startTimeSeconds = periodStart + time / timescale;
        const segmentDurationSeconds = segmentDuration / timescale;
        const segAvailabilityStartTime =
            availabilityStartTime +
            (startTimeSeconds +
                segmentDurationSeconds -
                availabilityTimeOffset) *
                1000;

        const url = mediaTemplate
            .replace(/\$RepresentationID\$/g, repId)
            .replace(/\$Number(%0\d+d)?\$/g, (m, p) =>
                String(segmentNumber).padStart(
                    p ? parseInt(p.substring(2, p.length - 1)) : 1,
                    '0'
                )
            );
        const resolvedUrl = new URL(url, baseUrl).href;
        segments.push({
            repId,
            type: 'Media',
            number: segmentNumber,
            resolvedUrl: resolvedUrl,
            uniqueId: resolvedUrl,
            template: mediaTemplate,
            time: time,
            periodStart: periodStart,
            duration: segmentDuration,
            timescale,
            presentationTimeOffset, // Store PTO
            startTimeUTC: segAvailabilityStartTime,
            endTimeUTC:
                segAvailabilityStartTime + segmentDurationSeconds * 1000,
            encryptionInfo,
            flags,
            gap: false,
        });
    }
    return segments;
}

async function getUtcTime(manifestElement) {
    const utcTiming =
        manifestElement.UTCTiming ||
        (manifestElement.children &&
            manifestElement.children.find((c) => c.tagName === 'UTCTiming'));

    if (
        utcTiming &&
        getAttr(utcTiming, 'schemeIdUri') ===
            'urn:mpeg:dash:utc:http-xsdate:2014'
    ) {
        try {
            const response = await fetch(getAttr(utcTiming, 'value'));
            if (response.ok) {
                const text = await response.text();
                return new Date(text).getTime();
            }
        } catch (e) {
            console.error('Failed to fetch UTCTiming source:', e);
        }
    }
    return null;
}

/**
 * Fetches and parses SIDX, using cache to avoid network redundant hits.
 */
async function fetchSidx(baseUrl, auth, indexRange, context) {
    const cacheKey = `${baseUrl}|${indexRange}`;
    const cached = sidxDataCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.sidxBox;
    }

    try {
        const [indexRangeStartStr] = indexRange.split('-');
        const sidxStartOffset = parseInt(indexRangeStartStr, 10);

        const sidxResponse = await fetchWithAuth(
            baseUrl,
            auth,
            String(indexRange)
        );

        if (sidxResponse.ok) {
            const sidxBuffer = await sidxResponse.arrayBuffer();
            const parsedSidx = parseISOBMFF(sidxBuffer, sidxStartOffset);

            if (context.onSegmentFetched) {
                const indexUniqueId = `${baseUrl}@media@${indexRange}`;
                context.onSegmentFetched({
                    uniqueId: indexUniqueId,
                    data: sidxBuffer,
                    parsedData: parsedSidx,
                    status: 200,
                });
            }

            const sidxBox = findBoxRecursive(
                parsedSidx.data.boxes,
                (b) => b.type === 'sidx'
            );

            if (sidxBox) {
                sidxDataCache.set(cacheKey, {
                    sidxBox,
                    timestamp: Date.now(),
                });
                return sidxBox;
            }
        }
    } catch (e) {
        appLog('SegmentParser', 'warn', 'SIDX fetch/parse failed', e);
    }
    return null;
}

export async function parseAllSegmentUrls(
    manifestElement,
    manifestUrl,
    context = {}
) {
    const segmentsByRep = {};
    const availabilityStartTime = new Date(
        getAttr(manifestElement, 'availabilityStartTime') || 0
    ).getTime();
    const serverTime = await getUtcTime(manifestElement);
    const now = context.now || serverTime || Date.now();
    const isDynamic = getAttr(manifestElement, 'type') === 'dynamic';

    // Calculate MPD-level duration once (used for fallback)
    const mpdDurationSeconds =
        parseDuration(getAttr(manifestElement, 'mediaPresentationDuration')) ||
        0;

    const periods =
        manifestElement.Period && Array.isArray(manifestElement.Period)
            ? manifestElement.Period
            : [manifestElement.Period];

    let cumulativePeriodStart = 0;

    for (const [periodIndex, period] of periods.entries()) {
        if (!period) continue;

        const periodId = getAttr(period, 'id');
        let periodStart = parseDuration(getAttr(period, 'start'));
        const periodDuration = parseDuration(getAttr(period, 'duration'));

        if (periodStart === null) {
            periodStart = cumulativePeriodStart;
        }
        if (periodDuration !== null) {
            cumulativePeriodStart = periodStart + periodDuration;
        }

        // Determine effective duration for single-segment items
        // Prefer Period duration, fallback to MPD duration
        const effectiveSingleSegmentDuration =
            periodDuration !== null ? periodDuration : mpdDurationSeconds;

        const adaptationSets =
            period.AdaptationSet && Array.isArray(period.AdaptationSet)
                ? period.AdaptationSet
                : period.AdaptationSet
                  ? [period.AdaptationSet]
                  : [];

        for (const adaptationSet of adaptationSets) {
            const representations =
                adaptationSet.Representation &&
                Array.isArray(adaptationSet.Representation)
                    ? adaptationSet.Representation
                    : adaptationSet.Representation
                      ? [adaptationSet.Representation]
                      : [];

            for (const rep of representations) {
                const repId = getAttr(rep, 'id');
                if (!repId) continue;

                const compositeKey = `${periodId || periodIndex}-${repId}`;
                segmentsByRep[compositeKey] = {
                    initSegment: null,
                    segments: [],
                    segmentsByStrategy: new Map(),
                    diagnostics: {},
                    liveEdgeTime: null,
                };

                const hierarchy = [rep, adaptationSet, period];
                const baseUrl = resolveBaseUrl(
                    manifestUrl,
                    manifestElement,
                    period,
                    adaptationSet,
                    rep
                );

                const allCpElements = [
                    ...(adaptationSet.ContentProtection || []),
                    ...(rep.ContentProtection || []),
                ];
                if (
                    adaptationSet.ContentProtection &&
                    !Array.isArray(adaptationSet.ContentProtection)
                ) {
                    allCpElements.push(adaptationSet.ContentProtection);
                }
                if (
                    rep.ContentProtection &&
                    !Array.isArray(rep.ContentProtection)
                ) {
                    allCpElements.push(rep.ContentProtection);
                }

                const uniqueSystems = new Set();
                allCpElements.forEach((cpEl) => {
                    const schemeId = getAttr(cpEl, 'schemeIdUri');
                    if (schemeId) {
                        uniqueSystems.add(getDrmSystemName(schemeId));
                    }
                });

                const encryptionInfo =
                    uniqueSystems.size > 0
                        ? {
                              method: 'CENC',
                              systems: Array.from(uniqueSystems),
                          }
                        : null;

                const flags = [];
                const sapType = getAttr(rep, 'startWithSAP');
                if (sapType) {
                    flags.push(`sap-type-${sapType}`);
                }

                const template = getInheritedElement(
                    'SegmentTemplate',
                    hierarchy
                );
                const segmentBase = getInheritedElement(
                    'SegmentBase',
                    hierarchy
                );
                const baseURLOnly =
                    rep.BaseURL || adaptationSet.BaseURL || period.BaseURL;

                const initInfo = findInitSegmentUrl(
                    { id: repId, serializedManifest: rep },
                    { serializedManifest: adaptationSet },
                    { serializedManifest: period },
                    baseUrl
                );

                if (initInfo) {
                    const uniqueId = initInfo.range
                        ? `${initInfo.url}@init@${initInfo.range}`
                        : initInfo.url;

                    segmentsByRep[compositeKey].initSegment = {
                        repId,
                        type: 'Init',
                        number: 0,
                        resolvedUrl: initInfo.url,
                        uniqueId: uniqueId,
                        template: initInfo.template,
                        range: initInfo.range,
                        encryptionInfo,
                        flags: [],
                        gap: false,
                    };
                }

                if (template) {
                    const timescale = Number(
                        getAttr(template, 'timescale') || '1'
                    );
                    const presentationTimeOffset = Number(
                        getAttr(template, 'presentationTimeOffset') || '0'
                    );
                    const mediaTemplate = getAttr(template, 'media');
                    const timeline = template.SegmentTimeline;
                    const startNumber = Number(
                        getAttr(template, 'startNumber') || '1'
                    );
                    const availabilityTimeOffset =
                        parseFloat(
                            getAttr(template, 'availabilityTimeOffset')
                        ) || 0;

                    if (mediaTemplate && timeline) {
                        // FIX: Explicitly handle potential non-array single element or missing S
                        const sElements = timeline.S
                            ? Array.isArray(timeline.S)
                                ? timeline.S
                                : [timeline.S]
                            : [];

                        const allTimelineSegments = [];
                        let mediaTime = -1;
                        let currentNumber = startNumber;

                        sElements.forEach((s) => {
                            const tAttr = getAttr(s, 't');
                            if (tAttr !== undefined) {
                                mediaTime = Number(tAttr);
                            } else if (mediaTime === -1) {
                                mediaTime = 0;
                            }

                            const d = Number(getAttr(s, 'd'));
                            const r = Number(getAttr(s, 'r') || '0');
                            const repeatCount = r < 0 ? 0 : r;

                            // Safety check for invalid duration or time
                            if (isNaN(d) || isNaN(mediaTime)) {
                                return; // Skip invalid entries
                            }

                            for (let i = 0; i <= repeatCount; i++) {
                                const url = mediaTemplate
                                    .replace(/\$RepresentationID\$/g, repId)
                                    .replace(/\$Time\$/g, String(mediaTime))
                                    .replace(
                                        /\$Bandwidth\$/g,
                                        getAttr(rep, 'bandwidth')
                                    )
                                    .replace(/\$Number(%0\d+d)?\$/g, (m, p) =>
                                        String(currentNumber).padStart(
                                            p
                                                ? parseInt(
                                                      p.substring(
                                                          2,
                                                          p.length - 1
                                                      )
                                                  )
                                                : 1,
                                            '0'
                                        )
                                    );
                                const resolvedUrl = new URL(url, baseUrl).href;

                                const mpdStartTimeInTimescale =
                                    mediaTime - presentationTimeOffset;
                                const segmentDurationSeconds = d / timescale;
                                const segAvailabilityStartTime =
                                    availabilityStartTime +
                                    (periodStart +
                                        mpdStartTimeInTimescale / timescale +
                                        segmentDurationSeconds -
                                        availabilityTimeOffset) *
                                        1000;

                                allTimelineSegments.push({
                                    repId,
                                    type: 'Media',
                                    number: currentNumber,
                                    resolvedUrl: resolvedUrl,
                                    uniqueId: resolvedUrl,
                                    template: mediaTemplate,
                                    time: mpdStartTimeInTimescale,
                                    periodStart: periodStart,
                                    duration: d,
                                    timescale,
                                    presentationTimeOffset, // Store PTO
                                    startTimeUTC: segAvailabilityStartTime,
                                    endTimeUTC:
                                        segAvailabilityStartTime +
                                        segmentDurationSeconds * 1000,
                                    encryptionInfo,
                                    flags,
                                    gap: false,
                                });
                                mediaTime += d;
                                currentNumber++;
                            }
                        });
                        segmentsByRep[compositeKey].segments =
                            allTimelineSegments;

                        // Set live edge if dynamic
                        if (isDynamic && allTimelineSegments.length > 0) {
                            segmentsByRep[compositeKey].liveEdgeTime =
                                allTimelineSegments[
                                    allTimelineSegments.length - 1
                                ].startTimeUTC / 1000;
                        }
                    } else if (mediaTemplate && getAttr(template, 'duration')) {
                        // --- ARCHITECTURAL FIX: Correct Calculation for Dynamic SegmentTemplate ---
                        const segmentDuration = Number(
                            getAttr(template, 'duration')
                        );
                        const durationSec = segmentDuration / timescale;
                        let firstSegmentNumber = startNumber;
                        let numSegments = 10;

                        if (isDynamic) {
                            // Calculate current Live Edge Index
                            // Time since AST (in seconds)
                            const timeSinceAst =
                                (now - availabilityStartTime) / 1000;

                            // Subtract period start offset
                            const timeInPeriod = timeSinceAst - periodStart;

                            // Calculate total segments elapsed
                            // Floor to get the index of the segment currently being played/live
                            const liveIndex =
                                Math.floor(timeInPeriod / durationSec) +
                                startNumber;

                            // Generate a sliding window (e.g. last 20 segments)
                            firstSegmentNumber = Math.max(
                                startNumber,
                                liveIndex - LIVE_WINDOW_SEGMENTS
                            );
                            numSegments = LIVE_WINDOW_SEGMENTS + 2; // Add buffer for edge variance

                            // Store live edge time for synchronization
                            segmentsByRep[compositeKey].liveEdgeTime =
                                timeSinceAst;
                        } else if (periodDuration !== null) {
                            // VOD with known duration
                            numSegments = Math.ceil(
                                periodDuration / durationSec
                            );
                            numSegments = Math.min(
                                numSegments,
                                VOD_MAX_SEGMENTS
                            );
                        }

                        segmentsByRep[compositeKey].segments = generateSegments(
                            repId,
                            baseUrl,
                            mediaTemplate,
                            startNumber,
                            firstSegmentNumber,
                            numSegments,
                            segmentDuration,
                            timescale,
                            periodStart,
                            availabilityStartTime,
                            availabilityTimeOffset,
                            encryptionInfo,
                            flags,
                            presentationTimeOffset // Pass PTO
                        );
                    }
                } else if (segmentBase) {
                    const indexRange = getAttr(segmentBase, 'indexRange');
                    let sidxFound = false;

                    if (indexRange) {
                        const sidxBox = await fetchSidx(
                            baseUrl,
                            context.auth,
                            indexRange,
                            context
                        );

                        if (sidxBox) {
                            const sidxTimescale =
                                sidxBox.details.timescale.value;
                            const firstOffset = Number(
                                sidxBox.details.first_offset.value
                            );
                            let currentOffset =
                                sidxBox.offset + sidxBox.size + firstOffset;
                            let currentTime = Number(
                                sidxBox.details.earliest_presentation_time.value
                            );
                            let currentNumber = 1;

                            for (const entry of sidxBox.entries) {
                                const range = `${currentOffset}-${
                                    currentOffset + entry.size - 1
                                }`;
                                const uniqueId = `${baseUrl}@media@${range}`;

                                segmentsByRep[compositeKey].segments.push({
                                    repId,
                                    type: 'Media',
                                    number: currentNumber++,
                                    resolvedUrl: baseUrl,
                                    uniqueId: uniqueId,
                                    range: range,
                                    time: currentTime,
                                    periodStart: periodStart,
                                    duration: entry.duration,
                                    timescale: sidxTimescale,
                                    encryptionInfo,
                                    flags,
                                    gap: false,
                                    // Enrich with SIDX details
                                    sidx: {
                                        referencedSize: entry.size,
                                        subsegmentDuration: entry.duration,
                                        startsWithSap: entry.startsWithSap,
                                        sapType: entry.sapType,
                                        sapDeltaTime: entry.sapDeltaTime,
                                        referenceType: entry.type,
                                        fullBox: sidxBox,
                                        // CRITICAL: Attach unique ID for the index itself so UI can inspect it
                                        sidxUniqueId: `${baseUrl}@media@${indexRange}`,
                                    },
                                });

                                currentTime += entry.duration;
                                currentOffset += entry.size;
                            }
                            sidxFound = true;
                        }
                    }

                    if (
                        !sidxFound &&
                        segmentsByRep[compositeKey].segments.length === 0
                    ) {
                        const timescale = Number(
                            getAttr(segmentBase, 'timescale') || '1'
                        );
                        // Fix: use pre-calculated MPD duration
                        const mediaSegment = {
                            repId,
                            type: 'Media',
                            number: 1,
                            resolvedUrl: baseUrl,
                            uniqueId: baseUrl,
                            template: new URL(baseUrl).pathname
                                .split('/')
                                .pop(),
                            time: 0,
                            periodStart: periodStart,
                            duration:
                                effectiveSingleSegmentDuration * timescale,
                            timescale,
                            encryptionInfo,
                            flags,
                            gap: false,
                            indexRange: null,
                        };
                        segmentsByRep[compositeKey].segments.push(mediaSegment);
                    }
                } else if (baseURLOnly) {
                    const urlContent =
                        (Array.isArray(baseURLOnly)
                            ? baseURLOnly[0]
                            : baseURLOnly)['#text'] || '';
                    if (
                        urlContent &&
                        segmentsByRep[compositeKey].segments.length === 0
                    ) {
                        const resolvedUrl = new URL(urlContent, baseUrl).href;
                        // ARCHITECTURAL FIX: Use effective duration for single-file segments (e.g. VTT sidecars)
                        const timescale = 1;
                        const mediaSegment = {
                            repId,
                            type: 'Media',
                            number: 1,
                            resolvedUrl: resolvedUrl,
                            uniqueId: resolvedUrl,
                            template: urlContent,
                            time: 0,
                            periodStart: periodStart,
                            duration:
                                effectiveSingleSegmentDuration * timescale,
                            timescale: timescale,
                            encryptionInfo,
                            flags,
                            gap: false,
                        };
                        segmentsByRep[compositeKey].segments.push(mediaSegment);
                    }
                }
            }
        }
    }
    return segmentsByRep;
}

export function findInitSegmentUrl(
    representation,
    adaptationSet,
    period,
    baseUrl
) {
    const repElement = representation.serializedManifest;
    if (!repElement) return null;

    const hierarchy = [
        repElement,
        adaptationSet.serializedManifest,
        period.serializedManifest,
    ];

    const template = getInheritedElement('SegmentTemplate', hierarchy);
    const initializationTemplate = getAttr(template, 'initialization');

    if (initializationTemplate) {
        const urlWithSub = initializationTemplate
            .replace(/\$RepresentationID\$/g, representation.id)
            .replace(/\$Bandwidth\$/g, getAttr(repElement, 'bandwidth'));
        const result = {
            url: new URL(urlWithSub, baseUrl).href,
            range: null,
            template: initializationTemplate,
        };
        return result;
    }

    const list = getInheritedElement('SegmentList', hierarchy);
    const base = getInheritedElement('SegmentBase', hierarchy);
    const initContainer = list || base;
    const initialization = initContainer
        ? Array.isArray(initContainer.Initialization)
            ? initContainer.Initialization[0]
            : initContainer.Initialization
        : null;

    let urlTemplate = null;
    let initRange = null;

    if (initialization) {
        urlTemplate = getAttr(initialization, 'sourceURL');
        initRange = getAttr(initialization, 'range');
    }

    if (urlTemplate) {
        const urlWithSub = urlTemplate
            .replace(/\$RepresentationID\$/g, representation.id)
            .replace(/\$Bandwidth\$/g, getAttr(repElement, 'bandwidth'));
        return {
            url: new URL(urlWithSub, baseUrl).href,
            range: initRange,
            template: urlTemplate,
        };
    }

    if (initRange) {
        return {
            url: baseUrl,
            range: initRange,
            template: new URL(baseUrl).pathname.split('/').pop(),
        };
    }

    return null;
}
