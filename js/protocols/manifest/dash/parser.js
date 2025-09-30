import { adaptDashToIr } from './adapter.js';

/**
 * Parses a serialized DASH Manifest object and returns a protocol-agnostic Intermediate Representation.
 * This function now runs in the worker.
 * @param {object} serializedManifest The raw MPD, parsed and serialized into a lightweight JS object by fast-xml-parser.
 * @param {string} baseUrl The URL from which the MPD was fetched.
 * @returns {Promise<{manifest: import('../../../core/state.js').Manifest, serializedManifest: object, baseUrl: string}>}
 */
export async function parseManifest(serializedManifest, baseUrl) {
    const findChild = (el, tagName) =>
        el?.children?.find((c) => c.tagName === tagName);
    const getText = (el) => el?.children?.[0]?.content || null;

    const manifestBaseElement = findChild(serializedManifest, 'BaseURL');
    if (manifestBaseElement && getText(manifestBaseElement)) {
        baseUrl = new URL(getText(manifestBaseElement), baseUrl).href;
    }

    const { manifestIR, manifestElement } = adaptDashToIr(serializedManifest);
    return {
        manifest: manifestIR,
        serializedManifest: manifestElement,
        baseUrl,
    };
}
