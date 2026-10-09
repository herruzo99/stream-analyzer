import { uiActions, useUiStore } from '@/state/uiStore';
import '@/ui/components/virtualized-list';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';

// --- Visual Configuration ---
import { getBoxColorIndex } from '@/shared/constants/isobmff-colors.js';

// --- Visual Configuration ---
// Categorical text colors by chart index. Full literals (never
// interpolated) so Tailwind generates the CSS.
const CHART_TEXT = {
    1: 'text-blue-300',
    2: 'text-emerald-300',
    3: 'text-amber-300',
    4: 'text-purple-300',
    5: 'text-slate-300',
    6: 'text-rose-300',
    7: 'text-cyan-300',
    8: 'text-slate-400',
    9: 'text-cyan-300',
    10: 'text-orange-300',
};
const getChartColorClass = (index) => CHART_TEXT[index] || 'text-slate-300';

const getIconForNode = (node) => {
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

    if (node.type === 'mdat') return icons.database;
    if (node.type === 'free' || node.type === 'skip') return icons.ghost;

    if (['avc1', 'hvc1', 'hev1', 'vp09', 'av01', 'encv'].includes(node.type))
        return icons.clapperboard;
    if (['vmhd', 'pasp', 'colr'].includes(node.type)) return icons.monitor;

    if (['mp4a', 'ac-3', 'ec-3', 'Opus', 'enca', 'samr'].includes(node.type))
        return icons.audioLines;
    if (node.type === 'smhd') return icons.volumeUp;

    if (['emsg', 'evti', 'ID32'].includes(node.type)) return icons.advertising;
    if (['meta', 'udta', 'hdlr', 'keys', 'ilst'].includes(node.type))
        return icons.tag;

    if (['pssh', 'tenc', 'schm', 'schi'].includes(node.type))
        return icons.lockClosed;

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

    if (node.type.endsWith('hd')) return icons.info;

    return icons.code;
};

const flattenTree = (nodes, expandedOffsets, depth = 0, result = []) => {
    if (!nodes) return result;

    for (const node of nodes) {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedOffsets.has(node.offset);

        result.push({
            ...node,
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
        this._expandedOffsets = new Set();
        this._hoverTimeout = null;

        this._toggleExpand = this._toggleExpand.bind(this);
        this._renderRow = this._renderRow.bind(this);
        this._handleSelect = this._handleSelect.bind(this);
    }

    connectedCallback() {
        this.classList.add('block', 'h-full', 'overflow-hidden');
        this.unsubscribe = useUiStore.subscribe(() => {
            this.requestUpdate();
        });
    }

    disconnectedCallback() {
        if (this.unsubscribe) this.unsubscribe();
    }

    set data(val) {
        this._data = val;
        this._expandedOffsets.clear();
        // Default expand ALL items recursively
        if (this._data && this._data.boxes) {
            const expandRecursive = (nodes) => {
                for (const node of nodes) {
                    this._expandedOffsets.add(node.offset);
                    if (node.children && node.children.length > 0) {
                        expandRecursive(node.children);
                    }
                }
            };
            expandRecursive(this._data.boxes);
        }
        this._recalcList();
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
        this.requestUpdate();
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
        uiActions.setInteractiveSegmentSelectedItem(item, 'structure');
    }

    _handleHover(item, isHovering) {
        if (this._hoverTimeout) {
            clearTimeout(this._hoverTimeout);
            this._hoverTimeout = null;
        }

        if (isHovering) {
            // Debounce hover entry to avoid thrashing when moving quickly across rows
            this._hoverTimeout = setTimeout(() => {
                uiActions.setInteractiveSegmentHighlightedItem(
                    item,
                    'Box Header'
                );
            }, 50); // 50ms delay
        } else {
            // Clear immediately on leave, but only if we're not about to enter another one
            // (The next enter will cancel this if it happens fast enough, but we want to clear if leaving the tree)
            // Actually, better to just debounce the clear too, or let the next enter override it.
            // A small delay on clear prevents flickering.
            this._hoverTimeout = setTimeout(() => {
                uiActions.setInteractiveSegmentHighlightedItem(null, null);
            }, 50);
        }
    }

    requestUpdate() {
        /** @type {any} */
        const list = this.querySelector('virtualized-list');
        if (list) list.requestUpdate();
        this.render(); // Ensure main render is called too if needed, though usually lit-html handles this via properties
    }

    _renderRow(item) {
        const {
            interactiveSegmentSelectedItem,
            interactiveSegmentHighlightedItem,
        } = useUiStore.getState();

        const isSelected =
            interactiveSegmentSelectedItem?.item?.offset === item.offset;
        const isHovered =
            interactiveSegmentHighlightedItem?.item?.offset === item.offset;

        const indent = item.depth * 12;
        const sizeText =
            item.size > 1024
                ? `${(item.size / 1024).toFixed(1)} KB`
                : `${item.size} B`;

        const colorIndex = getBoxColorIndex(item.type);
        const typeColor = getChartColorClass(colorIndex);
        const iconColorClass = isSelected
            ? 'text-white'
            : isHovered
              ? 'text-slate-100'
              : typeColor;

        let containerClass =
            'flex items-center gap-2 py-1 px-2 text-xs font-mono cursor-pointer select-none transition-all border-l-2 ';
        if (isSelected) {
            // Neon Selection
            containerClass +=
                'bg-gradient-to-r from-[#3b82f6]/20 to-transparent text-white border-[#3b82f6] z-10 relative rounded-r shadow-[0_0_15px_var(--primary-500-glow)]';
        } else if (isHovered) {
            // Glass Hover
            containerClass +=
                'bg-slate-800/60 text-slate-100 border-slate-800 relative z-10 backdrop-blur-sm';
        } else {
            containerClass +=
                'text-slate-400 border-transparent hover:bg-slate-800/40 hover:text-slate-100';
        }

        // --- Chunk Badge Logic ---
        const chunkBadge = item.chunkInfo
            ? html`<span
                  class="ml-2 px-1.5 py-0.5 rounded bg-[#3b82f6]/10 text-blue-300 border border-[#3b82f6]/20 text-[9px] font-bold uppercase tracking-wider"
                  >Chunk #${item.chunkInfo.index}</span
              >`
            : '';

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

                <span
                    class="${iconColorClass} opacity-90 scale-90 transition-colors drop-shadow-[0_0_2px_rgba(0,0,0,0.5)]"
                >
                    ${getIconForNode(item)}
                </span>

                <span
                    class="font-bold truncate ${iconColorClass} ${item.type ===
                    'mdat'
                        ? 'opacity-50'
                        : ''}"
                >
                    ${item.type}
                </span>

                ${chunkBadge}

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
                class="flex flex-col h-full overflow-hidden bg-slate-800/40 backdrop-blur-xl border-r border-slate-800 relative"
            >
                <div
                    class="shrink-0 h-10 bg-slate-800/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 shadow-sm z-10"
                >
                    <span
                        class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"
                    >
                        ${icons.folderTree} Structure
                    </span>
                </div>

                <div class="grow relative w-full min-h-0 bg-transparent">
                    <virtualized-list
                        .items=${this._flattenedItems}
                        .rowTemplate=${this._renderRow}
                        .rowHeight=${28}
                        .itemId=${(item) => item.offset}
                        class="absolute inset-0 custom-scrollbar"
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
