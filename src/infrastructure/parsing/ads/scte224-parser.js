import { XMLParser } from 'fast-xml-parser';

/**
 * @typedef {Object} Scte224MediaPoint
 * @property {string} id
 * @property {string} matchTime
 * @property {string} source
 * @property {string} order
 * @property {string} [expectedDuration]
 */

/**
 * @typedef {Object} Scte224Audience
 * @property {string} id
 * @property {string} payloadId
 * @property {string} type
 * @property {string[]} values
 */

/**
 * @typedef {Object} Scte224Result
 * @property {string} id
 * @property {string} description
 * @property {string} lastUpdated
 * @property {Scte224MediaPoint[]} mediaPoints
 * @property {Scte224Audience[]} audiences
 * @property {string[]} errors
 */

export function parseScte224(xmlString) {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        attributesGroupName: ':@',
        textNodeName: '#text',
        removeNSPrefix: true,
        isArray: (tagName) =>
            ['MediaPoint', 'Audience', 'Zip'].includes(tagName),
    });

    const result = {
        id: null,
        description: null,
        lastUpdated: null,
        mediaPoints: [],
        audiences: [],
        errors: [],
    };

    try {
        const parsed = parser.parse(xmlString);
        const root = parsed.Media || parsed.Audience; // Can be Media or Audience root

        if (!root) throw new Error('Unknown SCTE-224 Root Element');

        const attrs = root[':@'] || {};
        result.id = attrs.id;
        result.description = attrs.description;
        result.lastUpdated = attrs.lastUpdated;

        if (parsed.Media) {
            const media = parsed.Media;
            if (media.MediaPoint) {
                result.mediaPoints = media.MediaPoint.map((mp) => {
                    const mpAttrs = mp[':@'] || {};
                    return {
                        id: mpAttrs.id,
                        matchTime: mpAttrs.matchTime,
                        source: mpAttrs.source,
                        order: mpAttrs.order,
                        expectedDuration: mpAttrs.expectedDuration,
                        // Recurse for nested MediaPoints (simplified for now)
                        hasChildren: !!mp.MediaPoint,
                    };
                });
            }
        }

        if (parsed.Audience) {
            // Audience definitions often contain Match elements
            const audience = parsed.Audience;
            // This simple parser assumes a structure, but SCTE-224 is complex.
            // We extract basic identity.
            if (audience.Audience) {
                // Nested audiences or list
                // Handle if root contains list
            } else {
                // Single audience payload
                result.audiences.push({
                    id: attrs.id,
                    payloadId: attrs.payloadId,
                    type: 'Audience',
                    values: [], // Extract Match values if needed
                });
            }
        }
    } catch (e) {
        result.errors.push(`SCTE-224 Parse Error: ${e.message}`);
    }

    return result;
}
