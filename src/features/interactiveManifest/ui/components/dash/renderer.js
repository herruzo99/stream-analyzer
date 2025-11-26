import { html } from 'lit-html';
import { renderSmartToken } from '../smart-tokens.js';
import '@/ui/components/virtualized-list';
import { isDebugMode } from '@/shared/utils/env';

export const flattenManifest = (
    node,
    path,
    depth,
    lines,
    inheritedTimescale = null
) => {
    if (typeof node !== 'object' || node === null) return;

    const tagName = path
        .split('.')
        .pop()
        .replace(/\[\d+\]$/, '');
    const attributes = node[':@'] || {};
    const textContent = node['#text'] || null;

    let currentTimescale = inheritedTimescale;
    if (attributes.timescale) {
        const ts = parseInt(attributes.timescale, 10);
        if (!isNaN(ts)) {
            currentTimescale = ts;
        }
    }

    const childKeys = Object.keys(node).filter(
        (key) => key !== ':@' && key !== '#text' && key !== 'parent'
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
        timescale: currentTimescale,
    });

    if (textContent) {
        lines.push({
            id: `${path}-text`,
            depth: depth + 1,
            type: 'text',
            content: textContent,
            path,
            timescale: currentTimescale,
        });
    }

    childKeys.forEach((childTagName) => {
        const children = Array.isArray(node[childTagName])
            ? node[childTagName]
            : [node[childTagName]];
        children.forEach((child, index) => {
            flattenManifest(
                child,
                `${path}.${childTagName}[${index}]`,
                depth + 1,
                lines,
                currentTimescale
            );
        });
    });

    if (hasChildren) {
        lines.push({
            id: `${path}-close`,
            depth,
            type: 'close',
            tagName,
            path,
            timescale: currentTimescale,
        });
    }
};

export const findPathIndex = (manifestObject, targetPath) => {
    if (!manifestObject || !targetPath) return -1;
    const elementPath = targetPath.includes('@')
        ? targetPath.split('@')[0]
        : targetPath;
    const lines = [];
    flattenManifest(manifestObject, 'MPD', 0, lines);
    return lines.findIndex(
        (line) => line.path === elementPath && line.type === 'open'
    );
};

const renderAttribute = (
    tagName,
    attrName,
    attrValue,
    tagPath,
    hoveredItem,
    selectedItem,
    missingTooltips,
    diffSet,
    timescale,
    allAttributes
) => {
    const attrKey = `${tagName}@${attrName}`;
    const attrPath = `${tagPath}@${attrName}`;
    const diffPath = `${tagPath}.:@.${attrName}`;

    const isHovered = hoveredItem && hoveredItem.path === attrPath;
    const isSelected = selectedItem && selectedItem.path === attrPath;
    const isModified = diffSet && diffSet.has(diffPath);
    const isMissing = isDebugMode && missingTooltips.has(attrKey);

    let containerClass =
        'inline-block mb-px group relative cursor-pointer rounded px-0.5 transition-colors whitespace-pre align-baseline';

    if (isSelected) containerClass += ' bg-blue-500/30 ring-1 ring-blue-400/50';
    else if (isHovered) containerClass += ' bg-slate-700';
    else if (isModified) containerClass += ' bg-orange-500/20';
    else if (isMissing) containerClass += ' bg-red-500/20';
    else containerClass += ' hover:bg-slate-800';

    // softer colors for readability
    const nameClass = 'text-emerald-300/90 font-semibold';
    const valueClass = 'text-amber-200/90';

    const smartToken = renderSmartToken(
        attrName,
        attrValue,
        timescale,
        allAttributes
    );

    return html`<span
        class=${containerClass}
        data-type="attribute"
        data-name=${attrKey}
        data-path=${attrPath}
        ><span class=${nameClass}>${attrName}</span
        ><span class="text-slate-500">=</span
        ><span class="${valueClass}">"${attrValue}"</span>${smartToken}</span
    >`;
};

