import { html, render } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { dashTooltipData } from './tooltip-data.js';
import { tooltipTriggerClasses } from '../../../../../shared/constants.js';

// --- MODULE STATE FOR VIRTUALIZATION ---
let currentPage = 1;
const linesPerPage = 500;
let lastRenderedManifestString = null;

const onPageChange = (offset, stream, totalPages) => {
    const newPage = currentPage + offset;
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        const container = document.getElementById('tab-interactive-manifest');
        // Re-render the template to update the view
        render(dashManifestTemplate(stream), container);
    }
};

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
    const [prefix, localName] = cleanTagName.includes(':')
        ? cleanTagName.split(':')
        : [null, cleanTagName];
    const displayPrefix = prefix
        ? `<span class="text-gray-400">${prefix}:</span>`
        : '';
    const tagClass =
        'text-blue-300 rounded-sm px-1 -mx-1 transition-colors hover:bg-slate-700';

    let dynamicClasses = '';
    let tooltipAttrs = '';

    if (tagInfo) {
        dynamicClasses = tooltipTriggerClasses;
        tooltipAttrs = `data-tooltip="${escapeHtml(
            tagInfo.text
        )}" data-iso="${escapeHtml(tagInfo.isoRef)}"`;
    } else {
        dynamicClasses = 'cursor-help bg-red-900/50 missing-tooltip-trigger';
        tooltipAttrs = `data-tooltip="No definition for &lt;${cleanTagName}&gt;"`;
    }

    return `&lt;${
        isClosing ? '/' : ''
    }<span class="${dynamicClasses}" ${tooltipAttrs}>${displayPrefix}<span class="${tagClass}">${localName}</span></span>`;
};

const getAttributeHTML = (tagName, attr) => {
    const attrKey = `${tagName}@${attr.name}`;
    const attrInfo = dashTooltipData[attrKey];
    const nameClass =
        'text-emerald-300 rounded-sm px-1 -mx-1 transition-colors hover:bg-slate-700';
    const valueClass = 'text-yellow-300';
    const isIgnoredAttr = ['xmlns', 'xmlns:xsi', 'xsi:schemaLocation'].includes(
        attr.name
    );

    let dynamicClasses = '';
    let tooltipAttrs = '';

    if (attrInfo) {
        dynamicClasses = tooltipTriggerClasses;
        tooltipAttrs = `data-tooltip="${escapeHtml(
            attrInfo.text
        )}" data-iso="${escapeHtml(attrInfo.isoRef)}"`;
    } else if (!isIgnoredAttr) {
        dynamicClasses = 'cursor-help bg-red-900/50 missing-tooltip-trigger';
        tooltipAttrs = `data-tooltip="Tooltip definition missing for '${attr.name}' on &lt;${tagName}&gt;"`;
    }

    return `<span class="${nameClass} ${dynamicClasses}" ${tooltipAttrs}>${
        attr.name
    }</span>="<span class="${valueClass}">${escapeHtml(attr.value)}</span>"`;
};

const preformattedDash = (node, depth = 0) => {
    if (!node || typeof node.nodeType === 'undefined') {
        return [];
    }
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

export const dashManifestTemplate = (stream) => {
    // Determine which manifest string to display
    const hasUpdates =
        stream.manifestUpdates && stream.manifestUpdates.length > 0;
    const manifestStringToDisplay = hasUpdates
        ? stream.manifestUpdates[stream.activeManifestUpdateIndex].rawManifest
        : stream.rawManifest;

    // On-demand parsing for the view. This is NOT cached on the stream object
    // to ensure updates are reflected.
    let manifestElement;
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(
        manifestStringToDisplay,
        'application/xml'
    );
    const parserError = xmlDoc.querySelector('parsererror');

    if (parserError) {
        console.error('XML Parsing Error:', parserError.textContent);
        return html`<div class="text-red-400 p-4 font-mono">
            <p class="font-bold">Failed to parse manifest XML.</p>
            <pre class="mt-2 bg-gray-900 p-2 rounded">
${parserError.textContent}</pre
            >
        </div>`;
    }

    manifestElement = xmlDoc.querySelector('MPD');

    if (!manifestElement) {
        return html`<div class="text-red-400 p-4">
            Error: &lt;MPD&gt; root element not found in the manifest.
        </div>`;
    }

    const allLines = preformattedDash(manifestElement);
    const totalPages = Math.ceil(allLines.length / linesPerPage);

    if (manifestStringToDisplay !== lastRenderedManifestString) {
        currentPage = 1;
        lastRenderedManifestString = manifestStringToDisplay;
    }

    const startLine = (currentPage - 1) * linesPerPage;
    const endLine = startLine + linesPerPage;
    const visibleLines = allLines.slice(startLine, endLine);

    const paginationControls =
        totalPages > 1
            ? html` <div class="text-center text-sm text-gray-400 mt-4">
                  <button
                      @click=${() => onPageChange(-1, stream, totalPages)}
                      ?disabled=${currentPage === 1}
                      class="px-3 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-2"
                  >
                      &larr; Previous
                  </button>
                  <span
                      >Page ${currentPage} of ${totalPages} (Lines
                      ${startLine + 1}-${Math.min(
                          endLine,
                          allLines.length
                      )})</span
                  >
                  <button
                      @click=${() => onPageChange(1, stream, totalPages)}
                      ?disabled=${currentPage === totalPages}
                      class="px-3 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-2"
                  >
                      Next &rarr;
                  </button>
              </div>`
            : '';

    return html`
        <div
            class="bg-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto"
        >
            ${visibleLines.map(
                (line, i) => html`
                    <div class="flex">
                        <span
                            class="text-right text-gray-500 pr-4 select-none flex-shrink-0 w-12"
                            >${startLine + i + 1}</span
                        >
                        <span class="flex-grow whitespace-pre-wrap break-all"
                            >${unsafeHTML(line)}</span
                        >
                    </div>
                `
            )}
        </div>
        ${paginationControls}
    `;
};
