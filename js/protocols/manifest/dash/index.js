import { parseManifest as parse } from './parser.js';
import { XMLParser } from 'fast-xml-parser';

// Helper function to transform fast-xml-parser output to our expected serialized format
function transformFxpOutput(node, tagName) {
    if (!node) return null;
    const attributes = node[':@'] || {};
    const children = [];

    for (const key in node) {
        if (key === ':@' || key === '#text') continue;
        const childItems = Array.isArray(node[key]) ? node[key] : [node[key]];
        childItems.forEach((child) => {
            if (typeof child === 'object') {
                children.push(transformFxpOutput(child, key));
            }
        });
    }

    if (node['#text'] !== undefined) {
        children.push({ type: 'text', content: node['#text'] });
    }

    return { type: 'element', tagName, attributes, children };
}

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
    });
    const jsonObj = parser.parse(xmlString);
    const mpdNodeKey = Object.keys(jsonObj).find(
        (key) => key.toUpperCase() === 'MPD'
    );
    if (!mpdNodeKey) {
        throw new Error('Could not find MPD root element in the manifest.');
    }
    const serializedManifestObject = transformFxpOutput(
        jsonObj[mpdNodeKey],
        'MPD'
    );

    const {
        manifest,
        serializedManifest,
        baseUrl: finalBaseUrl,
    } = await parse(serializedManifestObject, baseUrl);
    return { manifest, serializedManifest, baseUrl: finalBaseUrl };
}
