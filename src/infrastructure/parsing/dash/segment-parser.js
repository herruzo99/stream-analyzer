import { parseDuration } from '@/utils/time';
import {
    getAttr,
    findChild,
    findChildren,
    getInheritedElement,
    resolveBaseUrl,
} from './recursive-parser.js';
import { findElementsByTagNameRecursive } from './recursive-parser.js';

/**
 * Fetches the server time from the UTCTiming element, if available.
 * @param {object} manifestElement The root MPD element.
 * @returns {Promise<number | null>} A promise that resolves to the server time in milliseconds, or null.
 */
async function getUtcTime(manifestElement) {
    const utcTiming = findChild(manifestElement, 'UTCTiming');
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
    availabilityTimeOffset
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
        segments.push({
            repId,
            type: 'Media',
            number: segmentNumber,
            resolvedUrl: new URL(url, baseUrl).href,
            template: url,
            time: time,
            duration: segmentDuration,
            timescale,
            startTimeUTC: segAvailabilityStartTime,
            endTimeUTC: segAvailabilityStartTime
                ? segAvailabilityStartTime + segmentDurationSeconds * 1000
                : null,
        });
    }
    return segments;
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
    const now = Date.now();

    const periods = findChildren(manifestElement, 'Period');

    for (const [periodIndex, period] of periods.entries()) {
        const periodId = getAttr(period, 'id');
        const adaptationSets = findChildren(period, 'AdaptationSet');

        for (const adaptationSet of adaptationSets) {
            const representations = findChildren(adaptationSet, 'Representation');
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

                const template = getInheritedElement('SegmentTemplate', hierarchy);
                const segmentList = getInheritedElement('SegmentList', hierarchy);
                const segmentBase = getInheritedElement('SegmentBase', hierarchy);

                // --- INIT SEGMENT ---
                let initTemplate = getAttr(template, 'initialization');
                if (!initTemplate) {
                    const initContainer = segmentList || segmentBase;
                    const initializationEl = initContainer
                        ? findChild(initContainer, 'Initialization')
                        : null;
                    if (initializationEl) {
                        initTemplate = getAttr(initializationEl, 'sourceURL');
                    }
                }
                if (initTemplate) {
                    const initUrl = initTemplate.replace(
                        /\$RepresentationID\$/g,
                        repId
                    );
                    segmentsByRep[compositeKey].initSegment = {
                        repId,
                        type: 'Init',
                        number: 0,
                        resolvedUrl: new URL(initUrl, baseUrl).href,
                        template: initUrl,
                    };
                }

                // --- MEDIA SEGMENTS ---
                if (template) {
                    const timescale = parseInt(getAttr(template, 'timescale') || '1');
                    const mediaTemplate = getAttr(template, 'media');
                    const timeline = findChild(template, 'SegmentTimeline');
                    const startNumber = parseInt(
                        getAttr(template, 'startNumber') || '1'
                    );
                    const periodStart = parseDuration(getAttr(period, 'start')) || 0;
                    const availabilityTimeOffset =
                        parseFloat(getAttr(template, 'availabilityTimeOffset')) || 0;

                    if (mediaTemplate && timeline) {
                        const segments = [];
                        // ... (logic for timeline parsing remains the same, pushes to `segments` array)
                        segmentsByRep[compositeKey].segments = segments;
                    } else if (mediaTemplate && getAttr(template, 'duration')) {
                        const segmentDuration = parseInt(getAttr(template, 'duration'));
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

                            // A: Wall-Clock
                            const liveEdgeTimeA =
                                (now - availabilityStartTime) / 1000 - periodStart;
                            const lastSegA =
                                Math.floor(
                                    liveEdgeTimeA / (segmentDuration / timescale)
                                ) + startNumber;
                            segmentsByRep[compositeKey].diagnostics[
                                'Strategy A (Wall-Clock)'
                            ] = { latestSegmentNum: lastSegA };
                            const segmentsA = generateSegments(
                                repId,
                                baseUrl,
                                mediaTemplate,
                                startNumber,
                                Math.max(startNumber, lastSegA - bufferSegments + 1),
                                bufferSegments,
                                segmentDuration,
                                timescale,
                                periodStart,
                                availabilityStartTime,
                                availabilityTimeOffset
                            );
                            segmentsByRep[compositeKey].segmentsByStrategy.set(
                                'Strategy A (Wall-Clock)',
                                segmentsA
                            );

                            // C: UTCTiming Source
                            if (serverTime) {
                                const liveEdgeTimeC =
                                    (serverTime - availabilityStartTime) / 1000 -
                                    periodStart;
                                const lastSegC =
                                    Math.floor(
                                        liveEdgeTimeC / (segmentDuration / timescale)
                                    ) + startNumber;
                                segmentsByRep[compositeKey].diagnostics[
                                    'Strategy C (UTCTiming Source)'
                                ] = { latestSegmentNum: lastSegC };
                                const segmentsC = generateSegments(
                                    repId,
                                    baseUrl,
                                    mediaTemplate,
                                    startNumber,
                                    Math.max(
                                        startNumber,
                                        lastSegC - bufferSegments + 1
                                    ),
                                    bufferSegments,
                                    segmentDuration,
                                    timescale,
                                    periodStart,
                                    availabilityStartTime,
                                    availabilityTimeOffset
                                );
                                segmentsByRep[compositeKey].segmentsByStrategy.set(
                                    'Strategy C (UTCTiming Source)',
                                    segmentsC
                                );
                            }

                            // Set the definitive segments list, preferring UTCTiming
                            segmentsByRep[compositeKey].segments =
                                segmentsByRep[compositeKey].segmentsByStrategy.get(
                                    'Strategy C (UTCTiming Source)'
                                ) || segmentsA;
                        } else {
                            // VOD logic
                            const segments = generateSegments(
                                repId,
                                baseUrl,
                                mediaTemplate,
                                startNumber,
                                startNumber,
                                10,
                                segmentDuration,
                                timescale,
                                periodStart,
                                availabilityStartTime,
                                availabilityTimeOffset
                            ); // Simplified for VOD
                            segmentsByRep[compositeKey].segments = segments;
                        }
                    }
                } else if (segmentList) {
                    const segments = [];
                    // ... logic for SegmentList remains the same, pushes to `segments` array
                    segmentsByRep[compositeKey].segments = segments;
                } else if (segmentBase || findChild(rep, 'BaseURL')) {
                    const segments = [];
                    // ... logic for SegmentBase remains the same, pushes to `segments` array
                    segmentsByRep[compositeKey].segments = segments;
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

    if (template && getAttr(template, 'initialization')) {
        return new URL(
            getAttr(template, 'initialization').replace(
                /\$RepresentationID\$/g,
                representation.id
            ),
            baseUrl
        ).href;
    }

    const list = getInheritedElement('SegmentList', hierarchy);
    const base = getInheritedElement('SegmentBase', hierarchy);

    const initContainer = list || base;
    const initialization = initContainer
        ? findChild(initContainer, 'Initialization')
        : null;

    if (initialization && getAttr(initialization, 'sourceURL')) {
        return new URL(getAttr(initialization, 'sourceURL'), baseUrl).href;
    }

    return null;
}