import { uiActions, useUiStore } from '@/state/uiStore';
import '@/ui/components/virtualized-list';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';

// --- Visual Configuration ---
const BOX_COLORS = {
    // Roots & Top Level
    ftyp: 'text-rose-500',
    styp: 'text-rose-500',
    moov: 'text-indigo-400',
    moof: 'text-blue-500',
    mfra: 'text-teal-500',
    mdat: 'text-slate-400',
    free: 'text-slate-600',
    skip: 'text-slate-600',
    meta: 'text-pink-400',
    void: 'text-slate-700',

    // Headers
    mvhd: 'text-indigo-300',
    mfhd: 'text-blue-300',
    tkhd: 'text-violet-300',
    mdhd: 'text-sky-300',
    tfhd: 'text-blue-300',
    mehd: 'text-indigo-300',
    trep: 'text-sky-300',

    // Containers / Structure
    trak: 'text-violet-400',
    traf: 'text-blue-400',
    mdia: 'text-sky-400',
    minf: 'text-cyan-400',
    dinf: 'text-cyan-500',
    stbl: 'text-emerald-400',
    mvex: 'text-indigo-400',
    edts: 'text-fuchsia-400',
    udta: 'text-pink-400',
    sinf: 'text-amber-400',
    schi: 'text-amber-300',

    // Sample Table / Timing
    stsd: 'text-emerald-300',
    stts: 'text-teal-300',
    ctts: 'text-teal-300',
    stsc: 'text-teal-400',
    stsz: 'text-emerald-300',
    stz2: 'text-emerald-300',
    stco: 'text-green-400',
    co64: 'text-green-400',
    stss: 'text-lime-300',
    sdtp: 'text-lime-400',
    sbgp: 'text-lime-500',
    sgpd: 'text-lime-500',
    tfdt: 'text-blue-300',
    tfra: 'text-teal-500',
    trun: 'text-cyan-300',
    sidx: 'text-cyan-400',
    elst: 'text-fuchsia-300',
    cslg: 'text-fuchsia-300',

    // Codecs & Visuals
    avc1: 'text-emerald-400',
    avc3: 'text-emerald-400',
    hvc1: 'text-emerald-400',
    hev1: 'text-emerald-400',
    mp4a: 'text-purple-300',
    enca: 'text-amber-300',
    encv: 'text-amber-300',
    avcC: 'text-emerald-200',
    hvcC: 'text-emerald-200',
    esds: 'text-purple-200',
    pasp: 'text-sky-200',
    colr: 'text-sky-200',
    vpcC: 'text-emerald-200',
    vp09: 'text-emerald-400',
    Opus: 'text-purple-400',
    dOps: 'text-purple-200',

    // Encryption / DRM
    pssh: 'text-amber-500',
    tenc: 'text-amber-300',
    schm: 'text-amber-300',
    frma: 'text-amber-200',
    saiz: 'text-yellow-400',
    saio: 'text-yellow-500',

    // Misc
    hdlr: 'text-sky-300',
    vmhd: 'text-cyan-300',
    smhd: 'text-purple-300',
    hmhd: 'text-orange-300',
    nmhd: 'text-slate-300',
    'url ': 'text-cyan-400', // FIX: Matches dref/dinf (Cyan)
    'urn ': 'text-slate-400',
    dref: 'text-cyan-300',
    emsg: 'text-pink-500',
    prft: 'text-pink-400',
    kinds: 'text-pink-300',

    // New Mappings from previous step
    ID32: 'text-emerald-400',
    stpp: 'text-emerald-400',
    wvtt: 'text-emerald-400',
    cprt: 'text-pink-400',
    uuid: 'text-slate-400',
    ilst: 'text-pink-400',
    kind: 'text-pink-400',
};

// Heuristic color generator for unknown boxes to ensure everything has color
const getColorForUnknown = (type) => {
    if (!type) return 'text-slate-500';
    const charCode = type.charCodeAt(0);
    const colors = [
        'text-red-300',
        'text-orange-300',
        'text-amber-300',
        'text-yellow-300',
        'text-lime-300',
        'text-green-300',
        'text-emerald-300',
        'text-teal-300',
        'text-cyan-300',
        'text-sky-300',
        'text-blue-300',
        'text-indigo-300',
        'text-violet-300',
        'text-purple-300',
        'text-fuchsia-300',
        'text-pink-300',
        'text-rose-300',
    ];
    return colors[charCode % colors.length];
};

