import { parseTTML as parse } from './parser.js';

/**
 * Parses a TTML string and returns a structured object.
 * This is the public entry point for the TTML parsing module.
 * @param {string} ttmlString The raw TTML XML.
 * @returns {import('@/types').TtmlPayload} The parsed TTML data structure.
 */
export function parseTTML(ttmlString) {
    return parse(ttmlString);
}
