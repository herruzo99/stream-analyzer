import { parseAllSegmentUrls as parseDashSegments } from './dash-parser.js';
import { parseAllSegmentUrls as parseHlsSegments } from './hls-parser.js';

/**
 * Parses all segment URLs from a manifest.
 * Dispatches to the correct protocol-specific parser.
 * @param {import('../../core/state.js').Stream} stream
 * @returns {Record<string, object[]>} A map of Representation/Variant IDs to their segment lists.
 */
export function parseAllSegmentUrls(stream) {
    if (stream.protocol === 'hls') {
        // HLS parser expects the parsed object from the manifest IR
        return parseHlsSegments(stream.manifest.rawElement);
    }
    // Default to DASH, which expects the raw XML Element
    return parseDashSegments(stream.manifest.rawElement, stream.baseUrl);
}