const getIconForNode = (node) => {
    // Structure
    if (
        [
            'moov',
            'moof',
            'trak',
            'traf',
            'mdia',
            'minf',
            'stbl',
            'mvex',
            'edts',
            'sinf',
            'dinf',
        ].includes(node.type)
    )
        return icons.folder;

    // Data
    if (node.type === 'mdat') return icons.database;
    if (node.type === 'free' || node.type === 'skip') return icons.ghost;

    // Video / Codec
    if (['avc1', 'hvc1', 'hev1', 'vp09', 'av01', 'encv'].includes(node.type))
        return icons.clapperboard;
    if (['vmhd', 'pasp', 'colr'].includes(node.type)) return icons.monitor;

    // Audio
    if (['mp4a', 'ac-3', 'ec-3', 'Opus', 'enca', 'samr'].includes(node.type))
        return icons.audioLines;
    if (node.type === 'smhd') return icons.volumeUp;

    // Metadata / Events
    if (['emsg', 'evti', 'ID32'].includes(node.type)) return icons.advertising;
    if (['meta', 'udta', 'hdlr', 'keys', 'ilst'].includes(node.type))
        return icons.tag;

    // Encryption
    if (['pssh', 'tenc', 'schm', 'schi'].includes(node.type))
        return icons.lockClosed;

    // Tables / Lists
    if (
        [
            'stsd',
            'stts',
            'stsc',
            'stsz',
            'stco',
            'co64',
            'ctts',
            'stss',
            'sbgp',
            'sgpd',
            'saiz',
            'saio',
            'elst',
        ].includes(node.type)
    )
        return icons.table;

    // Headers / Info
    if (node.type.endsWith('hd')) return icons.info;

    return icons.code; // Default
};

// --- Flattening Logic ---
const flattenTree = (nodes, expandedOffsets, depth = 0, result = []) => {
    if (!nodes) return result;

    for (const node of nodes) {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedOffsets.has(node.offset);

        result.push({
            ...node, // Keep original ref for details
            depth,
            hasChildren,
            isExpanded,
        });

        if (hasChildren && isExpanded) {
            flattenTree(node.children, expandedOffsets, depth + 1, result);
        }
    }
    return result;
};

class StructureTree extends HTMLElement {
    constructor() {
        super();
        this._data = null;
        this._flattenedItems = [];
        // Local state for expansion
        this._expandedOffsets = new Set();

        this._toggleExpand = this._toggleExpand.bind(this);
        this._renderRow = this._renderRow.bind(this);
        this._handleSelect = this._handleSelect.bind(this);
    }

    set data(val) {
        this._data = val;

        // Auto-expand ALL nodes by default
        if (val && val.boxes && this._expandedOffsets.size === 0) {
            const expandRecursive = (nodes) => {
                for (const node of nodes) {
                    if (node.children && node.children.length > 0) {
                        this._expandedOffsets.add(node.offset);
                        expandRecursive(node.children);
                    }
                }
            };
            expandRecursive(val.boxes);
        }
        this._recalcList();
    }

    connectedCallback() {
        this.classList.add('block', 'h-full', 'w-full', 'relative');
        this.render();
        this.unsubscribe = useUiStore.subscribe((state) => {
            this.requestUpdate();
        });
    }

    disconnectedCallback() {
        if (this.unsubscribe) this.unsubscribe();
    }

    _recalcList() {
        if (!this._data || !this._data.boxes) {
            this._flattenedItems = [];
        } else {
            this._flattenedItems = flattenTree(
                this._data.boxes,
                this._expandedOffsets
            );
        }

        /** @type {any} */
        const list = this.querySelector('virtualized-list');
        if (list) {
            list.items = this._flattenedItems;
        }
    }

    _toggleExpand(e, item) {
        e.stopPropagation();
        if (this._expandedOffsets.has(item.offset)) {
            this._expandedOffsets.delete(item.offset);
        } else {
            this._expandedOffsets.add(item.offset);
        }
        this._recalcList();
    }

    _handleSelect(e, item) {
        e.stopPropagation();
        uiActions.setInteractiveSegmentSelectedItem(item);
    }

