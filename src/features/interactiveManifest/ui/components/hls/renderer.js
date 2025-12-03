import '@/ui/components/virtualized-list';
import { html } from 'lit-html';
import { renderSmartToken } from '../smart-tokens.js';

const parseHlsLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed) return { type: 'empty' };
    if (trimmed.startsWith('#')) {
        if (trimmed.startsWith('#EXT')) {
            const colonIndex = trimmed.indexOf(':');
            if (colonIndex === -1) {
                return { type: 'tag', name: trimmed.substring(1), value: null };
            }
            const name = trimmed.substring(1, colonIndex);
            const valueStr = trimmed.substring(colonIndex + 1);

            if (valueStr.includes('=')) {
                const attributes = [];
                // Security Fix: Hardened Regex for HLS Attributes
                // Original: /([A-Z0-9-]+)=("[^"]*"|[^,]+)/g
                // Fixed: Separates quoted strings from unquoted values strictly. 
                // Unquoted values now explicitly stop at comma or quote.
                const regex = /([A-Z0-9-]+)=(?:"([^"]*)"|([^",\s]+))/g;
                let match;
                while ((match = regex.exec(valueStr)) !== null) {
                    // match[2] is quoted content, match[3] is unquoted content
                    const val = match[2] !== undefined ? match[2] : match[3];
                    attributes.push({ key: match[1], value: val });
                }
                return { type: 'tag-attrs', name, attributes };
            }
            return { type: 'tag-value', name, value: valueStr };
        }
        return { type: 'comment', content: trimmed };
    }
    return { type: 'uri', content: trimmed };
};

const renderLine = (
    item,
    index,
    hoveredItem,
    selectedItem,
    missingTooltips,
    isModified
) => {
    const { type, name, value, attributes, content } = parseHlsLine(
        item.content
    );
    const path = `L${item.lineNumber}`;

    const isSelected = selectedItem && selectedItem.path === path;

    let lineContent;

    // Removed flex-wrap to enforce single line height for virtual scrolling
    const baseClass = `flex grow items-center pl-4 whitespace-nowrap ${isModified ? 'bg-orange-500/10' : ''}`;
    const selectClass = isSelected
        ? 'bg-blue-900/50 ring-1 ring-blue-500 rounded px-1'
        : 'hover:bg-slate-800 rounded px-1 transition-colors cursor-pointer';

    if (type === 'tag' || type === 'tag-value') {
        lineContent = html`
            <div class="${baseClass}">
                <span
                    class="${selectClass}"
                    data-type="tag"
                    data-name=${name}
                    data-path=${path}
                >
                    <span class="text-slate-500">#</span
                    ><span class="text-purple-300 font-bold">${name}</span>
                    ${value
                        ? html`<span class="text-slate-400">:</span
                              ><span class="text-yellow-200/90 whitespace-pre"
                                  >${value}</span
                              >`
                        : ''}
                </span>
            </div>
        `;
    } else if (type === 'tag-attrs') {
        const attributesMap = attributes.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});

        lineContent = html`
            <div class="${baseClass}">
                <span
                    class="${selectClass} mr-1 mb-0.5"
                    data-type="tag"
                    data-name=${name}
                    data-path=${path}
                >
                    <span class="text-slate-500">#</span
                    ><span class="text-purple-300 font-bold">${name}</span
                    ><span class="text-slate-400">:</span>
                </span>
                <div class="inline-flex gap-x-1 gap-y-0.5 ml-2 align-baseline">
                    ${attributes.map((attr, i) => {
                        const attrKey = `${name}@${attr.key}`;
                        const attrPath = `${path}@${attr.key}`;
                        const smartToken = renderSmartToken(
                            attr.key,
                            attr.value,
                            null,
                            attributesMap
                        );

                        return html`<span
                            class="group relative cursor-pointer align-baseline hover:bg-slate-800 rounded pl-1 transition-colors"
                            data-type="attribute"
                            data-name=${attrKey}
                            data-path=${attrPath}
                            ><span class="text-emerald-300/90 font-semibold"
                                >${attr.key}</span
                            ><span class="text-slate-400">=</span
                            ><span class="text-amber-200/90"
                                >"${attr.value}"</span
                            >${smartToken}${i < attributes.length - 1
                                ? html`<span class="text-slate-600">,</span>`
                                : ''}</span
                        >`;
                    })}
                </div>
            </div>
        `;
    } else if (type === 'comment') {
        // prettier-ignore
        lineContent = html`<div class="${baseClass} text-slate-500 italic whitespace-pre leading-relaxed">${content}</div>`;
    } else if (type === 'uri') {
        // prettier-ignore
        lineContent = html`<div class="${baseClass} text-cyan-300/90 whitespace-pre leading-relaxed">${content}</div>`;
    } else {
        lineContent = html`<div class="${baseClass}"></div>`;
    }

    return html`
        <div
            class="flex w-full items-stretch hover:bg-slate-800/30 transition-colors font-mono text-sm"
        >
            <div
                class="w-12 shrink-0 text-right pr-2 text-slate-600 select-none text-xs border-r border-slate-800/50 bg-slate-900 py-1 leading-relaxed sticky left-0 z-10"
            >
                ${item.lineNumber}
            </div>
            <div class="grow min-w-0 py-0.5 pr-6 leading-relaxed">
                ${lineContent}
            </div>
        </div>
    `;
};

export const hlsManifestTemplate = (
    stream,
    manifestString,
    hoveredItem,
    selectedItem,
    missingTooltips,
    diffModel
) => {
    if (!manifestString)
        return html`<div class="p-8 text-center text-slate-500">
            No content.
        </div>`;

    const allLines = manifestString.split(/\r?\n/).map((line, index) => ({
        id: `${index}-${line.substring(0, 20)}`,
        lineNumber: index + 1,
        content: line,
    }));

    const renderer = (item, index) => {
        const isModified = diffModel && diffModel[index] === 'modified';
        return renderLine(
            item,
            index,
            hoveredItem,
            selectedItem,
            missingTooltips,
            isModified
        );
    };

    return html`
        <div class="bg-slate-900 h-full flex flex-col">
            <virtualized-list
                id="manifest-virtual-list"
                .items=${allLines}
                .rowTemplate=${renderer}
                .rowHeight=${28}
                .itemId=${(item) => item.id}
                class="grow scrollbar-hide"
            ></virtualized-list>
        </div>
    `;
};