import { html, nothing } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { mpdTooltipData } from '../helpers/tooltip-data.js';

const escapeHtml = (str) =>
    str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

const getTagHTML = (tagName) => {
    const isClosing = tagName.startsWith('/');
    const cleanTagName = isClosing ? tagName.substring(1) : tagName;
    const tagInfo = mpdTooltipData[cleanTagName];
    const tagClass = 'interactive-xml-tag';
    const tooltipAttrs = tagInfo
        ? `data-tooltip="${escapeHtml(tagInfo.text)}" data-iso="${escapeHtml(
              tagInfo.isoRef
          )}"`
        : '';
    return unsafeHTML(
        `&lt;${
            isClosing ? '/' : ''
        }<span class="${tagClass}" ${tooltipAttrs}>${cleanTagName}</span>`
    );
};

const getAttributeHTML = (tagName, attr) => {
    const attrKey = `${tagName}@${attr.name}`;
    const attrInfo = mpdTooltipData[attrKey];
    const nameClass = 'interactive-xml-attr-name';
    const valueClass = 'interactive-xml-attr-value';
    const tooltipAttrs = attrInfo
        ? `data-tooltip="${escapeHtml(attrInfo.text)}" data-iso="${escapeHtml(
              attrInfo.isoRef
          )}"`
        : '';
    return unsafeHTML(
        `<span class="${nameClass}" ${tooltipAttrs}>${
            attr.name
        }</span>=<span class="${valueClass}">"${escapeHtml(
            attr.value
        )}"</span>`
    );
};

export function getInteractiveMpdTemplate(mpd) {
    if (!mpd) return html`<p class="warn">No MPD loaded to display.</p>`;

    // This function recursively builds the template, managing indentation and newlines correctly for the <pre> tag.
    const preformatted = (node, depth = 0) => {
        const indent = '  '.repeat(depth);
        switch (node.nodeType) {
            case Node.ELEMENT_NODE: {
                const el = /** @type {Element} */ (node);
                // Filter out insignificant whitespace to prevent rendering artifacts.
                const childNodes = Array.from(el.childNodes).filter(
                    (n) =>
                        n.nodeType === Node.ELEMENT_NODE ||
                        n.nodeType === Node.COMMENT_NODE ||
                        (n.nodeType === Node.TEXT_NODE && n.textContent.trim())
                );

                if (childNodes.length > 0) {
                    return html`${indent}${getTagHTML(el.tagName)}${Array.from(
                        el.attributes
                    ).map((a) => html` ${getAttributeHTML(el.tagName, a)}`)}&gt;
${childNodes.map((c) => preformatted(c, depth + 1))}${indent}${getTagHTML(
                        `/${el.tagName}`
                    )}&gt;
`;
                } else {
                    return html`${indent}${getTagHTML(el.tagName)}${Array.from(
                        el.attributes
                    ).map((a) => html` ${getAttributeHTML(el.tagName, a)}`)} /&gt;
`;
                }
            }
            case Node.TEXT_NODE: {
                // This is now only called for non-empty text nodes due to the filter above.
                return html`${indent}<span class="interactive-xml-text"
>${escapeHtml(node.textContent.trim())}</span
>
`;
            }
            case Node.COMMENT_NODE: {
                return html`${indent}<span class="interactive-xml-comment"
>&lt;!--${escapeHtml(node.textContent)}--&gt;</span
>
`;
            }
            default:
                return nothing;
        }
    };

    // The entire output is now a single template literal, which preserves newlines between recursive calls.
    const fullTemplate = html`${preformatted(mpd)}`;

    return html`<div class="interactive-mpd-container">
<pre><code>${fullTemplate}</code></pre>
    </div>`;
}