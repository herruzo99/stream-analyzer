import { XMLParser } from 'fast-xml-parser';

/**
 * @typedef {Object} VmapAdBreak
 * @property {string} breakId
 * @property {string} breakType - 'linear', 'nonlinear', 'display'
 * @property {string} timeOffset - 'start', 'end', or HH:MM:SS.mmm
 * @property {string} adSourceId
 * @property {'vast' | 'custom'} adSourceTemplateType
 * @property {string | null} adTagUri
 * @property {string | null} templateType - e.g. "vast3"
 * @property {object | null} vastData - Embedded VAST object
 * @property {string[]} trackingEvents
 */

/**
 * @typedef {Object} VmapResult
 * @property {string} version
 * @property {VmapAdBreak[]} breaks
 * @property {string[]} errors
 */

/**
 * Parses a VMAP XML string.
 * @param {string} xmlString
 * @returns {VmapResult}
 */
export function parseVmap(xmlString) {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        attributesGroupName: ':@',
        textNodeName: '#text',
        removeNSPrefix: true, // Strips vmap: prefix
        isArray: (tagName) => ['AdBreak', 'Tracking'].includes(tagName),
    });

    const result = { version: '1.0', breaks: [], errors: [] };

    try {
        const parsed = parser.parse(xmlString);
        const vmap = parsed.VMAP;

        if (!vmap) {
            throw new Error('Invalid VMAP: Missing root <VMAP> element.');
        }

        if (vmap[':@']?.version) {
            result.version = vmap[':@'].version;
        }

        const adBreaks = vmap.AdBreak || [];

        result.breaks = adBreaks.map((ab) => {
            const attrs = ab[':@'] || {};
            const breakId = attrs.breakId || attrs.breakID;
            const timeOffset = attrs.timeOffset;
            const breakType = attrs.breakType;

            const adSource = ab.AdSource;
            const asAttrs = adSource ? adSource[':@'] || {} : {};

            let adTagUri = null;
            let templateType = null;
            let vastData = null;

            // Handle AdSource
            if (adSource) {
                if (adSource.AdTagURI) {
                    const uriObj = adSource.AdTagURI;
                    templateType = uriObj[':@']?.templateType; // capture unused var
                    adTagUri = uriObj['#text'] ? uriObj['#text'].trim() : null;
                } else if (adSource.VASTData) {
                    // Embedded VAST
                    const vastRaw = adSource.VASTData.VAST;
                    if (vastRaw) {
                        vastData = { summary: 'Embedded VAST content found' };
                    }
                }
            }

            // Tracking
            const trackingEvents = [];
            if (ab.TrackingEvents && ab.TrackingEvents.Tracking) {
                ab.TrackingEvents.Tracking.forEach((t) => {
                    if (t[':@']?.event) trackingEvents.push(t[':@'].event);
                });
            }

            return {
                breakId,
                timeOffset,
                breakType,
                adSourceId: asAttrs.id,
                adSourceAllowMultipleAds: asAttrs.allowMultipleAds === 'true',
                adSourceFollowRedirects: asAttrs.followRedirects === 'true',
                adTagUri,
                templateType, // Expose the VAST version type
                vastData,
                trackingEvents,
            };
        });
    } catch (e) {
        console.error('VMAP parsing failed:', e);
        result.errors.push(e.message);
    }

    return result;
}
