import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import '@/ui/components/virtualized-list';
import { isDebugMode } from '@/shared/utils/env';

const escapeHtml = (str) => {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
};

const flattenManifest = (node, path, depth, lines) => {
    if (typeof node !== 'object' || node === null) return;

    const tagName = path
        .split('.')
        .pop()
        .replace(/\[\d+\]$/, '');
    const attributes = node[':@'] || {};
    const textContent = node['#text'] || null;
    const childKeys = Object.keys(node).filter(
        (key) => key !== ':@' && key !== '#text'
    );
    const hasChildren = childKeys.length > 0 || textContent;

    lines.push({
        id: `${path}-open`,
        depth,
        type: 'open',
        tagName,
        path,
        attributes,
        hasChildren,
    });

    if (textContent) {
        lines.push({
            id: `${path}-text`,
            depth: depth + 1,
            type: 'text',
            content: textContent,
            path, // Text belongs to the parent path
        });
    }

    let childCounts = {};
    childKeys.forEach((childTagName) => {
        const children = Array.isArray(node[childTagName])
            ? node[childTagName]
            : [node[childTagName]];
        children.forEach((child) => {
            const index = childCounts[childTagName] || 0;
            flattenManifest(
                child,
                `${path}.${childTagName}[${index}]`,
                depth + 1,
                lines
            );
            childCounts[childTagName] = index + 1;
        });
    });

    if (hasChildren) {
        lines.push({
            id: `${path}-close`,
            depth,
            type: 'close',
            tagName,
            path,
        });
    }
};

const renderTagHTML = (
    tagName,
    path,
    isClosing,
    hoveredItem,
    selectedItem,
    missingTooltips
) => {
    const cleanTagName = isClosing ? tagName.substring(1) : tagName;
    const [prefix, localName] = cleanTagName.includes(':')
        ? cleanTagName.split(':')
        : [null, cleanTagName];
    const displayPrefix = prefix
        ? `<span class="text-gray-400">${prefix}:</span>`
        : '';
    const tagClass = 'text-blue-300';
    const isHovered = hoveredItem && hoveredItem.path === path;
    const isSelected = selectedItem && selectedItem.path === path;
    const isMissing = isDebugMode && missingTooltips.has(cleanTagName);

    let highlightClass = '';
    if (isSelected) {
        highlightClass = 'bg-blue-900/80';
    } else if (isHovered) {
        highlightClass = 'bg-slate-700/80';
    } else if (isMissing) {
        highlightClass =
            'bg-red-900/50 underline decoration-red-400 decoration-dotted';
    }

    return `&lt;${
        isClosing ? '/' : ''
    }<span class="interactive-dash-token ${highlightClass}" data-type="tag" data-name="${cleanTagName}" data-path="${path}">${displayPrefix}<span class="${tagClass}">${localName}</span></span>`;
};

const renderAttributeHTML = (
    tagName,
    attrName,
    attrValue,
    tagPath,
    hoveredItem,
    selectedItem,
    missingTooltips
) => {
    const attrKey = `${tagName}@${attrName}`;
    const attrPath = `${tagPath}@${attrName}`;
    const nameClass = 'text-emerald-300';
    const valueClass = 'text-yellow-300';
    const isHovered = hoveredItem && hoveredItem.path === attrPath;
    const isSelected = selectedItem && selectedItem.path === attrPath;
    const isMissing = isDebugMode && missingTooltips.has(attrKey);

    let highlightClass = '';
    if (isSelected) {
        highlightClass = 'bg-blue-900/80';
    } else if (isHovered) {
        highlightClass = 'bg-slate-700/80';
    } else if (isMissing) {
        highlightClass =
            'bg-red-900/50 underline decoration-red-400 decoration-dotted';
    }

    return `<span class="interactive-dash-token ${nameClass} ${highlightClass}" data-type="attribute" data-name="${attrKey}" data-path="${attrPath}">${attrName}</span>="<span class="${valueClass}">${escapeHtml(
        attrValue
    )}</span>"`;
};

const rowRenderer = (
    line,
    index,
    hoveredItem,
    selectedItem,
    missingTooltips
) => {
    const indent = '  '.repeat(line.depth);
    let lineHtml = '';

    switch (line.type) {
        case 'open': {
            const attrs = Object.entries(line.attributes)
                .map(
                    ([key, value]) =>
                        ` ${renderAttributeHTML(
                            line.tagName,
                            key,
                            value,
                            line.path,
                            hoveredItem,
                            selectedItem,
                            missingTooltips
                        )}`
                )
                .join('');
            lineHtml = `${indent}${renderTagHTML(
                line.tagName,
                line.path,
                false,
                hoveredItem,
                selectedItem,
                missingTooltips
            )}${attrs}${line.hasChildren ? '' : ' /'}&gt;`;
            break;
        }
        case 'close':
            lineHtml = `${indent}${renderTagHTML(
                `/${line.tagName}`,
                line.path,
                true,
                hoveredItem,
                selectedItem,
                missingTooltips
            )}&gt;`;
            break;
        case 'text':
            lineHtml = `${indent}<span class="text-gray-200">${escapeHtml(
                line.content
            )}</span>`;
            break;
    }

    return html`
        <div class="flex">
            <span
                class="text-right text-gray-500 pr-4 select-none shrink-0 w-12"
                >${line.lineNumber}</span
            >
            <span class="grow whitespace-pre-wrap break-all"
                >${unsafeHTML(lineHtml)}</span
            >
        </div>
    `;
};

export const dashManifestTemplate = (
    stream,
    hoveredItem,
    selectedItem,
    missingTooltips
) => {
    const activeUpdate = stream.manifestUpdates.find(
        (u) => u.id === stream.activeManifestUpdateId
    );

    const manifestObject = activeUpdate
        ? activeUpdate.serializedManifest
        : stream.manifest.serializedManifest;

    if (!manifestObject) {
        return html`<div class="text-red-400 p-4">
            Error: Manifest object not available for rendering.
        </div>`;
    }

    const flatLines = [];
    flattenManifest(manifestObject, 'MPD[0]', 0, flatLines);
    const linesWithNumbers = flatLines.map((line, index) => ({
        ...line,
        lineNumber: index + 1,
    }));

    const renderer = (item, index) =>
        rowRenderer(item, index, hoveredItem, selectedItem, missingTooltips);

    return html`
        <div
            class="bg-slate-800 rounded-lg p-2 font-mono text-sm leading-relaxed overflow-x-auto"
        >
            <virtualized-list
                .items=${linesWithNumbers}
                .rowTemplate=${renderer}
                .rowHeight=${22}
                .itemId=${(item) => item.id}
                class="h-[75vh]"
            ></virtualized-list>
        </div>
    `;
};
