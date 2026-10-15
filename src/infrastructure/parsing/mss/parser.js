// MSS (IIS Smooth Streaming) client manifest parsing → the same protocol
// agnostic IR the DASH adapter produces, so the manifest viewer, compliance
// engine and feature analysis work unchanged.
//
// References:
//   standard/mss-client-manifest-format.html, standard/mss-manifest-structure.html
//   [MS-SSTR] Smooth Streaming Protocol (learn.microsoft.com/openspecs)
//   real-world fixtures in tests/fixtures/mss/ (Unified Streaming + DirectTaps)

import { XMLParser } from 'fast-xml-parser';
import { adaptMssToIr } from './adapter.js';

const MSS_TAGS = [
    'SmoothStreamingMedia',
    'Protection',
    'ProtectionHeader',
    'CustomAttributes',
    'Attribute',
    'StreamIndex',
    'QualityLevel',
    'c',
    'f',
    'Content',
    'ScriptCommand',
    'Marker',
    'Sample',
];

/**
 * Cheap content sniff so the worker can route before parsing.
 * @param {string} xmlString
 * @returns {boolean}
 */
export function isMssManifest(xmlString) {
    if (typeof xmlString !== 'string') return false;
    return /<SmoothStreamingMedia[\s>]/i.test(xmlString);
}

/**
 * Parse an MSS client manifest (.ismc / …/Manifest).
 *
 * @param {string} xmlString raw client manifest XML
 * @param {string} baseUrl URL the manifest was fetched from
 * @returns {Promise<{manifest: object, serializedManifest: object, baseUrl: string}>}
 */
export async function parseManifest(xmlString, baseUrl) {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        attributesGroupName: ':@',
        textNodeName: '#text',
        allowBooleanAttributes: true,
        processEntities: false,
        maxNestedTags: 50,
        strictReservedNames: true,
        removeNSPrefix: true,
        alwaysCreateTextNode: true,
        isArray: (tagName) =>
            [
                'StreamIndex',
                'QualityLevel',
                'c',
                'Attribute',
                'f',
                'Content',
                'Marker',
                'Sample',
            ].includes(tagName),
    });

    let parsed;
    try {
        parsed = parser.parse(xmlString);
    } catch (err) {
        throw new Error(`MSS manifest is not well-formed XML: ${err.message}`);
    }

    const root = parsed?.SmoothStreamingMedia;
    if (!root) {
        throw new Error(
            'MSS manifest has no SmoothStreamingMedia root element'
        );
    }

    const manifest = adaptMssToIr(root, baseUrl);
    return { manifest, serializedManifest: root, baseUrl };
}

export { MSS_TAGS };
