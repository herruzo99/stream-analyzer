/**
 * @typedef {import('../../state.js').Manifest} Manifest
 * @typedef {import('../../state.js').Period} Period
 * @typedef {import('../../state.js').AdaptationSet} AdaptationSet
 * @typedef {import('../../state.js').Representation} Representation
 */

import { getDrmSystemName } from '../../shared/utils/drm.js';

/**
 * Parses an ISO 8601 duration string into seconds.
 * @param {string} durationStr
 * @returns {number | null}
 */
const parseDuration = (durationStr) => {
    if (!durationStr) return null;
    const match = durationStr.match(
        /PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?/
    );
    if (!match) return null;
    const hours = parseFloat(match[1] || '0');
    const minutes = parseFloat(match[2] || '0');
    const seconds = parseFloat(match[3] || '0');
    return hours * 3600 + minutes * 60 + seconds;
};

/**
 * Transforms a DASH XML manifest element into a protocol-agnostic Intermediate Representation (IR).
 * @param {Element} manifestElement The root <MPD> element.
 * @returns {Manifest} The manifest IR object.
 */
export function adaptDashToIr(manifestElement) {
    const getAttr = (el, attr) => el.getAttribute(attr);

    /** @type {Manifest} */
    const manifestIR = {
        type: getAttr(manifestElement, 'type'),
        profiles: getAttr(manifestElement, 'profiles'),
        minBufferTime: parseDuration(getAttr(manifestElement, 'minBufferTime')),
        publishTime: getAttr(manifestElement, 'publishTime')
            ? new Date(getAttr(manifestElement, 'publishTime'))
            : null,
        availabilityStartTime: getAttr(manifestElement, 'availabilityStartTime')
            ? new Date(getAttr(manifestElement, 'availabilityStartTime'))
            : null,
        timeShiftBufferDepth: parseDuration(
            getAttr(manifestElement, 'timeShiftBufferDepth')
        ),
        minimumUpdatePeriod: parseDuration(
            getAttr(manifestElement, 'minimumUpdatePeriod')
        ),
        duration: parseDuration(
            getAttr(manifestElement, 'mediaPresentationDuration')
        ),
        periods: [],
        rawElement: manifestElement, // Keep a reference for features not yet migrated
    };

    manifestElement.querySelectorAll('Period').forEach((periodEl) => {
        /** @type {Period} */
        const periodIR = {
            id: getAttr(periodEl, 'id'),
            start: parseDuration(getAttr(periodEl, 'start')),
            duration: parseDuration(getAttr(periodEl, 'duration')),
            adaptationSets: [],
        };

        periodEl.querySelectorAll('AdaptationSet').forEach((asEl) => {
            /** @type {AdaptationSet} */
            const asIR = {
                id: getAttr(asEl, 'id'),
                contentType:
                    getAttr(asEl, 'contentType') ||
                    getAttr(asEl, 'mimeType')?.split('/')[0],
                lang: getAttr(asEl, 'lang'),
                mimeType: getAttr(asEl, 'mimeType'),
                representations: [],
                contentProtection: [],
            };

            asEl.querySelectorAll('ContentProtection').forEach((cpEl) => {
                asIR.contentProtection.push({
                    schemeIdUri: getAttr(cpEl, 'schemeIdUri'),
                    system: getDrmSystemName(getAttr(cpEl, 'schemeIdUri')),
                });
            });

            asEl.querySelectorAll('Representation').forEach((repEl) => {
                /** @type {Representation} */
                const repIR = {
                    id: getAttr(repEl, 'id'),
                    codecs: getAttr(repEl, 'codecs') || getAttr(asEl, 'codecs'),
                    bandwidth: parseInt(getAttr(repEl, 'bandwidth'), 10),
                    width: parseInt(getAttr(repEl, 'width'), 10),
                    height: parseInt(getAttr(repEl, 'height'), 10),
                };
                asIR.representations.push(repIR);
            });

            periodIR.adaptationSets.push(asIR);
        });

        manifestIR.periods.push(periodIR);
    });

    return manifestIR;
}