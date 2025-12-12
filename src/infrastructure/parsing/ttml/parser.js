import { XMLParser } from 'fast-xml-parser';
import { findChildrenRecursive } from '../utils/recursive-parser';

/**
 * Parses a TTML time expression (e.g., "00:00:23.000" or "23s") into seconds.
 * @param {string} timeStr The time expression string.
 * @returns {number | null} The time in seconds, or null if invalid.
 */
function parseTtmlTime(timeStr) {
    if (typeof timeStr !== 'string') return null;
    const t = timeStr.trim();

    // Handle "10s" format
    if (t.endsWith('s')) {
        const s = parseFloat(t);
        return isNaN(s) ? null : s;
    }

    // Handle "00:00:00.000" format
    const parts = t.split(':');
    if (parts.length < 2 || parts.length > 3) return null;

    try {
        let hours = 0,
            minutes = 0,
            seconds = 0;
        if (parts.length === 3) {
            hours = parseFloat(parts[0]);
            minutes = parseFloat(parts[1]);
            seconds = parseFloat(parts[2]);
        } else {
            minutes = parseFloat(parts[0]);
            seconds = parseFloat(parts[1]);
        }

        if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
            return null;
        }

        return hours * 3600 + minutes * 60 + seconds;
    } catch (_) {
        return null;
    }
}

/**
 * Parses a TTML XML string to extract cues, supporting both text (<p>) and image (<div>) profiles.
 * @param {string} ttmlString The raw TTML XML content.
 * @returns {import('@/types').TtmlPayload}
 */
export function parseTTML(ttmlString) {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        attributesGroupName: ':@',
        textNodeName: '#text',
        allowBooleanAttributes: true,
        removeNSPrefix: true,
    });

    const result = { cues: [], errors: [] };

    try {
        const jsonObj = parser.parse(ttmlString);

        // Find all <p> tags (Text) and <div> tags (Containers/Images)
        const pTags = findChildrenRecursive(jsonObj, 'p');
        const divTags = findChildrenRecursive(jsonObj, 'div');

        const allTags = [
            ...pTags.map((t) => ({ ...t, _tagName: 'p' })),
            ...divTags.map((t) => ({ ...t, _tagName: 'div' })),
        ];

        for (const tag of allTags) {
            const attrs = tag[':@'] || {};
            const begin = parseTtmlTime(attrs.begin);
            const end = parseTtmlTime(attrs.end);

            // Only process if we have valid timing
            if (begin !== null && end !== null) {
                let payload = tag['#text'] || '';

                // Check for SMPTE-TT Image attributes
                // Note: fast-xml-parser removes namespaces with removeNSPrefix: true,
                // so "smpte:backgroundImage" becomes "backgroundImage"
                const bgImage =
                    attrs.backgroundImage ||
                    attrs.backgroundImageHorizontal ||
                    attrs.backgroundImageVertical;

                if (!payload && bgImage) {
                    payload = `[Image Reference]: ${bgImage}`;
                } else if (!payload && tag._tagName === 'div') {
                    // It's a timed container without text or direct image ref (maybe children have it)
                    payload = `(Container/Image Region) ID: ${attrs.id || 'N/A'}`;
                } else if (tag._tagName === 'div' && payload) {
                    // Div with text content
                    payload = `(Div): ${payload}`;
                }

                result.cues.push({
                    id: attrs.id || null,
                    startTime: begin,
                    endTime: end,
                    payload: payload,
                });
            }
        }

        // Deduplicate based on ID + Time to avoid overlapping divs/ps
        // This isn't strictly necessary but cleans up the view for IMSC1
    } catch (e) {
        result.errors.push(`XML parsing failed: ${e.message}`);
    }

    // Sort by time
    result.cues.sort((a, b) => a.startTime - b.startTime);

    return result;
}
