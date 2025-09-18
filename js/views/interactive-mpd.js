import { html, nothing } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { mpdTooltipData } from '../helpers/tooltip-data.js';

const escapeHtml = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const getTagHTML = (tagName) => {
    const isClosing = tagName.startsWith('/');
    const cleanTagName = isClosing ? tagName.substring(1) : tagName;
    const tagInfo = mpdTooltipData[cleanTagName];
    const tagClass = 'interactive-xml-tag';
    const tooltipAttrs = tagInfo ? `data-tooltip="${escapeHtml(tagInfo.text)}" data-iso="${escapeHtml(tagInfo.isoRef)}"` : '';
    return unsafeHTML(`&lt;${isClosing ? '/' : ''}<span class="${tagClass}" ${tooltipAttrs}>${cleanTagName}</span>`);
};

const getAttributeHTML = (tagName, attr) => {
    const attrKey = `${tagName}@${attr.name}`;
    const attrInfo = mpdTooltipData[attrKey];
    const nameClass = 'interactive-xml-attr-name';
    const valueClass = 'interactive-xml-attr-value';
    const tooltipAttrs = attrInfo ? `data-tooltip="${escapeHtml(attrInfo.text)}" data-iso="${escapeHtml(attrInfo.isoRef)}"` : '';
    return unsafeHTML(`<span class="${nameClass}" ${tooltipAttrs}>${attr.name}</span>=<span class="${valueClass}">"${escapeHtml(attr.value)}"</span>`);
};

export function getInteractiveMpdTemplate(mpd) {
    if (!mpd) return html`<p class="warn">No MPD loaded to display.</p>`;
    
    // This function recursively builds the template, managing indentation and newlines correctly for the <pre> tag.
    const preformatted = (node, depth = 0) => {
        const indent = '  '.repeat(depth);
        switch (node.nodeType) {
            case Node.ELEMENT_NODE: {
                 const el = /** @type {Element} */ (node);
                 const childNodes = Array.from(el.childNodes);
                 // Filter out empty text nodes to correctly identify childless elements
                 const meaningfulChildren = childNodes.filter(n => n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && n.textContent.trim()));

                 if (meaningfulChildren.length > 0) {
                     return html`${indent}${getTagHTML(el.tagName)}${Array.from(el.attributes).map(a => html` ${getAttributeHTML(el.tagName, a)}`)}&gt;\n${childNodes.map(c => preformatted(c, depth + 1))}${indent}${getTagHTML(`/${el.tagName}`)}&gt;\n`;
                 } else {
                     return html`${indent}${getTagHTML(el.tagName)}${Array.from(el.attributes).map(a => html` ${getAttributeHTML(el.tagName, a)}`)} /&gt;\n`;
                 }
            }
            case Node.TEXT_NODE: {
                 return node.textContent.trim() ? html`${indent}<span class="interactive-xml-text">${escapeHtml(node.textContent.trim())}</span>\n` : nothing;
            }
            case Node.COMMENT_NODE: {
                 return html`${indent}<span class="interactive-xml-comment">&lt;!--${escapeHtml(node.textContent)}--&gt;</span>\n`;
            }
            default:
                return nothing;
        }
    };
    
    return html`<div class="interactive-mpd-container"><pre><code>${preformatted(mpd)}</code></pre></div>`;
}