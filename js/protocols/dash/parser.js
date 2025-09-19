import { adaptDashToIr } from './adapter.js';

/**
 * Resolves all xlink:href attributes within a given root element.
 * This function mutates the element in place.
 * @param {Element} rootElement The element to scan for xlinks (e.g., the <MPD> element).
 * @param {string} documentUrl The URL of the document containing the rootElement, for resolving relative links.
 * @param {Set<string>} visitedUrls A set to track visited URLs and prevent circular references.
 */
async function resolveXlinks(rootElement, documentUrl, visitedUrls) {
    const XLINK_NS = 'http://www.w3.org/1999/xlink';
    // Find all links that haven't been processed yet.
    let linksToResolve = Array.from(
        rootElement.querySelectorAll(`[*|href]:not([data-xlink-resolved])`)
    );

    // Keep resolving until no new unprocessed links are found. This handles nested xlinks.
    while (linksToResolve.length > 0) {
        const promises = linksToResolve.map(async (linkEl) => {
            // Mark as processed to avoid infinite loops in the same pass
            linkEl.setAttribute('data-xlink-resolved', 'true');

            const href = linkEl.getAttributeNS(XLINK_NS, 'href');
            if (!href) return;

            const remoteUrl = new URL(href, documentUrl).href;

            // Circular reference guard
            if (visitedUrls.has(remoteUrl)) {
                console.warn(
                    `Circular xlink reference detected and skipped: ${remoteUrl}`
                );
                return; // Stop processing this link
            }
            visitedUrls.add(remoteUrl);

            try {
                const response = await fetch(remoteUrl);
                if (!response.ok) {
                    throw new Error(
                        `HTTP Error ${response.status} fetching remote element`
                    );
                }
                const fragmentString = await response.text();
                const fragmentDoc = new DOMParser().parseFromString(
                    fragmentString,
                    'application/xml'
                );

                if (fragmentDoc.querySelector('parsererror')) {
                    throw new Error('Invalid XML in remote fragment');
                }

                const parent = linkEl.parentNode;
                const nodesToInsert = Array.from(
                    fragmentDoc.documentElement.childNodes
                );

                if (
                    nodesToInsert.length === 0 ||
                    (nodesToInsert.length === 1 &&
                        nodesToInsert[0].nodeType !== Node.ELEMENT_NODE)
                ) {
                    console.warn(
                        `xlink:href to ${remoteUrl} resolved to an empty document. Keeping original element.`
                    );
                    linkEl.removeAttributeNS(XLINK_NS, 'href');
                } else {
                    for (const node of nodesToInsert) {
                        const importedNode =
                            rootElement.ownerDocument.importNode(node, true);
                        parent.insertBefore(importedNode, linkEl);
                    }
                    parent.removeChild(linkEl);
                }
            } catch (error) {
                console.error(
                    `Failed to resolve xlink:href="${href}": ${error.message}. Keeping original element.`
                );
                linkEl.removeAttributeNS(XLINK_NS, 'href');
            }
        });

        await Promise.all(promises);

        linksToResolve = Array.from(
            rootElement.querySelectorAll(`[*|href]:not([data-xlink-resolved])`)
        );
    }

    rootElement
        .querySelectorAll('[data-xlink-resolved]')
        .forEach((el) => el.removeAttribute('data-xlink-resolved'));
}

/**
 * Parses a DASH Manifest XML string and returns a protocol-agnostic Intermediate Representation.
 * @param {string} xmlString The raw MPD XML.
 * @param {string} baseUrl The URL from which the MPD was fetched.
 * @returns {Promise<{manifest: import('../../state.js').Manifest, baseUrl: string}>}
 */
export async function parseManifest(xmlString, baseUrl) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'application/xml');

    if (xmlDoc.querySelector('parsererror')) {
        throw new Error('Invalid XML. Check console for details.');
    }
    const manifestElement = xmlDoc.querySelector('MPD');
    if (!manifestElement) {
        throw new Error('No <MPD> element found in the document.');
    }

    await resolveXlinks(manifestElement, baseUrl, new Set([baseUrl]));

    const manifestBaseElement = manifestElement.querySelector(':scope > BaseURL');
    if (manifestBaseElement && manifestBaseElement.textContent) {
        baseUrl = new URL(manifestBaseElement.textContent, baseUrl).href;
    }

    const manifest = adaptDashToIr(manifestElement);
    return { manifest, baseUrl };
}