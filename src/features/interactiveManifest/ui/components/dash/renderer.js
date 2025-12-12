import { isDebugMode } from '@/shared/utils/env';
import '@/ui/components/virtualized-list';
import { html } from 'lit-html';
import { renderSmartToken } from '../smart-tokens.js';

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
        content: '', // Raw text approximation for search matching
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
            content: '',
        });
    }
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
        'inline mb-px group relative cursor-pointer rounded px-0.5 transition-colors align-baseline decoration-clone';

    if (isSelected) containerClass += ' bg-blue-500/30 ring-1 ring-blue-400/50';
    else if (isHovered) containerClass += ' bg-slate-700';
    else if (isModified) containerClass += ' bg-orange-500/20';
    else if (isMissing) containerClass += ' bg-red-500/20';
    else containerClass += ' hover:bg-slate-800';

    const nameClass = 'text-emerald-300/90 font-semibold';
    const valueClass = 'text-amber-200/90';

    const smartToken = renderSmartToken(
        attrName,
        attrValue,
        timescale,
        allAttributes
    );

    // prettier-ignore
    return html`<span
        class=${containerClass}
        data-type="attribute"
        data-name=${attrKey}
        data-path=${attrPath}
        ><span class=${nameClass}> ${attrName}</span
        ><span class="text-slate-500 select-none">=</span><span class="${valueClass}">"${attrValue}"</span>${smartToken}</span
    >`;
};

const rowRenderer = (
    line,
    index,
    hoveredItem,
    selectedItem,
    missingTooltips,
    diffSet,
    activeMatchIndex,
    matchIndices
) => {
    const indentGuides = [];
    for (let i = 0; i < line.depth; i++) {
        indentGuides.push(
            html`<div
                class="w-4 self-stretch border-r border-slate-800/50 inline-block shrink-0"
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
            'inline rounded px-0.5 align-baseline cursor-pointer transition-colors decoration-clone';
        if (isSelected) cls += ' bg-blue-900/50 ring-1 ring-blue-500/50';
        else if (isHovered) cls += ' bg-slate-700';
        else if (isModified) cls += ' bg-orange-500/10';
        else cls += ' hover:bg-slate-800';
        return cls;
    };

    if (line.type === 'open') {
        const tagWrapperClass = getTagClasses(line.path);
        const bracketClass = 'text-slate-500 font-normal select-none';
        const tagNameClass = 'text-blue-300 font-bold';

        const attributesHtml = Object.entries(line.attributes).map(
            ([k, v]) =>
                html`${renderAttribute(
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
                )}`
        );

        // prettier-ignore
        contentHtml = html`<div
            class="leading-tight whitespace-pre-wrap break-all"
        ><span
                class="${tagWrapperClass}"
                data-type="tag"
                data-name=${line.tagName}
                data-path=${line.path}
                ><span class="${bracketClass}">&lt;</span
                ><span class="${tagNameClass}">${line.tagName}</span></span
            >${attributesHtml}<span
                class="text-slate-500 align-baseline inline-block select-none"
                >${line.hasChildren ? '>' : ' />'}</span
            ></div>`;
    } else if (line.type === 'close') {
        const tagWrapperClass = getTagClasses(line.path);
        const bracketClass = 'text-slate-500 font-normal select-none';
        const tagNameClass = 'text-blue-300 font-bold';

        // prettier-ignore
        contentHtml = html`<div
            class="leading-tight whitespace-pre-wrap break-all"
        ><span
                class="${tagWrapperClass}"
                data-type="tag"
                data-name=${line.tagName}
                data-path=${line.path}
                ><span class="${bracketClass}">&lt;/</span
                ><span class="${tagNameClass}">${line.tagName}</span
                ><span class="${bracketClass}">&gt;</span></span
            ></div>`;
    } else if (line.type === 'text') {
        contentHtml = html`<span
            class="text-slate-300 whitespace-pre-wrap break-all leading-tight block py-0.5"
            >${line.content}</span
        >`;
    }

    // --- Search Highlighting ---
    // If this row is the active match, use bright highlight. If it's a secondary match, use dim.
    let rowBgClass = 'hover:bg-slate-800/20';
    if (index === activeMatchIndex) {
        rowBgClass = 'bg-yellow-500/20 ring-1 ring-yellow-500/40';
    } else if (matchIndices && matchIndices.has(index)) {
        rowBgClass = 'bg-yellow-900/10';
    }

    // Use items-start to align line number to top. Added py-0.5 for minimal vertical breathing room.
    return html`
        <div
            class="flex w-full items-start transition-colors font-mono text-sm group relative py-0.5 ${rowBgClass}"
        >
            <div
                class="w-12 shrink-0 text-right pr-3 text-slate-600 select-none text-xs border-r border-slate-800/50 bg-slate-900 sticky left-0 z-10 min-h-full pt-0.5"
            >
                ${line.lineNumber}
            </div>
            <div class="flex grow pl-2 min-w-0 pr-6">
                <div class="flex shrink-0 select-none mr-1 self-stretch">
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
    diffSet,
    activeMatchIndex = -1,
    matchIndices = new Set()
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
            diffSet,
            activeMatchIndex,
            matchIndices
        );

    // Forced overflow-x: hidden to ensure wrapping works and scrollbar never appears
    return html`
        <div class="bg-slate-900 h-full flex flex-col w-full">
            <virtualized-list
                id="manifest-virtual-list"
                .items=${linesWithNumbers}
                .rowTemplate=${renderer}
                .rowHeight=${24}
                .itemId=${(item) => item.id}
                class="grow custom-scrollbar w-full"
                style="overflow-x: hidden"
            ></virtualized-list>
        </div>
    `;
};