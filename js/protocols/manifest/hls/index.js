import { parseManifest as parse } from './parser.js';

/**
 * Parses an HLS Manifest string and returns a structured object.
 * This is the public entry point for the HLS manifest parsing module.
 * @param {string} manifestString The raw HLS playlist.
 * @param {string} baseUrl The URL from which the playlist was fetched.
 * @returns {Promise<{manifest: import('../../../core/store.js').Manifest, definedVariables: Map<string, {value: string, source: string}>, baseUrl: string}>}
 */
export async function parseManifest(manifestString, baseUrl) {
    const {
        manifest,
        definedVariables,
        baseUrl: finalBaseUrl,
    } = await parse(manifestString, baseUrl);
    return { manifest, definedVariables, baseUrl: finalBaseUrl };
}
