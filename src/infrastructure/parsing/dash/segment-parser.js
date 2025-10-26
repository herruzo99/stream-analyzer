import { parseDuration } from '@/shared/utils/time';
import {
    getAttr,
    findChildren,
    getInheritedElement,
    resolveBaseUrl,
} from './recursive-parser.js';
import { getDrmSystemName } from '../utils/drm.js';
import { debugLog } from '@/shared/utils/debug';

/**
 * Generates a list of Media Segment objects based on a starting number and count.
 * @returns {object[]} An array of segment objects.
 */
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
    flags
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
            uniqueId: `${resolvedUrl}@t=${time}`, // Ensure unique ID
            template: mediaTemplate, // Store the original template
            time: time,
            duration: segmentDuration,
            timescale,
            startTimeUTC: segAvailabilityStartTime,
            endTimeUTC: segAvailabilityStartTime
                ? segAvailabilityStartTime + segmentDurationSeconds * 1000
                : null,
            encryptionInfo,
            flags,
        });
    }
    return segments;
}

/**
 * Fetches the server time from the UTCTiming element, if available.
 * @param {object} manifestElement The root MPD element.
 * @returns {Promise<number | null>} A promise that resolves to the server time in milliseconds, or null.
 */
async function getUtcTime(manifestElement) {
    const utcTiming = findChildren(manifestElement, 'UTCTiming')[0];
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
 * Parses all segment URLs from a serialized DASH manifest object.
 * This is now an async function to handle fetching server time for live streams.
 * @param {object} manifestElement The serialized <MPD> element.
 * @param {string} manifestUrl The URL from which the MPD was fetched (the initial base URL).
 * @returns {Promise<Record<string, object>>} A map of composite keys (periodId-repId) to their segment lists.
 */
export async function parseAllSegmentUrls(manifestElement, manifestUrl) {
    const segmentsByRep = {};
    const isDynamic = getAttr(manifestElement, 'type') === 'dynamic';
    const availabilityStartTime = new Date(
        getAttr(manifestElement, 'availabilityStartTime') || 0
    ).getTime();
    const serverTime = await getUtcTime(manifestElement);
    const now = serverTime || Date.now();

    const periods = findChildren(manifestElement, 'Period');

    for (const [periodIndex, period] of periods.entries()) {
        const periodId = getAttr(period, 'id');
        const adaptationSets = findChildren(period, 'AdaptationSet');

        for (const adaptationSet of adaptationSets) {
            const representations = findChildren(
                adaptationSet,
                'Representation'
            );
            for (const rep of representations) {
                const repId = getAttr(rep, 'id');
                if (!repId) continue;

                const compositeKey = `${periodId || periodIndex}-${repId}`;
                segmentsByRep[compositeKey] = {
                    initSegment: null,
                    segments: [],
                    segmentsByStrategy: new Map(),
                    diagnostics: {},
                };

                const hierarchy = [rep, adaptationSet, period];
                const baseUrl = resolveBaseUrl(
                    manifestUrl,
                    manifestElement,
                    period,
                    adaptationSet,
                    rep
                );

                const allCpElements = findChildren(
                    adaptationSet,
                    'ContentProtection'
                ).concat(findChildren(rep, 'ContentProtection'));
                const uniqueSystems = new Set();
                if (allCpElements.length > 0) {
                    allCpElements.forEach((cpEl) => {
                        const schemeId = getAttr(cpEl, 'schemeIdUri');
                        if (schemeId) {
                            uniqueSystems.add(getDrmSystemName(schemeId));
                        }
                    });
                }
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
                const segmentList = getInheritedElement(
                    'SegmentList',
                    hierarchy
                );
                const segmentBase = getInheritedElement(
                    'SegmentBase',
                    hierarchy
                );
                const baseURLOnly = findChildren(rep, 'BaseURL')[0];

                // --- INIT SEGMENT ---
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
                        template: initInfo.template, // Store the template
                        range: initInfo.range,
                        encryptionInfo,
                        flags: [],
                    };
                }

                // --- MEDIA SEGMENTS ---
                if (template) {
                    const timescale = Number(
                        getAttr(template, 'timescale') || '1'
                    );
                    const presentationTimeOffset = Number(
                        getAttr(template, 'presentationTimeOffset') || '0'
                    );
                    const mediaTemplate = getAttr(template, 'media');
                    const timeline = findChildren(
                        template,
                        'SegmentTimeline'
                    )[0];
                    const startNumber = Number(
                        getAttr(template, 'startNumber') || '1'
                    );
                    const periodStart =
                        parseDuration(getAttr(period, 'start')) || 0;
                    const availabilityTimeOffset =
                        parseFloat(
                            getAttr(template, 'availabilityTimeOffset')
                        ) || 0;

                    if (mediaTemplate && timeline) {
                        const allTimelineSegments = [];
                        let mediaTime = -1;
                        let currentNumber = startNumber;

                        findChildren(timeline, 'S').forEach((s) => {
                            const t =
                                getAttr(s, 't') !== undefined
                                    ? Number(getAttr(s, 't'))
                                    : -1;
                            const d = Number(getAttr(s, 'd'));
                            const r = Number(getAttr(s, 'r') || '0');

                            if (t >= 0) {
                                mediaTime = t;
                            } else if (mediaTime === -1) {
                                mediaTime = 0;
                            }

                            for (let i = 0; i <= r; i++) {
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
                                const absoluteTime =
                                    periodStart +
                                    mpdStartTimeInTimescale / timescale;
                                const segmentDurationSeconds = d / timescale;

                                const segAvailabilityStartTime =
                                    availabilityStartTime +
                                    (absoluteTime +
                                        segmentDurationSeconds -
                                        availabilityTimeOffset) *
                                        1000;

                                allTimelineSegments.push({
                                    repId,
                                    type: 'Media',
                                    number: currentNumber,
                                    resolvedUrl: resolvedUrl,
                                    uniqueId: `${resolvedUrl}@t=${mediaTime}`, // Ensure unique ID
                                    template: mediaTemplate,
                                    time: mpdStartTimeInTimescale,
                                    duration: d,
                                    timescale,
                                    startTimeUTC: segAvailabilityStartTime,
                                    endTimeUTC:
                                        segAvailabilityStartTime +
                                        segmentDurationSeconds * 1000,
                                    encryptionInfo,
                                    flags,
                                });
                                mediaTime += d;
                                currentNumber++;
                            }
                        });

                        if (isDynamic) {
                            const timeShiftBufferDepth =
                                parseDuration(
                                    getAttr(
                                        manifestElement,
                                        'timeShiftBufferDepth'
                                    )
                                ) || 0;
                            const liveEdge =
                                (now - availabilityStartTime) / 1000;
                            const windowStart = liveEdge - timeShiftBufferDepth;

                            segmentsByRep[compositeKey].segments =
                                allTimelineSegments.filter((seg) => {
                                    const segAbsoluteTime =
                                        periodStart + seg.time / seg.timescale;
                                    return (
                                        segAbsoluteTime >= windowStart &&
                                        segAbsoluteTime <= liveEdge
                                    );
                                });
                        } else {
                            segmentsByRep[compositeKey].segments =
                                allTimelineSegments;
                        }
                    } else if (mediaTemplate && getAttr(template, 'duration')) {
                        const segmentDuration = Number(
                            getAttr(template, 'duration')
                        );
                        if (isDynamic) {
                            const timeShiftBufferDepth = parseDuration(
                                getAttr(manifestElement, 'timeShiftBufferDepth')
                            );
                            const bufferSegments = timeShiftBufferDepth
                                ? Math.ceil(
                                      timeShiftBufferDepth /
                                          (segmentDuration / timescale)
                                  )
                                : 30;

                            const liveEdgeTime =
                                (now - availabilityStartTime) / 1000 -
                                periodStart;
                            const lastSegNum =
                                Math.floor(
                                    liveEdgeTime / (segmentDuration / timescale)
                                ) + startNumber;

                            segmentsByRep[compositeKey].diagnostics[
                                'Live Segment Calculation'
                            ] = { latestSegmentNum: lastSegNum };

                            const segments = generateSegments(
                                repId,
                                baseUrl,
                                mediaTemplate,
                                startNumber,
                                Math.max(
                                    startNumber,
                                    lastSegNum - bufferSegments + 1
                                ),
                                bufferSegments,
                                segmentDuration,
                                timescale,
                                periodStart,
                                availabilityStartTime,
                                availabilityTimeOffset,
                                encryptionInfo,
                                flags
                            );
                            segmentsByRep[compositeKey].segments = segments;
                        } else {
                            const periodDuration = parseDuration(
                                getAttr(period, 'duration')
                            );
                            let numSegments = 0;
                            const templateDuration = Number(
                                getAttr(template, 'duration')
                            );

                            if (periodDuration && templateDuration > 0) {
                                numSegments = Math.ceil(
                                    (periodDuration * timescale) /
                                        templateDuration
                                );
                            } else {
                                const mpdDuration = parseDuration(
                                    getAttr(
                                        manifestElement,
                                        'mediaPresentationDuration'
                                    )
                                );
                                if (mpdDuration && templateDuration > 0) {
                                    numSegments = Math.ceil(
                                        (mpdDuration * timescale) /
                                            templateDuration
                                    );
                                }
                            }

                            const segments = generateSegments(
                                repId,
                                baseUrl,
                                mediaTemplate,
                                startNumber,
                                startNumber,
                                numSegments,
                                templateDuration, // Use template duration in timescale
                                timescale,
                                periodStart,
                                availabilityStartTime,
                                availabilityTimeOffset,
                                encryptionInfo,
                                flags
                            );
                            segmentsByRep[compositeKey].segments = segments;
                        }
                    }
                } else if (segmentBase) {
                    const timescale = Number(
                        getAttr(segmentBase, 'timescale') || '1'
                    );
                    const mpdDurationSeconds =
                        parseDuration(
                            getAttr(
                                manifestElement,
                                'mediaPresentationDuration'
                            )
                        ) || 0;

                    const mediaSegment = {
                        repId,
                        type: 'Media',
                        number: 1,
                        resolvedUrl: baseUrl,
                        uniqueId: baseUrl, // It's a single file
                        template: new URL(baseUrl).pathname.split('/').pop(),
                        time: 0,
                        duration: mpdDurationSeconds * timescale,
                        timescale,
                        encryptionInfo,
                        flags,
                    };
                    segmentsByRep[compositeKey].segments.push(mediaSegment);
                } else if (baseURLOnly) {
                    const urlContent = baseURLOnly['#text'] || '';
                    const resolvedUrl = new URL(urlContent, baseUrl).href;
                    const timescale = 1; // Default for text tracks
                    const mpdDurationSeconds =
                        parseDuration(
                            getAttr(
                                manifestElement,
                                'mediaPresentationDuration'
                            )
                        ) || 0;

                    const mediaSegment = {
                        repId,
                        type: 'Media',
                        number: 1,
                        resolvedUrl: resolvedUrl,
                        uniqueId: resolvedUrl,
                        template: urlContent,
                        time: 0,
                        duration: mpdDurationSeconds * timescale,
                        timescale,
                        encryptionInfo,
                        flags,
                    };
                    segmentsByRep[compositeKey].segments.push(mediaSegment);
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
        const urlWithSub = initializationTemplate.replace(
            /\$RepresentationID\$/g,
            representation.id
        );
        const result = {
            url: new URL(urlWithSub, baseUrl).href,
            range: null,
            template: initializationTemplate,
        };
        debugLog(
            'findInitSegmentUrl',
            'Found via SegmentTemplate@initialization',
            result
        );
        return result;
    }

    const list = getInheritedElement('SegmentList', hierarchy);
    const base = getInheritedElement('SegmentBase', hierarchy);

    const initContainer = list || base;
    const initialization = initContainer
        ? findChildren(initContainer, 'Initialization')[0]
        : null;

    if (initialization && getAttr(initialization, 'sourceURL')) {
        const urlTemplate = getAttr(initialization, 'sourceURL');
        const urlWithSub = urlTemplate.replace(
            /\$RepresentationID\$/g,
            representation.id
        );
        const result = {
            url: new URL(urlWithSub, baseUrl).href,
            range: null,
            template: urlTemplate,
        };
        debugLog(
            'findInitSegmentUrl',
            'Found via Initialization@sourceURL',
            result
        );
        return result;
    }

    if (initialization && getAttr(initialization, 'range')) {
        const result = {
            url: baseUrl, // Range applies to the base URL of the representation context
            range: getAttr(initialization, 'range'),
            template: new URL(baseUrl).pathname.split('/').pop(),
        };
        debugLog(
            'findInitSegmentUrl',
            'Found via Initialization@range',
            result
        );
        return result;
    }

    debugLog('findInitSegmentUrl', 'No init segment information found.');
    return null;
}
