import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { dashTooltipData } from './tooltip-data.js';
import { tooltipTriggerClasses } from '../../shared/constants.js';

const escapeHtml = (str) =>
    str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

const getTagHTML = (tagName) => {
    const isClosing = tagName.startsWith('/');
    const cleanTagName = isClosing ? tagName.substring(1) : tagName;
    const tagInfo = dashTooltipData[cleanTagName];
    const tagClass =
        'text-blue-300 rounded-sm px-1 -mx-1 transition-colors hover:bg-slate-700';
    const tooltipAttrs = tagInfo
        ? `data-tooltip="${escapeHtml(tagInfo.text)}" data-iso="${escapeHtml(
              tagInfo.isoRef
          )}"`
        : '';
    return `&lt;${
        isClosing ? '/' : ''
    }<span class="${tagClass} ${
        tagInfo ? tooltipTriggerClasses : ''
    }" ${tooltipAttrs}>${cleanTagName}</span>`;
};

const getAttributeHTML = (tagName, attr) => {
    const attrKey = `${tagName}@${attr.name}`;
    const attrInfo = dashTooltipData[attrKey];
    const nameClass =
        'text-emerald-300 rounded-sm px-1 -mx-1 transition-colors hover:bg-slate-700';
    const valueClass = 'text-yellow-300';
    const tooltipAttrs = attrInfo
        ? `data-tooltip="${escapeHtml(attrInfo.text)}" data-iso="${escapeHtml(
              attrInfo.isoRef
          )}"`
        : '';
    return `<span class="${nameClass} ${
        attrInfo ? tooltipTriggerClasses : ''
    }" ${tooltipAttrs}>${
        attr.name
    }</span>=<span class="${valueClass}">"${escapeHtml(attr.value)}"</span>`;
};

const preformattedDash = (node, depth = 0) => {
    const indent = '  '.repeat(depth);
    switch (node.nodeType) {
        case Node.ELEMENT_NODE: {
            const el = /** @type {Element} */ (node);
            const childNodes = Array.from(el.childNodes).filter(
                (n) =>
                    n.nodeType === Node.ELEMENT_NODE ||
                    n.nodeType === Node.COMMENT_NODE ||
                    (n.nodeType === Node.TEXT_NODE && n.textContent.trim())
            );

            const attrs = Array.from(el.attributes)
                .map((a) => ` ${getAttributeHTML(el.tagName, a)}`)
                .join('');

            if (childNodes.length > 0) {
                const openingTag = `${indent}${getTagHTML(
                    el.tagName
                )}${attrs}&gt;`;
                const childLines = childNodes.flatMap((c) =>
                    preformattedDash(c, depth + 1)
                );
                const closingTag = `${indent}${getTagHTML(
                    `/${el.tagName}`
                )}&gt;`;
                return [openingTag, ...childLines, closingTag];
            } else {
                return [`${indent}${getTagHTML(el.tagName)}${attrs} /&gt;`];
            }
        }
        case Node.TEXT_NODE: {
            return [
                `${indent}<span class="text-gray-200">${escapeHtml(
                    node.textContent.trim()
                )}</span>`,
            ];
        }
        case Node.COMMENT_NODE: {
            return [
                `${indent}<span class="text-gray-500 italic">&lt;!--${escapeHtml(
                    node.textContent
                )}--&gt;</span>`,
            ];
        }
        default:
            return [];
    }
};

export const dashManifestTemplate = (manifestElement) => {
    const lines = preformattedDash(manifestElement);
    return html`
        <h3 class="text-xl font-bold mb-2">Interactive Manifest</h3>
        <div
            class="bg-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto"
        >
            ${lines.map(
                (line, i) => html`
                    <div class="flex">
                        <span
                            class="text-right text-gray-500 pr-4 select-none flex-shrink-0 w-10"
                            >${i + 1}</span
                        >
                        <span class="flex-grow whitespace-pre-wrap break-all"
                            >${unsafeHTML(line)}</span
                        >
                    </div>
                `
            )}
        </div>
    `;
};