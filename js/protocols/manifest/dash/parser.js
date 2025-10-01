import { adaptDashToIr } from './adapter.js';
import { XMLParser } from 'fast-xml-parser';
import { findChildren } from './recursive-parser.js';

const getText = (el) => el?.['#text'] || null;

/**
 * Parses a DASH Manifest XML string and returns a protocol-agnostic Intermediate Representation.
 * This is the public entry point for the DASH manifest parsing module.
 * @param {string} xmlString The raw MPD XML.
 * @param {string} baseUrl The URL from which the MPD was fetched.
 * @returns {Promise<{manifest: import('../../../core/state.js').Manifest, serializedManifest: object, baseUrl: string}>}
 */
export async function parseManifest(xmlString, baseUrl) {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        attributesGroupName: ':@',
        textNodeName: '#text',
        allowBooleanAttributes: true,
        removeNSPrefix: true,
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

    // Handle BaseURL resolution before adapting. Per DASH-IF IOPs, only the first BaseURL at any level is considered.
    const manifestBaseElements = findChildren(serializedManifest, 'BaseURL');
    let finalBaseUrl = baseUrl;
    if (manifestBaseElements.length > 0) {
        const firstBaseUrlText = getText(manifestBaseElements[0]);
        if (firstBaseUrlText) {
            finalBaseUrl = new URL(firstBaseUrlText, baseUrl).href;
        }
    }

    const manifestIR = adaptDashToIr(serializedManifest, finalBaseUrl);

    // The serializedManifest is returned for use in feature/compliance checks that need the raw structure.
    return {
        manifest: manifestIR,
        serializedManifest,
        baseUrl: finalBaseUrl,
    };
}