import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { dashTooltipData } from './tooltip-data.js';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { useUiStore, uiActions } from '@/state/uiStore';
import { debugLog } from '@/shared/utils/debug';

const linesPerPage = 500;

const onPageChange = (offset, totalPages) => {
    const { interactiveManifestCurrentPage } = useUiStore.getState();
    const newPage = interactiveManifestCurrentPage + offset;
    if (newPage >= 1 && newPage <= totalPages) {
        uiActions.setInteractiveManifestPage(newPage);
    }
};

const escapeHtml = (str) => {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
};

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
        dynamicClasses =
            'cursor-help bg-red-900/50 border-b border-dotted border-red-400/70';
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

    let dynamicClasses = '';
    let tooltipAttrs = '';

    if (attrInfo) {
        // Specific tooltip found, use it.
        dynamicClasses = tooltipTriggerClasses;
        tooltipAttrs = `data-tooltip="${escapeHtml(
            attrInfo.text
        )}" data-iso="${escapeHtml(attrInfo.isoRef)}"`;
    } else if (attr.name.startsWith('xmlns')) {
        // No specific tooltip, but it's an xmlns attribute, so provide a generic one.
        const isDefault = attr.name === 'xmlns';
        const prefix = isDefault
            ? 'Default'
            : `Prefixed ('${attr.name.split(':')[1]}')`;
        const tooltipText = `XML Namespace Declaration (${prefix}). This attribute associates a prefix (or the default) with a unique URI ('${attr.value}') to prevent naming conflicts between elements from different XML vocabularies.`;
        const isoRef = 'W3C XML Namespaces';
        dynamicClasses = tooltipTriggerClasses;
        tooltipAttrs = `data-tooltip="${escapeHtml(
            tooltipText
        )}" data-iso="${escapeHtml(isoRef)}"`;
    } else {
        // No specific tooltip and not an xmlns attribute, show "missing" warning.
        dynamicClasses =
            'cursor-help bg-red-900/50 border-b border-dotted border-red-400/70';
        tooltipAttrs = `data-tooltip="Tooltip definition missing for '${attr.name}' on &lt;${tagName}&gt;"`;
    }

    return `<span class="${nameClass} ${dynamicClasses}" ${tooltipAttrs}>${
        attr.name
    }</span>="<span class="${valueClass}">${escapeHtml(attr.value)}</span>"`;
};

const countLinesRecursive = (node) => {
    if (
        !node ||
        (node.nodeType !== Node.ELEMENT_NODE &&
            node.nodeType !== Node.TEXT_NODE &&
            node.nodeType !== Node.COMMENT_NODE)
    )
        return 0;
    if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) return 0;
    if (node.nodeType !== Node.ELEMENT_NODE) return 1;

    let count = 1; // Opening tag
    const el = /** @type {Element} */ (node);
    const childNodes = Array.from(el.childNodes).filter(
        (n) =>
            n.nodeType === Node.ELEMENT_NODE ||
            n.nodeType === Node.COMMENT_NODE ||
            (n.nodeType === Node.TEXT_NODE && n.textContent.trim())
    );

    if (childNodes.length > 0) {
        count += childNodes.reduce(
            (sum, child) => sum + countLinesRecursive(child),
            0
        );
        count += 1; // Closing tag
    }
    return count;
};

