import { XMLParser } from 'fast-xml-parser';

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
 * @returns {{ads: Array<object>}}
 */
export function parseVast(vastXml) {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        textNodeName: '#text',
        isArray: (tagName) =>
            ['Ad', 'Creative', 'Tracking', 'MediaFile'].includes(tagName),
    });

    try {
        const parsed = parser.parse(vastXml);
        const vast = parsed.VAST;
        if (!vast || !vast.Ad) {
            return { ads: [] };
        }

        const ads = vast.Ad.map((adNode) => {
            const inLine = adNode.InLine || adNode.Wrapper;
            if (!inLine || !inLine.Creatives || !inLine.Creatives.Creative) {
                return null;
            }

            const creatives = inLine.Creatives.Creative.map((creativeNode) => {
                const linear = creativeNode.Linear;
                if (!linear) return null;

                const trackingUrls = new Map();
                if (linear.TrackingEvents && linear.TrackingEvents.Tracking) {
                    for (const tracking of linear.TrackingEvents.Tracking) {
                        if (tracking.event) {
                            if (!trackingUrls.has(tracking.event)) {
                                trackingUrls.set(tracking.event, []);
                            }
                            trackingUrls
                                .get(tracking.event)
                                .push(tracking['#text']);
                        }
                    }
                }

                const mediaFile =
                    linear.MediaFiles?.MediaFile?.find(
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
                    mediaFileUrl: mediaFile ? mediaFile['#text']?.trim() : null,
                    trackingUrls,
                };
            }).filter(Boolean);

            return {
                id: adNode.id || null,
                creatives,
            };
        }).filter(Boolean);

        return { ads };
    } catch (e) {
        console.error('VAST parsing failed:', e);
        return { ads: [] };
    }
}
