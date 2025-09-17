import { mpdTooltipData } from '../helpers/tooltip-data.js';

/**
 * Creates an interactive HTML representation of the MPD with tooltips.
 * This version directly traverses the parsed XML DOM, which is more robust than regex or string manipulation.
 * @param {Element} mpd The root MPD element.
 * @returns {string} The HTML string.
 */
export function getInteractiveMpdHTML(mpd) {
    if (!mpd) {
        return '<p class="warn">No MPD loaded to display.</p>';
    }

    const html = buildHtmlFromNode(mpd, 0);

    return `<div class="interactive-mpd-container"><pre><code>${html}</code></pre></div>`;
}

/**
 * Recursively builds an HTML string from an XML node, adding interactive tooltips.
 * @param {Node} node The XML node to process.
 * @param {number} depth The current indentation level.
 * @returns {string} The generated HTML for this node and its children.
 */
function buildHtmlFromNode(node, depth) {
    const indent = '  '.repeat(depth);
    let html = '';

    switch (node.nodeType) {
        case Node.ELEMENT_NODE:
            const el = /** @type {Element} */ (node);
            const tagName = el.tagName;
            
            const tagInfo = mpdTooltipData[tagName];
            const tagHtml = tagInfo 
                ? `<span class="interactive-xml-tag" data-tooltip="${escapeHtml(tagInfo.text)}" data-iso="${escapeHtml(tagInfo.isoRef)}">&lt;${tagName}</span>`
                : `<span class="interactive-xml-tag">&lt;${tagName}</span>`;
            
            html += `${indent}${tagHtml}`;

            // Process attributes
            for (const attr of Array.from(el.attributes)) {
                const attrKey = `${tagName}@${attr.name}`;
                const attrInfo = mpdTooltipData[attrKey];
                const attrNameHtml = attrInfo
                    ? `<span class="interactive-xml-attr-name" data-tooltip="${escapeHtml(attrInfo.text)}" data-iso="${escapeHtml(attrInfo.isoRef)}">${attr.name}</span>`
                    : `<span class="interactive-xml-attr-name">${attr.name}</span>`;
                html += ` ${attrNameHtml}=<span class="interactive-xml-attr-value">"${escapeHtml(attr.value)}"</span>`;
            }

            // Check for child ELEMENT nodes to decide closing tag style
            const hasChildElements = Array.from(el.childNodes).some(n => n.nodeType === Node.ELEMENT_NODE);

            if (hasChildElements) {
                html += `&gt;\n`;
                for (const child of Array.from(el.childNodes)) {
                    html += buildHtmlFromNode(child, depth + 1);
                }
                html += `${indent}&lt;/${tagName}&gt;\n`;
            } else if (el.childNodes.length > 0 && el.textContent.trim()) {
                 // Handles elements with only text content like <Title>My Movie</Title>
                html += `&gt;${escapeHtml(el.textContent.trim())}&lt;/${tagName}&gt;\n`;
            } else {
                // Self-closing tag for elements with no children
                html += ` /&gt;\n`;
            }
            break;

        case Node.COMMENT_NODE:
            html += `${indent}<span class="interactive-xml-comment">&lt;!--${escapeHtml(node.textContent)}--&gt;</span>\n`;
            break;
            
        // Text nodes with only whitespace are ignored to create a "pretty-print" effect
        case Node.TEXT_NODE:
            if (node.textContent.trim()) {
                html += `${indent}${escapeHtml(node.textContent.trim())}\n`;
            }
            break;
    }
    return html;
}

/**
 * Escapes HTML special characters for safe rendering inside attributes or text content.
 * @param {string | null} str The string to escape.
 * @returns {string} The escaped string.
 */
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}