const generatePageLinesRecursive = (node, depth, context) => {
    if (
        !node ||
        (node.nodeType !== Node.ELEMENT_NODE &&
            node.nodeType !== Node.TEXT_NODE &&
            node.nodeType !== Node.COMMENT_NODE)
    )
        return;
    if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) return;

    if (context.lines.length >= linesPerPage) return;

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
            const hasChildren = childNodes.length > 0;
            const attrs = Array.from(el.attributes)
                .map((a) => ` ${getAttributeHTML(el.tagName, a)}`)
                .join('');

            context.currentLine++;
            if (
                context.currentLine > context.startLine &&
                context.currentLine <= context.endLine
            ) {
                const openingTag = `${indent}${getTagHTML(el.tagName)}${attrs}${
                    !hasChildren ? ' /' : ''
                }&gt;`;
                context.lines.push(openingTag);
            }

            if (hasChildren) {
                for (const child of childNodes) {
                    if (context.lines.length >= linesPerPage) break;
                    generatePageLinesRecursive(child, depth + 1, context);
                }

                if (context.lines.length < linesPerPage) {
                    context.currentLine++;
                    if (
                        context.currentLine > context.startLine &&
                        context.currentLine <= context.endLine
                    ) {
                        const closingTag = `${indent}${getTagHTML(
                            `/${el.tagName}`
                        )}&gt;`;
                        context.lines.push(closingTag);
                    }
                }
            }
            break;
        }
        case Node.TEXT_NODE:
        case Node.COMMENT_NODE: {
            context.currentLine++;
            if (
                context.currentLine > context.startLine &&
                context.currentLine <= context.endLine
            ) {
                let line;
                if (node.nodeType === Node.TEXT_NODE) {
                    line = `${indent}<span class="text-gray-200">${escapeHtml(
                        node.textContent.trim()
                    )}</span>`;
                } else {
                    line = `${indent}<span class="text-gray-500 italic">&lt;!--${escapeHtml(
                        node.textContent
                    )}--&gt;</span>`;
                }
                context.lines.push(line);
            }
            break;
        }
    }
};

export const dashManifestTemplate = (stream, currentPage) => {
    const hasUpdates =
        stream.manifestUpdates && stream.manifestUpdates.length > 0;
    const manifestStringToDisplay = hasUpdates
        ? stream.manifestUpdates[stream.activeManifestUpdateIndex].rawManifest
        : stream.rawManifest;

    debugLog(
        'DashRenderer',
        'dashManifestTemplate called.',
        'Stream has updates:',
        hasUpdates,
        'Active update index:',
        stream.activeManifestUpdateIndex,
        'Manifest string length:',
        manifestStringToDisplay.length
    );

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(
        manifestStringToDisplay,
        'application/xml'
    );
    const parserError = xmlDoc.querySelector('parsererror');

    if (parserError) {
        debugLog(
            'DashRenderer',
            'XML parsing failed.',
            parserError.textContent
        );
        console.error('XML Parsing Error:', parserError.textContent);
        return html`<div class="text-red-400 p-4 font-mono">
            <p class="font-bold">Failed to parse manifest XML.</p>
            <pre class="mt-2 bg-gray-900 p-2 rounded">
${parserError.textContent}</pre
            >
        </div>`;
    }

    const manifestElement = xmlDoc.querySelector('MPD');

    if (!manifestElement) {
        debugLog('DashRenderer', '<MPD> element not found.');
        return html`<div class="text-red-400 p-4">
            Error: &lt;MPD&gt; root element not found in the manifest.
        </div>`;
    }

    const totalLines = countLinesRecursive(manifestElement);
    const totalPages = Math.ceil(totalLines / linesPerPage);
    const startLine = (currentPage - 1) * linesPerPage;
    const endLine = startLine + linesPerPage;

    const renderContext = {
        lines: [],
        currentLine: 0,
        startLine,
        endLine,
    };
    generatePageLinesRecursive(manifestElement, 0, renderContext);
    const visibleLines = renderContext.lines;
    debugLog(
        'DashRenderer',
        `Total lines: ${totalLines}. Generated ${visibleLines.length} lines for page ${currentPage}.`
    );

    const paginationControls =
        totalPages > 1
            ? html` <div class="text-center text-sm text-gray-400 mt-4">
                  <button
                      @click=${() => onPageChange(-1, totalPages)}
                      ?disabled=${currentPage === 1}
                      class="px-3 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-2"
                  >
                      &larr; Previous
                  </button>
                  <span
                      >Page ${currentPage} of ${totalPages} (Lines
                      ${startLine + 1}-${Math.min(endLine, totalLines)})</span
                  >
                  <button
                      @click=${() => onPageChange(1, totalPages)}
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
                            class="text-right text-gray-500 pr-4 select-none shrink-0 w-12"
                            >${startLine + i + 1}</span
                        >
                        <span class="grow whitespace-pre-wrap break-all"
                            >${unsafeHTML(line)}</span
                        >
                    </div>
                `
            )}
        </div>
        ${paginationControls}
    `;
};
