import { XMLParser } from 'fast-xml-parser';
import { findChildrenRecursive } from '../utils/recursive-parser';

/**
 * Parses a TTML time expression (e.g., "00:00:23.000") into seconds.
 * @param {string} timeStr The time expression string.
 * @returns {number | null} The time in seconds, or null if invalid.
 */
function parseTtmlTime(timeStr) {
    if (typeof timeStr !== 'string') return null;

    const parts = timeStr.split(':');
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
 * Parses a TTML XML string to extract cues.
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
        const pTags = findChildrenRecursive(jsonObj, 'p');

        for (const pTag of pTags) {
            const attrs = pTag[':@'] || {};
            const begin = parseTtmlTime(attrs.begin);
            const end = parseTtmlTime(attrs.end);
            const payload = pTag['#text'] || '';

            if (begin !== null && end !== null) {
                result.cues.push({
                    id: attrs.id || null,
                    startTime: begin,
                    endTime: end,
                    payload: payload,
                });
            } else {
                result.errors.push(
                    `Malformed cue: Invalid or missing begin/end time on <p> tag.`
                );
            }
        }
    } catch (e) {
        result.errors.push(`XML parsing failed: ${e.message}`);
    }

    return result;
}
