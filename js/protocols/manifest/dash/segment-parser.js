import { parseDuration } from '../../../shared/utils/time.js';
import {
    getAttr,
    findChild,
    findChildren,
    getInheritedElement,
    resolveBaseUrl,
} from './recursive-parser.js';
import { findElementsByTagNameRecursive } from './recursive-parser.js';

/**
 * Parses all segment URLs from a serialized DASH manifest object.
 * @param {object} manifestElement The serialized <MPD> element.
 * @param {string} manifestUrl The URL from which the MPD was fetched (the initial base URL).
 * @returns {Record<string, object[]>} A map of composite keys (periodId-repId) to their segment lists.
 */
export function parseAllSegmentUrls(manifestElement, manifestUrl) {
    /** @type {Record<string, object[]>} */
    const segmentsByRep = {};
    const isDynamic = getAttr(manifestElement, 'type') === 'dynamic';
    const availabilityStartTime = isDynamic
        ? new Date(getAttr(manifestElement, 'availabilityStartTime')).getTime()
        : 0;

    const allRepsWithContext = findElementsByTagNameRecursive(
        manifestElement,
        'Representation'
    );

    allRepsWithContext.forEach(({ element: rep, context }) => {
        const repId = getAttr(rep, 'id');
        if (!repId) return;

        const { period, adaptationSet } = context;
        if (!period || !adaptationSet) return;

        const periodId = getAttr(period, 'id');
        if (!periodId) {
            console.warn(
                'Skipping Representation in Period without an ID.',
                rep
            );
            return;
        }

        const compositeKey = `${periodId}-${repId}`;
        segmentsByRep[compositeKey] = [];

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
            segmentsByRep[compositeKey].push({
                repId,
                type: 'Init',
                number: 0,
                resolvedUrl: new URL(initUrl, baseUrl).href,
                template: initUrl,
                time: -1,
                duration: 0,
                timescale: parseInt(
                    getAttr(template || segmentList, 'timescale') || '1'
                ),
            });
        }

        if (template) {
            const timescale = parseInt(getAttr(template, 'timescale') || '1');
            const mediaTemplate = getAttr(template, 'media');
            const timeline = findChild(template, 'SegmentTimeline');
            const startNumber = parseInt(
                getAttr(template, 'startNumber') || '1'
            );
            const periodStart = parseDuration(getAttr(period, 'start')) || 0;

            if (mediaTemplate && timeline) {
                let segmentNumber = startNumber;
                let currentTime = 0;
                findChildren(timeline, 'S').forEach((sNode) => {
                    const t = getAttr(sNode, 't')
                        ? parseInt(getAttr(sNode, 't'))
                        : currentTime;
                    const d = parseInt(getAttr(sNode, 'd'));
                    const r = parseInt(getAttr(sNode, 'r') || '0');
                    currentTime = t;

                    for (let i = 0; i <= r; i++) {
                        const segTime = currentTime;
                        const startTimeSeconds =
                            periodStart + segTime / timescale;
                        const durationSeconds = d / timescale;
                        const url = mediaTemplate
                            .replace(/\$RepresentationID\$/g, repId)
                            .replace(/\$Number(%0\d+d)?\$/g, (match, p) =>
                                String(segmentNumber).padStart(
                                    p
                                        ? parseInt(p.substring(2, p.length - 1))
                                        : 1,
                                    '0'
                                )
                            )
                            .replace(/\$Time\$/g, String(segTime));
                        segmentsByRep[compositeKey].push({
                            repId,
                            type: 'Media',
                            number: segmentNumber,
                            resolvedUrl: new URL(url, baseUrl).href,
                            template: url,
                            time: segTime,
                            duration: d,
                            timescale,
                            startTimeUTC:
                                availabilityStartTime + startTimeSeconds * 1000,
                            endTimeUTC:
                                availabilityStartTime +
                                (startTimeSeconds + durationSeconds) * 1000,
                        });
                        currentTime += d;
                        segmentNumber++;
                    }
                });
            } else if (mediaTemplate && getAttr(template, 'duration')) {
                const segmentDuration = parseInt(getAttr(template, 'duration'));
                const segmentDurationSeconds = segmentDuration / timescale;
                let numSegments = 0;
                const endNumber = getAttr(template, 'endNumber')
                    ? parseInt(getAttr(template, 'endNumber'))
                    : null;

                if (isDynamic) {
                    numSegments = 10; // Heuristic for live streams
                } else {
                    if (endNumber !== null) {
                        numSegments = endNumber - startNumber + 1;
                    } else {
                        const totalDuration =
                            parseDuration(
                                getAttr(
                                    manifestElement,
                                    'mediaPresentationDuration'
                                )
                            ) || parseDuration(getAttr(period, 'duration'));
                        if (!totalDuration || !segmentDurationSeconds) return;
                        numSegments = Math.ceil(
                            totalDuration / segmentDurationSeconds
                        );
                    }
                }

                for (let i = 0; i < numSegments; i++) {
                    const segmentNumber = startNumber + i;
                    const time = (segmentNumber - startNumber) * segmentDuration;
                    const startTimeSeconds = periodStart + time / timescale;
                    const url = mediaTemplate
                        .replace(/\$RepresentationID\$/g, repId)
                        .replace(/\$Number(%0\d+d)?\$/g, (m, p) =>
                            String(segmentNumber).padStart(
                                p ? parseInt(p.substring(2, p.length - 1)) : 1,
                                '0'
                            )
                        );
                    segmentsByRep[compositeKey].push({
                        repId,
                        type: 'Media',
                        number: segmentNumber,
                        resolvedUrl: new URL(url, baseUrl).href,
                        template: url,
                        time: time,
                        duration: segmentDuration,
                        timescale,
                        startTimeUTC:
                            availabilityStartTime + startTimeSeconds * 1000,
                        endTimeUTC:
                            availabilityStartTime +
                            (startTimeSeconds + segmentDurationSeconds) * 1000,
                    });
                }
            }
        } else if (segmentList) {
            const timescale = parseInt(
                getAttr(segmentList, 'timescale') || '1'
            );
            const duration = parseInt(getAttr(segmentList, 'duration'));
            const durationSeconds = duration / timescale;
            let currentTime = 0;
            const periodStart = parseDuration(getAttr(period, 'start')) || 0;

            const segmentUrls = findChildren(segmentList, 'SegmentURL');
            segmentUrls.forEach((segmentUrlEl, i) => {
                const mediaUrl = getAttr(segmentUrlEl, 'media');
                if (mediaUrl) {
                    const startTimeSeconds =
                        periodStart + currentTime / timescale;
                    segmentsByRep[compositeKey].push({
                        repId,
                        type: 'Media',
                        number: i + 1,
                        resolvedUrl: new URL(mediaUrl, baseUrl).href,
                        template: mediaUrl,
                        time: currentTime,
                        duration: duration,
                        timescale,
                        startTimeUTC:
                            availabilityStartTime + startTimeSeconds * 1000,
                        endTimeUTC:
                            availabilityStartTime +
                            (startTimeSeconds + durationSeconds) * 1000,
                    });
                    currentTime += duration;
                }
            });
        } else if (segmentBase || findChild(rep, 'BaseURL')) {
            const timescale = parseInt(
                getAttr(adaptationSet, 'timescale') || '1'
            );
            const totalDuration =
                parseDuration(
                    getAttr(manifestElement, 'mediaPresentationDuration')
                ) ||
                parseDuration(getAttr(period, 'duration')) ||
                0;

            segmentsByRep[compositeKey].push({
                repId,
                type: 'Media',
                number: 1,
                resolvedUrl: baseUrl,
                template: findChild(rep, 'BaseURL') ? 'BaseURL' : 'SegmentBase',
                time: 0,
                duration: totalDuration * timescale,
                timescale,
                startTimeUTC: 0,
                endTimeUTC: 0,
            });
        }
    });
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

    const hierarchy = [repElement, adaptationSet.serializedManifest, period.serializedManifest];

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