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
                const regex = /([A-Z0-9-]+)=(?:"([^"]*)"|([^",\s]+))/g;
                let match;
                while ((match = regex.exec(valueStr)) !== null) {
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
    isModified,
    activeMatchIndex,
    matchIndices,
    uriBadgeMap // New: Map of URIs to Labels
) => {
    const { type, name, value, attributes, content } = parseHlsLine(
        item.content
    );
    const path = `L${item.lineNumber}`;

    const isSelected = selectedItem && selectedItem.path === path;

    // --- Search Highlighting ---
    let rowBgClass = 'hover:bg-slate-800/30';
    if (index === activeMatchIndex) {
        rowBgClass = 'bg-yellow-500/20 ring-1 ring-yellow-500/40';
    } else if (matchIndices && matchIndices.has(index)) {
        rowBgClass = 'bg-yellow-900/10';
    } else if (isModified) {
        rowBgClass = 'bg-orange-500/10';
    }

    let lineContent;

    // Use whitespace-pre-wrap to allow wrapping but break-all to force it inside narrow containers
    const baseClass = `block pl-4 whitespace-pre-wrap break-all leading-tight w-full max-w-full`;

    const selectClass = isSelected
        ? 'bg-blue-900/50 ring-1 ring-blue-500 rounded px-1 inline decoration-clone'
        : 'hover:bg-slate-800 rounded px-1 transition-colors cursor-pointer inline decoration-clone';

    // prettier-ignore
    if (type === 'tag' || type === 'tag-value') {
        lineContent = html`<div class="${baseClass}"><span
                class="${selectClass}"
                data-type="tag"
                data-name=${name}
                data-path=${path}
                ><span class="text-slate-500 select-none">#</span
                ><span class="text-purple-300 font-bold">${name}</span>${value
                    ? html`<span class="text-slate-400 select-none">:</span
                          ><span class="text-yellow-200/90">${value}</span>`
                    : ''}</span
            ></div>`;
    } else if (type === 'tag-attrs') {
        const attributesMap = attributes.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});

        const attrsHtml = attributes.map((attr, i) => {
            const attrKey = `${name}@${attr.key}`;
            const attrPath = `${path}@${attr.key}`;
            const smartToken = renderSmartToken(
                attr.key,
                attr.value,
                null,
                attributesMap
            );

            // --- Smart Variant Badge for Attributes (e.g. URI="...") ---
            /** @type {import('lit-html').TemplateResult | null} */
            let variantBadge = null;
            if (attr.key === 'URI' && uriBadgeMap) {
                 const cleanUri = attr.value.replace(/^"|"$/g, ''); // Strip quotes
                 const badgeData = uriBadgeMap.get(cleanUri);
                 if (badgeData) {
                      variantBadge = html`<span class="ml-1 px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-500/30 text-[9px] font-bold uppercase tracking-wider select-none align-middle decoration-0 inline-block translate-y-[-1px]">${badgeData.label}</span>`;
                 }
            }

            return html`<span
                class="group relative cursor-pointer hover:bg-slate-800 rounded pl-1 transition-colors inline decoration-clone"
                data-type="attribute"
                data-name=${attrKey}
                data-path=${attrPath}
                ><span class="text-emerald-300/90 font-semibold"
                    >${attr.key}</span
                ><span class="text-slate-400 select-none">=</span
                ><span class="text-amber-200/90">"${attr.value}"</span
                >${smartToken}${variantBadge}${i < attributes.length - 1
                    ? html`<span class="text-slate-600 select-none mr-1"
                          >,</span
                      >`
                    : ''}</span
            >`;
        });

        lineContent = html`<div class="${baseClass}"><span
                class="${selectClass} mr-1 inline"
                data-type="tag"
                data-name=${name}
                data-path=${path}
                ><span class="text-slate-500 select-none">#</span
                ><span class="text-purple-300 font-bold">${name}</span
                ><span class="text-slate-400 select-none">:</span></span
            >${attrsHtml}</div>`;
    } else if (type === 'comment') {
        lineContent = html`<div class="${baseClass} text-slate-500 italic">${content}</div>`;
    } else if (type === 'uri') {
        // --- Smart Variant Badge for Standalone URIs ---
        const badgeData = uriBadgeMap?.get(content.trim());
        const badge = badgeData 
            ? html`<span class="ml-3 px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-500/30 text-[9px] font-bold uppercase tracking-wider select-none align-middle decoration-0 inline-block translate-y-[-1px]">${badgeData.label}</span>` 
            : '';

        lineContent = html`<div class="${baseClass} text-cyan-300/90">${content}${badge}</div>`;
    } else {
        lineContent = html`<div class="${baseClass}">&nbsp;</div>`;
    }

    return html`
        <div
            class="flex w-full items-start transition-colors font-mono text-sm py-0.5 group ${rowBgClass}"
        >
            <div
                class="w-12 shrink-0 text-right pr-2 text-slate-600 select-none text-xs border-r border-slate-800/50 bg-slate-900 pt-0.5 sticky left-0 z-10 h-full"
            >
                ${item.lineNumber}
            </div>
            <div class="grow min-w-0 pl-1">${lineContent}</div>
        </div>
    `;
};

export const hlsManifestTemplate = (
    stream,
    manifestString,
    hoveredItem,
    selectedItem,
    missingTooltips,
    diffModel,
    activeMatchIndex = -1,
    matchIndices = new Set()
) => {
    if (!manifestString)
        return html`<div class="p-8 text-center text-slate-500">
            No content.
        </div>`;

    // --- Build URI Badge Map (Context Awareness) ---
    const uriBadgeMap = new Map();
    if (stream?.manifest?.isMaster) {
        // 1. Variant Streams (EXT-X-STREAM-INF -> URI)
        (stream.manifest.variants || []).forEach((v, i) => {
            if (v.uri) {
                // Determine label: StableID > ID > Generic Index
                const label = v.stableId || v.id || `Variant ${i + 1}`;
                uriBadgeMap.set(v.uri.trim(), { label, type: 'variant' });
            }
        });

        // 2. Media Renditions (EXT-X-MEDIA URI=...)
        (stream.manifest.media || []).forEach((m) => {
            const uri = m.value.URI;
            if (uri) {
                // Use NAME or Group ID for identification
                const label =
                    m.value.NAME || m.value['GROUP-ID'] || 'Rendition';
                uriBadgeMap.set(uri.trim(), { label, type: 'rendition' });
            }
        });

        // 3. I-Frame Streams (EXT-X-I-FRAME-STREAM-INF URI=...)
        (stream.manifest.iframeStreams || []).forEach((ifs) => {
            // Handle parser variance (sometimes nested in value object)
            const uri = ifs.value?.URI || ifs.uri;
            if (uri) {
                uriBadgeMap.set(uri.trim(), {
                    label: 'I-Frame',
                    type: 'iframe',
                });
            }
        });
    }

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
            isModified,
            activeMatchIndex,
            matchIndices,
            uriBadgeMap
        );
    };

    // Force overflow-x hidden to mandate wrapping at container level
    return html`
        <div class="bg-slate-900 h-full flex flex-col w-full">
            <virtualized-list
                id="manifest-virtual-list"
                .items=${allLines}
                .rowTemplate=${renderer}
                .rowHeight=${24}
                .itemId=${(item) => item.id}
                class="grow custom-scrollbar w-full"
                style="overflow-x: hidden"
            ></virtualized-list>
        </div>
    `;
};
