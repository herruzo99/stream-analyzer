import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { dashTooltipData } from '../views/interactive-manifest/components/dash/tooltip-data.js';
import { tooltipTriggerClasses } from '../../shared/constants.js';

const highlightColors = {
    fail: 'bg-red-900/60',
    warn: 'bg-yellow-900/60',
    pass: 'bg-green-900/50',
};

const escapeHtml = (str) =>
    str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

const getTagHTML = (tagName, path, complianceResults) => {
    const isClosing = tagName.startsWith('/');
    const cleanTagName = isClosing ? tagName.substring(1) : tagName;
    const tagInfo = dashTooltipData[cleanTagName];
    const [prefix, localName] = cleanTagName.includes(':')
        ? cleanTagName.split(':')
        : [null, cleanTagName];
    const displayPrefix = prefix
        ? `<span class="text-gray-400">${prefix}:</span>`
        : '';
    const tagClass = 'text-blue-300';
    let tooltipAttrs = tagInfo
        ? `data-tooltip="${escapeHtml(tagInfo.text)}" data-iso="${escapeHtml(
              tagInfo.isoRef
          )}"`
        : `data-tooltip="No definition for &lt;${cleanTagName}&gt;"`;

    // Compliance highlighting overrides standard tooltips
    const complianceResult = complianceResults.find(
        (r) => r.location.path === path
    );
    if (complianceResult) {
        tooltipAttrs = `data-tooltip="${escapeHtml(complianceResult.details)}" data-iso="${escapeHtml(complianceResult.isoRef)}"`;
    }
    const triggerClass =
        tagInfo || complianceResult ? tooltipTriggerClasses : '';

    return `&lt;${isClosing ? '/' : ''}<span class="${triggerClass}" ${tooltipAttrs}>${displayPrefix}<span class="${tagClass}">${localName}</span></span>`;
};

const getAttributeHTML = (tagName, attr, path, complianceResults) => {
    const attrKey = `${tagName}@${attr.name}`;
    const attrInfo = dashTooltipData[attrKey];
    const nameClass = 'text-emerald-300';
    const valueClass = 'text-yellow-300';
    const isIgnoredAttr = ['xmlns', 'xmlns:xsi', 'xsi:schemaLocation'].includes(
        attr.name
    );

    let dynamicClasses = '';
    let tooltipAttrs = '';

    // Prioritize compliance result for tooltip
    const complianceResult = complianceResults.find(
        (r) => r.location.path === path && r.details.includes(`@${attr.name}`)
    );

    if (complianceResult) {
        dynamicClasses = tooltipTriggerClasses;
        tooltipAttrs = `data-tooltip="${escapeHtml(complianceResult.details)}" data-iso="${escapeHtml(complianceResult.isoRef)}"`;
    } else if (attrInfo) {
        dynamicClasses = tooltipTriggerClasses;
        tooltipAttrs = `data-tooltip="${escapeHtml(attrInfo.text)}" data-iso="${escapeHtml(attrInfo.isoRef)}"`;
    } else if (!isIgnoredAttr) {
        dynamicClasses = 'cursor-help bg-red-900/50 missing-tooltip-trigger';
        tooltipAttrs = `data-tooltip="Tooltip definition missing for '${attr.name}' on &lt;${tagName}&gt;"`;
    }

    return `<span class="${nameClass} ${dynamicClasses}" ${tooltipAttrs}>${
        attr.name
    }</span>="<span class="${valueClass}">${escapeHtml(attr.value)}</span>"`;
};

const preformattedDash = (
    node,
    complianceResults,
    path = 'MPD[0]',
    depth = 0
) => {
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
            const childElementCounts = {};

            const complianceResult = complianceResults.find(
                (r) => r.location.path === path
            );
            const highlightClass = complianceResult
                ? `${highlightColors[complianceResult.status]} compliance-highlight`
                : '';
            const locationId = complianceResult
                ? `loc-${complianceResult.id}`
                : '';

            const attrs = Array.from(el.attributes)
                .map(
                    (a) =>
                        ` ${getAttributeHTML(el.tagName, a, path, complianceResults)}`
                )
                .join('');

            const openingTagStart = `<div class="flex ${highlightClass}" id="${locationId}">
                <span class="text-right text-gray-500 pr-4 select-none flex-shrink-0 w-12">${'' /*Line number placeholder*/}</span>
                <span class="flex-grow whitespace-pre-wrap break-all">`;

            if (childNodes.length > 0) {
                const openingTag = `${openingTagStart}${indent}${getTagHTML(el.tagName, path, complianceResults)}${attrs}&gt;</span></div>`;
                const childLines = childNodes.flatMap((c) => {
                    const childElementName =
                        c.nodeType === Node.ELEMENT_NODE
                            ? /** @type {Element} */ (c).tagName
                            : 'child';
                    childElementCounts[childElementName] =
                        (childElementCounts[childElementName] || 0) + 1;
                    const childIndex = childElementCounts[childElementName] - 1;
                    const childPath =
                        c.nodeType === Node.ELEMENT_NODE
                            ? `${path}.${childElementName}[${childIndex}]`
                            : path;
                    return preformattedDash(
                        c,
                        complianceResults,
                        childPath,
                        depth + 1
                    );
                });
                const closingTag = `${openingTagStart}${indent}${getTagHTML(`/${el.tagName}`, path, complianceResults)}&gt;</span></div>`;
                return [openingTag, ...childLines, closingTag];
            } else {
                return [
                    `${openingTagStart}${indent}${getTagHTML(el.tagName, path, complianceResults)}${attrs} /&gt;</span></div>`,
                ];
            }
        }
        case Node.TEXT_NODE: {
            return [
                `<div class="flex"><span class="text-right text-gray-500 pr-4 select-none flex-shrink-0 w-12"></span><span class="flex-grow whitespace-pre-wrap break-all">${indent}<span class="text-gray-200">${escapeHtml(
                    node.textContent.trim()
                )}</span></span></div>`,
            ];
        }
        case Node.COMMENT_NODE: {
            return [
                `<div class="flex"><span class="text-right text-gray-500 pr-4 select-none flex-shrink-0 w-12"></span><span class="flex-grow whitespace-pre-wrap break-all">${indent}<span class="text-gray-500 italic">&lt;!--${escapeHtml(
                    node.textContent
                )}--&gt;</span></span></div>`,
            ];
        }
        default:
            return [];
    }
};

export const renderDashManifest = (manifestString, complianceResults = []) => {
    let manifestElement;
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(manifestString, 'application/xml');
    const parserError = xmlDoc.querySelector('parsererror');

    if (parserError) {
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
            Error: &lt;MPD&gt; root element not found.
        </div>`;
    }

    // This creates an array of HTML strings, each wrapped in a div with a placeholder for the line number.
    const allLinesHtml = preformattedDash(manifestElement, complianceResults);

    // Now we add the line numbers.
    const finalHtml = allLinesHtml
        .map((line, index) => {
            return line.replace(
                /<span class="text-right.*?w-12">.*?<\/span>/,
                `<span class="text-right text-gray-500 pr-4 select-none flex-shrink-0 w-12">${index + 1}</span>`
            );
        })
        .join('');

    return html`${unsafeHTML(finalHtml)}`;
};