    _handleHover(item, isHovering) {
        if (isHovering) {
            uiActions.setInteractiveSegmentHighlightedItem(item, 'Box Header');
        } else {
            uiActions.setInteractiveSegmentHighlightedItem(null, null);
        }
    }

    requestUpdate() {
        /** @type {any} */
        const list = this.querySelector('virtualized-list');
        if (list) list.requestUpdate();
    }

    _renderRow(item) {
        const {
            interactiveSegmentSelectedItem,
            interactiveSegmentHighlightedItem,
        } = useUiStore.getState();

        // Determine if this row is selected or hovered
        const isSelected =
            interactiveSegmentSelectedItem?.item?.offset === item.offset;
        const isHovered =
            interactiveSegmentHighlightedItem?.item?.offset === item.offset;

        const indent = item.depth * 12;
        const sizeText =
            item.size > 1024
                ? `${(item.size / 1024).toFixed(1)} KB`
                : `${item.size} B`;

        // Get type-based color or fallback
        const typeColor =
            BOX_COLORS[item.type] || getColorForUnknown(item.type);

        // Apply selection styles overriding type color if selected
        const iconColorClass = isSelected
            ? 'text-white'
            : isHovered
              ? 'text-slate-200'
              : typeColor;

        let containerClass =
            'flex items-center gap-2 py-1 px-2 text-xs font-mono cursor-pointer select-none transition-colors border-l-2 ';
        if (isSelected) {
            containerClass += 'bg-blue-600 text-white border-blue-400';
        } else if (isHovered) {
            containerClass += 'bg-slate-800 text-slate-200 border-slate-600';
        } else {
            containerClass +=
                'text-slate-400 border-transparent hover:bg-slate-800/50 hover:text-slate-300';
        }

        return html`
            <div
                class="${containerClass}"
                style="padding-left: ${indent + 8}px"
                @click=${(e) => this._handleSelect(e, item)}
                @mouseenter=${() => this._handleHover(item, true)}
                @mouseleave=${() => this._handleHover(item, false)}
                data-box-offset="${item.offset}"
            >
                <div
                    class="w-4 h-4 flex items-center justify-center shrink-0 hover:text-white transition-colors rounded hover:bg-white/10 mr-1 ${item.hasChildren
                        ? ''
                        : 'invisible'}"
                    @click=${(e) => this._toggleExpand(e, item)}
                >
                    <span
                        class="transition-transform duration-200 ${item.isExpanded
                            ? 'rotate-90'
                            : ''}"
                    >
                        ${icons.chevronRight}
                    </span>
                </div>

                <span class="${iconColorClass} opacity-90 scale-90">
                    ${getIconForNode(item)}
                </span>

                <span
                    class="font-bold truncate ${item.type === 'mdat'
                        ? 'opacity-50'
                        : ''}"
                >
                    ${item.type}
                </span>

                <span
                    class="ml-auto text-[10px] opacity-50 font-sans tracking-wide bg-black/20 px-1.5 rounded"
                >
                    ${sizeText}
                </span>
            </div>
        `;
    }

    render() {
        const template = html`
            <div
                class="flex flex-col h-full overflow-hidden bg-slate-950 border-r border-slate-800"
            >
                <div
                    class="shrink-0 h-10 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shadow-sm z-10"
                >
                    <span
                        class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"
                    >
                        ${icons.folderTree} Structure
                    </span>
                </div>

                <div class="grow relative w-full min-h-0">
                    <virtualized-list
                        .items=${this._flattenedItems}
                        .rowTemplate=${this._renderRow}
                        .rowHeight=${28}
                        .itemId=${(item) => item.offset}
                        class="absolute inset-0"
                    ></virtualized-list>
                </div>
            </div>
        `;
        render(template, this);
    }
}

customElements.define('structure-tree-component', StructureTree);

export const structureContentTemplate = (data) => {
    if (data && data.boxes) {
        return html`<structure-tree-component
            .data=${data}
        ></structure-tree-component>`;
    }
    if (data && data.packets) {
        return html`<div class="p-4 text-slate-500 text-xs text-center italic">
            TS Packet Tree View (Not Virtualized Yet)
        </div>`;
    }
    return html``;
};
