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
                // Note: The spec allows a fragment to contain multiple top-level elements.
                // DOMParser will typically have a single root, so we import its children.
                const nodesToInsert = Array.from(
                    fragmentDoc.documentElement.childNodes
                );

                if (
                    nodesToInsert.length === 0 ||
                    (nodesToInsert.length === 1 &&
                        nodesToInsert[0].nodeType !== Node.ELEMENT_NODE)
                ) {
                    // Per spec, if the remote element is empty, remove xlink attributes and keep the original element.
                    console.warn(
                        `xlink:href to ${remoteUrl} resolved to an empty document. Keeping original element.`
                    );
                    linkEl.removeAttributeNS(XLINK_NS, 'href');
                } else {
                    // Replace the original link element with the new nodes
                    for (const node of nodesToInsert) {
                        // Must import the node into the main document to append it
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
                // Per spec, on failure, treat as an invalid reference by removing xlink attributes.
                linkEl.removeAttributeNS(XLINK_NS, 'href');
            }
        });

        await Promise.all(promises);

        // Look for new links that might have been inserted by the previous resolution pass
        linksToResolve = Array.from(
            rootElement.querySelectorAll(`[*|href]:not([data-xlink-resolved])`)
        );
    }

    // Cleanup helper attributes
    rootElement
        .querySelectorAll('[data-xlink-resolved]')
        .forEach((el) => el.removeAttribute('data-xlink-resolved'));
}

/**
 * Parses an MPD XML string, resolves all xlink:href attributes, and returns the complete MPD.
 * @param {string} xmlString The raw MPD XML.
 * @param {string} baseUrl The URL from which the MPD was fetched.
 * @returns {Promise<{mpd: Element, baseUrl: string}>}
 */
export async function parseMpd(xmlString, baseUrl) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'application/xml');

    if (xmlDoc.querySelector('parsererror')) {
        throw new Error('Invalid XML. Check console for details.');
    }
    const mpd = xmlDoc.querySelector('MPD');
    if (!mpd) {
        throw new Error('No <MPD> element found in the document.');
    }

    // Resolve all remote elements. Pass the initial MPD URL to the visited set.
    await resolveXlinks(mpd, baseUrl, new Set([baseUrl]));

    // Determine the final effective base URL after all parsing and resolution is complete
    const mpdBaseElement = mpd.querySelector(':scope > BaseURL');
    if (mpdBaseElement && mpdBaseElement.textContent) {
        baseUrl = new URL(mpdBaseElement.textContent, baseUrl).href;
    }

    return { mpd, baseUrl };
}
