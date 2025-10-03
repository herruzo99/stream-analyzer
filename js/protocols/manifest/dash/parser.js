import { adaptDashToIr } from './adapter.js';
import { XMLParser } from 'fast-xml-parser';

/**
 * Parses a DASH Manifest XML string and returns a protocol-agnostic Intermediate Representation.
 * This is the public entry point for the DASH manifest parsing module.
 * @param {string} xmlString The raw MPD XML.
 * @param {string} baseUrl The URL from which the MPD was fetched.
 * @returns {Promise<{manifest: import('../../../core/store.js').Manifest, serializedManifest: object, baseUrl: string}>}
 */
export async function parseManifest(xmlString, baseUrl) {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        attributesGroupName: ':@',
        textNodeName: '#text',
        allowBooleanAttributes: true,
        removeNSPrefix: true,
        alwaysCreateTextNode: true, // <-- FIX: Ensures consistent parsing for text-only nodes
        // Force these tags to always be arrays for consistent traversal
        isArray: (tagName) => {
            return [
                'Period',
                'AdaptationSet',
                'Representation',
                'S',
                'ContentProtection',
                'Role',
                'Location',
                'BaseURL',
                'EventStream',
                'SegmentURL',
                'Subset',
                'ProgramInformation',
                'Metrics',
            ].includes(tagName);
        },
    });

    const jsonObj = parser.parse(xmlString);
    const mpdNodeKey = Object.keys(jsonObj).find(
        (key) => key.toUpperCase() === 'MPD'
    );
    if (!mpdNodeKey) {
        throw new Error('Could not find MPD root element in the manifest.');
    }
    const serializedManifest = jsonObj[mpdNodeKey];

    const manifestIR = adaptDashToIr(serializedManifest, baseUrl);

    return {
        manifest: manifestIR,
        serializedManifest,
        baseUrl: baseUrl,
    };
}
