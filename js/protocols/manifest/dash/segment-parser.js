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
 * @returns {Record<string, object[]>} A map of Representation IDs to their segment lists.
 */
export function parseAllSegmentUrls(manifestElement, manifestUrl) {
    /** @type {Record<string, object[]>} */
    const segmentsByRep = {};
    const isDynamic = getAttr(manifestElement, 'type') === 'dynamic';

    const allRepsWithContext = findElementsByTagNameRecursive(
        manifestElement,
        'Representation'
    );

    allRepsWithContext.forEach(({ element: rep, context }) => {
        const repId = getAttr(rep, 'id');
        if (!repId) return;

        segmentsByRep[repId] = [];
        const { period, adaptationSet } = context;
        if (!period || !adaptationSet) return;

        const hierarchy = [rep, adaptationSet, period];

        const baseUrl = resolveBaseUrl(
            manifestUrl,
            manifestElement,
            period,
            adaptationSet,
            rep
        );

        // Correctly determine active segmentation type based on hierarchy.
        const template = getInheritedElement('SegmentTemplate', hierarchy);
        const segmentList = getInheritedElement('SegmentList', hierarchy);
        const segmentBase = getInheritedElement('SegmentBase', hierarchy);

        // --- Initialization Segment Logic ---
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
            segmentsByRep[repId].push({
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

        // --- Media Segment Logic ---
        if (template) {
            const timescale = parseInt(getAttr(template, 'timescale') || '1');
            const mediaTemplate = getAttr(template, 'media');
            const timeline = findChild(template, 'SegmentTimeline');
            const startNumber = parseInt(
                getAttr(template, 'startNumber') || '1'
            );

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
                        segmentsByRep[repId].push({
                            repId,
                            type: 'Media',
                            number: segmentNumber,
                            resolvedUrl: new URL(url, baseUrl).href,
                            template: url,
                            time: segTime,
                            duration: d,
                            timescale,
                        });
                        currentTime += d;
                        segmentNumber++;
                    }
                });
            } else if (mediaTemplate && getAttr(template, 'duration')) {
                const segmentDuration = parseInt(getAttr(template, 'duration'));
                const segmentDurationSeconds = segmentDuration / timescale;
                let numSegments = 0;
                let firstSegmentNumber = startNumber;

                if (isDynamic) {
                    // This logic remains complex and is out of scope for this specific bug fix.
                    // Assuming a reasonable number of segments for live for now.
                    numSegments = 10;
                } else {
                    // VOD
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

                for (let i = 0; i < numSegments; i++) {
                    const segmentNumber = firstSegmentNumber + i;
                    const url = mediaTemplate
                        .replace(/\$RepresentationID\$/g, repId)
                        .replace(/\$Number(%0\d+d)?\$/g, (m, p) =>
                            String(segmentNumber).padStart(
                                p ? parseInt(p.substring(2, p.length - 1)) : 1,
                                '0'
                            )
                        );
                    segmentsByRep[repId].push({
                        repId,
                        type: 'Media',
                        number: segmentNumber,
                        resolvedUrl: new URL(url, baseUrl).href,
                        template: url,
                        time: (segmentNumber - startNumber) * segmentDuration,
                        duration: segmentDuration,
                        timescale,
                    });
                }
            }
        } else if (segmentList) {
            const timescale = parseInt(
                getAttr(segmentList, 'timescale') || '1'
            );
            const duration = parseInt(getAttr(segmentList, 'duration'));
            let currentTime = 0;
            const segmentUrls = findChildren(segmentList, 'SegmentURL');
            segmentUrls.forEach((segmentUrlEl, i) => {
                const mediaUrl = getAttr(segmentUrlEl, 'media');
                if (mediaUrl) {
                    segmentsByRep[repId].push({
                        repId,
                        type: 'Media',
                        number: i + 1,
                        resolvedUrl: new URL(mediaUrl, baseUrl).href,
                        template: mediaUrl,
                        time: currentTime,
                        duration: duration,
                        timescale,
                    });
                    currentTime += duration;
                }
            });
        } else if (segmentBase) {
            const totalDuration =
                parseDuration(
                    getAttr(manifestElement, 'mediaPresentationDuration')
                ) ||
                parseDuration(getAttr(period, 'duration')) ||
                0;
            const timescale = 1;
            segmentsByRep[repId].push({
                repId,
                type: 'Media',
                number: 1,
                resolvedUrl: baseUrl,
                template: 'SegmentBase',
                time: 0,
                duration: totalDuration * timescale,
                timescale,
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
    const repElement = representation.rawElement;
    if (!repElement) return null;

    const hierarchy = [repElement, adaptationSet.rawElement, period.rawElement];

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

    // Fallback for single-file representations (BaseURL only)
    if (!template && !list && !base) {
        // In the case of single-file DASH, the resolved baseUrl IS the segment URL.
        // `resolveBaseUrl` should have been used to create the `baseUrl` passed to this function.
        // We can just return it if no other segment info is found.
        return baseUrl;
    }

    return null;
}
