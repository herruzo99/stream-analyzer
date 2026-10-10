import { XMLParser } from 'fast-xml-parser';
import { AD_XML_LIMITS, boundedAdItems, boundedAdXml } from './xml-limits.js';

/**
 * Parses a VAST duration string (HH:MM:SS.mmm or HH:MM:SS) into seconds.
 * @param {string} durationStr
 * @returns {number}
 */
function parseVastDuration(durationStr) {
    if (typeof durationStr !== 'string') return 0;
    const parts = durationStr.split(':');
    let seconds = 0;
    if (parts.length === 3) {
        seconds += parseInt(parts[0], 10) * 3600;
        seconds += parseInt(parts[1], 10) * 60;
        seconds += parseFloat(parts[2]);
    }
    return seconds;
}

/**
 * Parses a VAST XML string to extract essential ad creative information.
 * This is a lightweight parser focused on what the analyzer needs, not a fully compliant VAST parser.
 * @param {string} vastXml
 * @returns {{ads: Array<object>, errors: string[]}}
 */
export function parseVast(vastXml) {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        textNodeName: '#text',
        processEntities: false,
        maxNestedTags: 50,
        strictReservedNames: true,
        isArray: (tagName) =>
            ['Ad', 'Creative', 'Tracking', 'MediaFile'].includes(tagName),
    });

    try {
        const parsed = parser.parse(boundedAdXml(vastXml));
        const vast = parsed.VAST;
        if (!vast || !vast.Ad) {
            return { ads: [], errors: [] };
        }

        const ads = boundedAdItems(vast.Ad)
            .map((adNode) => {
                const inLine = adNode.InLine || adNode.Wrapper;
                if (
                    !inLine ||
                    !inLine.Creatives ||
                    !inLine.Creatives.Creative
                ) {
                    return null;
                }

                const creatives = boundedAdItems(
                    inLine.Creatives.Creative,
                    AD_XML_LIMITS.nestedItems
                )
                    .map((creativeNode) => {
                        const linear = creativeNode.Linear;
                        if (!linear) return null;

                        const trackingUrls = new Map();
                        if (
                            linear.TrackingEvents &&
                            linear.TrackingEvents.Tracking
                        ) {
                            for (const tracking of boundedAdItems(
                                linear.TrackingEvents.Tracking,
                                AD_XML_LIMITS.nestedItems
                            )) {
                                if (tracking.event) {
                                    if (!trackingUrls.has(tracking.event)) {
                                        trackingUrls.set(tracking.event, []);
                                    }
                                    const eventUrls = trackingUrls.get(
                                        tracking.event
                                    );
                                    if (
                                        eventUrls.length <
                                        AD_XML_LIMITS.nestedItems
                                    )
                                        eventUrls.push(tracking['#text']);
                                }
                            }
                        }

                        const mediaFile =
                            boundedAdItems(
                                linear.MediaFiles?.MediaFile,
                                AD_XML_LIMITS.nestedItems
                            ).find(
                                (mf) =>
                                    mf.delivery === 'progressive' &&
                                    mf.type.startsWith('video/')
                            ) || linear.MediaFiles?.MediaFile?.[0];

                        return {
                            id: creativeNode.id || null,
                            sequence: creativeNode.sequence
                                ? parseInt(creativeNode.sequence, 10)
                                : null,
                            duration: parseVastDuration(linear.Duration),
                            mediaFileUrl: mediaFile
                                ? mediaFile['#text']?.trim()
                                : null,
                            trackingUrls,
                        };
                    })
                    .filter(Boolean);

                return {
                    id: adNode.id || null,
                    creatives,
                };
            })
            .filter(Boolean);

        return { ads, errors: [] };
    } catch (e) {
        return {
            ads: [],
            errors: [String(e?.message ?? 'VAST parsing failed.')].slice(
                0,
                AD_XML_LIMITS.errors
            ),
        };
    }
}
