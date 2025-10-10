import { DOMParser, XMLSerializer } from 'xmldom';
import * as xpath from 'xpath';

/**
 * Applies an RFC 5261 XML patch to a source XML document.
 * @param {string} sourceXml - The original XML string.
 * @param {string} patchXml - The patch XML string.
 * @returns {string} The new, patched XML string.
 */
export function applyXmlPatch(sourceXml, patchXml) {
    const domParser = new DOMParser();
    const serializer = new XMLSerializer();

    const sourceDoc = domParser.parseFromString(sourceXml, 'application/xml');
    const patchDoc = domParser.parseFromString(patchXml, 'application/xml');

    const patchOps = Array.from(patchDoc.documentElement.childNodes).filter(
        (n) => n.nodeType === 1
    );

    const select = xpath.useNamespaces({ d: 'urn:mpeg:dash:schema:mpd:2011' });

    for (const op of patchOps) {
        const selector = /** @type {Element} */ (op).getAttribute('sel');
        if (!selector) continue;

        const targets = select(selector, sourceDoc);
        if (!Array.isArray(targets)) {
            continue;
        }

        for (const target of targets) {
            if (typeof target !== 'object' || !target.nodeType) {
                continue;
            }
            const targetNode = /** @type {Node} */ (target);

            switch (op.nodeName) {
                case 'add': {
                    const content = op.firstChild;
                    if (
                        content &&
                        targetNode.nodeType === 1 /* ELEMENT_NODE */
                    ) {
                        /** @type {Element} */ (targetNode).appendChild(
                            content.cloneNode(true)
                        );
                    }
                    break;
                }
                case 'replace': {
                    const content = op.firstChild;
                    if (content && targetNode.parentNode) {
                        targetNode.parentNode.replaceChild(
                            content.cloneNode(true),
                            targetNode
                        );
                    }
                    break;
                }
                case 'remove': {
                    if (targetNode.parentNode) {
                        targetNode.parentNode.removeChild(targetNode);
                    }
                    break;
                }
            }
        }
    }

    return serializer.serializeToString(sourceDoc);
}
