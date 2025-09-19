import { html, nothing } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { mpdTooltipData } from '../helpers/tooltip-data.js';
import { tooltipTriggerClasses } from '../ui.js';

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
    const tagClass =
        'text-blue-300 rounded-sm px-1 -mx-1 transition-colors hover:bg-slate-700';
    const tooltipAttrs = tagInfo
        ? `data-tooltip="${escapeHtml(tagInfo.text)}" data-iso="${escapeHtml(
              tagInfo.isoRef
          )}"`
        : '';
    return unsafeHTML(
        `&lt;${
            isClosing ? '/' : ''
        }<span class="${tagClass} ${
            tagInfo ? tooltipTriggerClasses : ''
        }" ${tooltipAttrs}>${cleanTagName}</span>`
    );
};

const getAttributeHTML = (tagName, attr) => {
    const attrKey = `${tagName}@${attr.name}`;
    const attrInfo = mpdTooltipData[attrKey];
    const nameClass =
        'text-emerald-300 rounded-sm px-1 -mx-1 transition-colors hover:bg-slate-700';
    const valueClass = 'text-yellow-300';
    const tooltipAttrs = attrInfo
        ? `data-tooltip="${escapeHtml(attrInfo.text)}" data-iso="${escapeHtml(
              attrInfo.isoRef
          )}"`
        : '';
    return unsafeHTML(
        `<span class="${nameClass} ${
            attrInfo ? tooltipTriggerClasses : ''
        }" ${tooltipAttrs}>${
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
                return html`${indent}<span class="text-gray-200"
>${escapeHtml(node.textContent.trim())}</span
>
`;
            }
            case Node.COMMENT_NODE: {
                return html`${indent}<span class="text-gray-500 italic"
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

    return html`<div
        class="bg-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto"
    >
        <pre class="m-0 p-0 whitespace-pre"><code>${fullTemplate}</code></pre>
    </div>`;
}