const rowRenderer = (
    line,
    index,
    hoveredItem,
    selectedItem,
    missingTooltips,
    diffSet
) => {
    const indentGuides = [];
    for (let i = 0; i < line.depth; i++) {
        indentGuides.push(
            html`<div
                class="w-4 h-full border-r border-slate-800/50 inline-block shrink-0"
            ></div>`
        );
    }

    let contentHtml;

    const getTagClasses = (path) => {
        const isHovered = hoveredItem && hoveredItem.path === path;
        const isSelected = selectedItem && selectedItem.path === path;
        const isModified =
            diffSet && (diffSet.has(path) || diffSet.has(`${path}.:@`));

        let cls =
            'inline-block rounded px-0.5 align-baseline cursor-pointer transition-colors';
        if (isSelected) cls += ' bg-blue-900/50 ring-1 ring-blue-500/50';
        else if (isHovered) cls += ' bg-slate-700';
        else if (isModified) cls += ' bg-orange-500/10';
        else cls += ' hover:bg-slate-800';
        return cls;
    };

    if (line.type === 'open') {
        const tagWrapperClass = getTagClasses(line.path);
        const bracketClass = 'text-slate-500 font-normal';
        const tagNameClass = 'text-blue-300 font-bold'; // Less saturated blue

        const hasAttributes = Object.keys(line.attributes).length > 0;

        contentHtml = html`
            <div class="leading-relaxed whitespace-nowrap">
                <span
                    class="${tagWrapperClass}"
                    data-type="tag"
                    data-name=${line.tagName}
                    data-path=${line.path}
                >
                    <span class="${bracketClass}">&lt;</span
                    ><span class="${tagNameClass}">${line.tagName}</span> </span
                >${hasAttributes
                    ? html`<span class="ml-1"
                          >${Object.entries(line.attributes).map(([k, v]) =>
                              renderAttribute(
                                  line.tagName,
                                  k,
                                  v,
                                  line.path,
                                  hoveredItem,
                                  selectedItem,
                                  missingTooltips,
                                  diffSet,
                                  line.timescale,
                                  line.attributes
                              )
                          )}</span
                      >`
                    : ''}<span
                    class="text-slate-500 align-baseline inline-block"
                    >${line.hasChildren ? '>' : ' />'}</span
                >
            </div>
        `;
    } else if (line.type === 'close') {
        const tagWrapperClass = getTagClasses(line.path);
        const bracketClass = 'text-slate-500 font-normal';
        const tagNameClass = 'text-blue-300 font-bold';

        contentHtml = html`
            <div class="leading-relaxed whitespace-nowrap">
                <span
                    class="${tagWrapperClass}"
                    data-type="tag"
                    data-name=${line.tagName}
                    data-path=${line.path}
                >
                    <span class="${bracketClass}">&lt;/</span
                    ><span class="${tagNameClass}">${line.tagName}</span
                    ><span class="${bracketClass}">&gt;</span>
                </span>
            </div>
        `;
    } else if (line.type === 'text') {
        contentHtml = html`<span
            class="text-slate-300 whitespace-pre leading-6 block py-0.5"
            >${line.content}</span
        >`;
    }

    return html`
        <div
            class="flex w-full items-stretch hover:bg-slate-800/20 transition-colors font-mono text-sm group relative"
        >
            <div
                class="w-12 shrink-0 text-right pr-3 text-slate-600 select-none text-xs border-r border-slate-800/50 bg-slate-900 py-1 sticky left-0 z-10"
            >
                ${line.lineNumber}
            </div>
            <div class="flex grow pl-2 min-w-0 pr-6">
                <div class="flex shrink-0 select-none mr-1">
                    ${indentGuides}
                </div>
                <div class="grow min-w-0">${contentHtml}</div>
            </div>
        </div>
    `;
};

export const dashManifestTemplate = (
    manifestObject,
    hoveredItem,
    selectedItem,
    missingTooltips,
    diffSet
) => {
    if (!manifestObject) {
        return html`<div class="p-8 text-center text-red-400">
            Error: Manifest object missing.
        </div>`;
    }

    const flatLines = [];
    flattenManifest(manifestObject, 'MPD', 0, flatLines);
    const linesWithNumbers = flatLines.map((line, index) => ({
        ...line,
        lineNumber: index + 1,
    }));

    const renderer = (item, index) =>
        rowRenderer(
            item,
            index,
            hoveredItem,
            selectedItem,
            missingTooltips,
            diffSet
        );

    return html`
        <div class="bg-slate-900 h-full flex flex-col">
            <virtualized-list
                id="manifest-virtual-list"
                .items=${linesWithNumbers}
                .rowTemplate=${renderer}
                .rowHeight=${28}
                .itemId=${(item) => item.id}
                class="grow scrollbar-hide"
            ></virtualized-list>
        </div>
    `;
};