import { useUiStore, uiActions } from '@/state/uiStore';
import '@/ui/components/virtualized-list';
import * as icons from '@/ui/icons';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { html, render } from 'lit-html';

// Caches row offsets for a given buffer (memory optimization)
const rowCache = new WeakMap();
// Caches computed box IDs and Color Indices for a given row (CPU optimization)
const metadataCache = new WeakMap();

const getCachedRows = (buffer) => {
    if (rowCache.has(buffer)) {
        return rowCache.get(buffer);
    }
    const rowCount = Math.ceil(buffer.byteLength / 16);
    const rows = new Float64Array(rowCount);
    for (let i = 0; i < rowCount; i++) {
        rows[i] = i * 16;
    }
    rowCache.set(buffer, rows);
    metadataCache.set(buffer, new Map());
    return rows;
};

// Static color map to avoid recreation on every render
const THEME_COLOR_MAP = {
    1: 'bg-emerald-500/10 text-emerald-200',
    2: 'bg-emerald-500/30 text-emerald-300',
    3: 'bg-amber-500/30 text-amber-300',
    4: 'bg-white/5 text-slate-300',
    5: 'bg-slate-500/30 text-[#64748b]',
    6: 'bg-rose-500/30 text-[#f43f5e]',
    7: 'bg-cyan-500/30 text-[#06b6d4]',
    8: 'bg-slate-500/30 text-[#64748b]',
    9: 'bg-cyan-500/30 text-[#06b6d4]',
    10: 'bg-orange-500/30 text-[#f97316]',
};

export class HexViewComponent extends HTMLElement {
    constructor() {
        super();
        this._buffer = null;
        this._view = null;
        this._maps = null;
        this._rows = null;
        this._renderRow = this._renderRow.bind(this);

        this._state = {
            selOffset: -1,
            selEnd: -1,
            hovOffset: -1,
            hovEnd: -1,
            isFieldHover: false, // NEW: Track if hover is for a specific field
            rangeStart: -1,
            rangeEnd: -1,
        };
        this.unsubscribe = null;
        this._handleMouseLeave = this._handleMouseLeave.bind(this);
    }

    connectedCallback() {
        this.classList.add(
            'flex',
            'flex-col',
            'h-full',
            'overflow-hidden',
            'bg-white/5',
            'relative'
        );
        this.renderStructure();
        this.unsubscribe = useUiStore.subscribe((state) =>
            this._handleUiStateChange(state)
        );
        this._handleUiStateChange(useUiStore.getState());
    }

    disconnectedCallback() {
        if (this.unsubscribe) this.unsubscribe();
        this._buffer = null;
        this._view = null;
        this._rows = null;
        this._maps = null;
    }

    _handleUiStateChange(state) {
        if (!this.isConnected) return;

        const {
            interactiveSegmentSelectedItem,
            interactiveSegmentHighlightedItem,
            activeSegmentHighlightRange,
        } = state;

        const item = interactiveSegmentSelectedItem?.item;

        // FIX: Calculate end offset correctly using item size
        const newSelOffset = item?.offset ?? -1;
        const newSelEnd =
            newSelOffset !== -1
                ? newSelOffset + (typeof item.size === 'number' ? item.size : 1)
                : -1;

        let newHovOffset = -1;
        let newHovEnd = -1;

        if (interactiveSegmentHighlightedItem) {
            const { item: hItem, field } = interactiveSegmentHighlightedItem;
            if (hItem) {
                // Specific field highlighting
                if (field && hItem.details && hItem.details[field]) {
                    const fieldData = hItem.details[field];
                    if (typeof fieldData.offset === 'number') {
                        newHovOffset = fieldData.offset;
                        newHovEnd = fieldData.offset + fieldData.length;
                    }
                }

                // Fallback to whole item
                if (newHovOffset === -1 && typeof hItem.offset === 'number') {
                    newHovOffset = hItem.offset;
                    newHovEnd =
                        hItem.offset +
                        (typeof hItem.size === 'number' ? hItem.size : 1);
                }
            }
        }

        const isFieldHover =
            newHovOffset !== -1 &&
            interactiveSegmentHighlightedItem?.field !== undefined;

        const newRangeStart = activeSegmentHighlightRange?.start ?? -1;
        const newRangeEnd = activeSegmentHighlightRange?.end ?? -1;

        if (
            this._state.selOffset !== newSelOffset ||
            this._state.selEnd !== newSelEnd ||
            this._state.hovOffset !== newHovOffset ||
            this._state.hovEnd !== newHovEnd ||
            this._state.isFieldHover !== isFieldHover ||
            this._state.rangeStart !== newRangeStart ||
            this._state.rangeEnd !== newRangeEnd
        ) {
            this._state = {
                selOffset: newSelOffset,
                selEnd: newSelEnd,
                hovOffset: newHovOffset,
                hovEnd: newHovEnd,
                isFieldHover,
                rangeStart: newRangeStart,
                rangeEnd: newRangeEnd,
            };
            /** @type {any} */
            const list = this.querySelector('virtualized-list');
            if (list) {
                list.requestUpdate();
            }
        }
    }

    set data({ buffer, maps }) {
        if (this._buffer !== buffer) {
            this._buffer = buffer;
            this._view = new Uint8Array(buffer);
            this._rows = getCachedRows(buffer);
            this._maps = maps;

            /** @type {any} */
            const list = this.querySelector('virtualized-list');
            if (list) {
                list.items = this._rows;
            } else {
                this.renderStructure();
            }
        } else if (this._maps !== maps) {
            if (this._buffer) metadataCache.set(this._buffer, new Map());
            this._maps = maps;

            /** @type {any} */
            const list = this.querySelector('virtualized-list');
            if (list) list.requestUpdate();
        }
    }

    handleCopy(mode) {
        if (!this._view) return;
        const limit = Math.min(this._view.length, 100 * 1024);
        const viewSlice = this._view.subarray(0, limit);
        let text = '';
        if (mode === 'hex') {
            text = Array.from(viewSlice)
                .map((b) => b.toString(16).padStart(2, '0'))
                .join(' ');
        } else {
            text = Array.from(viewSlice)
                .map((b) =>
                    b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'
                )
                .join('');
        }
        copyTextToClipboard(
            text,
            `${mode.toUpperCase()} copied! ${limit < this._view.length ? '(Truncated to 100KB)' : ''}`
        );
    }

    _handleMouseLeave() {
        // Clear hover state when mouse leaves the grid
        uiActions.setInteractiveSegmentHighlightedItem(null, null);
    }

    _computeRowStyles(rowStart) {
        const cache = this._buffer ? metadataCache.get(this._buffer) : null;
        if (cache && cache.has(rowStart)) {
            return cache.get(rowStart);
        }

        const rowEnd = rowStart + 16;
        const rowColors = new Int8Array(16).fill(-1);
        const rowIds = new Float64Array(16).fill(-1);

        if (!this._maps) {
            const result = { rowColors, rowIds };
            if (cache) cache.set(rowStart, result);
            return result;
        }

        if (this._maps.packetMap) {
            const { packetMap } = this._maps;
            const TS_SIZE = 188;
            for (let i = 0; i < 16; i++) {
                const byteOffset = rowStart + i;
                const packetIndex = Math.floor(byteOffset / TS_SIZE);
                if (packetIndex < packetMap.length) {
                    rowColors[i] = packetMap[packetIndex];
                    rowIds[i] = packetIndex;
                }
            }
            const result = { rowColors, rowIds };
            if (cache) cache.set(rowStart, result);
            return result;
        }

        if (this._maps.boxLayout) {
            const { boxLayout } = this._maps;
            const STRIDE = 6;
            const numBoxes = boxLayout.length / STRIDE;
            let low = 0,
                high = numBoxes;
            while (low < high) {
                const mid = (low + high) >>> 1;
                if (boxLayout[mid * STRIDE + 1] <= rowStart) low = mid + 1;
                else high = mid;
            }

            for (let i = low; i < numBoxes; i++) {
                const base = i * STRIDE;
                const start = boxLayout[base];
                const end = boxLayout[base + 1];
                if (start >= rowEnd) break;
                const drawStart = Math.max(rowStart, start);
                const drawEnd = Math.min(rowEnd, end);

                if (drawEnd > drawStart) {
                    const color = boxLayout[base + 2];
                    const id = boxLayout[base + 3];
                    const relStart = drawStart - rowStart;
                    const relEnd = drawEnd - rowStart;
                    for (let k = relStart; k < relEnd; k++) {
                        rowColors[k] = color;
                        rowIds[k] = id;
                    }
                }
            }

            const result = { rowColors, rowIds };
            if (cache) cache.set(rowStart, result);
            return result;
        }

        return { rowColors, rowIds };
    }

    _renderRow(rowOffset) {
        if (!this._view) return html``;

        const rowStartOffset = rowOffset;
        const endOffset = Math.min(rowStartOffset + 16, this._view.length);
        const {
            selOffset,
            selEnd,
            hovOffset,
            hovEnd,
            isFieldHover,
            rangeStart,
            rangeEnd,
        } = this._state;
        // const palette = this._maps?.palette || [];
        const { rowColors, rowIds } = this._computeRowStyles(rowStartOffset);

        const byteNodes = new Array(16);
        const asciiNodes = new Array(16);

        // Pre-calculate range checks for the whole row to avoid repeated checks
        const rowSelStart = Math.max(0, selOffset - rowStartOffset);
        const rowSelEnd = Math.min(16, selEnd - rowStartOffset);
        const rowHovStart = Math.max(0, hovOffset - rowStartOffset);
        const rowHovEnd = Math.min(16, hovEnd - rowStartOffset);
        const rowRangeStart = Math.max(0, rangeStart - rowStartOffset);
        const rowRangeEnd = Math.min(16, rangeEnd - rowStartOffset);

        for (let i = 0; i < 16; i++) {
            const byteOffset = rowStartOffset + i;

            if (byteOffset >= endOffset) {
                const paddingClass =
                    i > 0
                        ? 'inline-block w-6 h-5 text-center text-slate-400/20 border border-transparent -ml-px'
                        : 'inline-block w-6 h-5 text-center text-slate-400/20 border border-transparent';

                byteNodes[i] = html`<span class="${paddingClass}">..</span>`;
                asciiNodes[i] = html`<span
                    class="inline-block w-4 h-5 text-center text-slate-400/20 border border-transparent"
                    >.</span
                >`;
                continue;
            }

            const byte = this._view[byteOffset];
            const colorIdx = rowColors[i];

            // Optimized checks using local indices
            const isSelected = i >= rowSelStart && i < rowSelEnd;
            const isHovered = i >= rowHovStart && i < rowHovEnd;
            const isRange =
                !isSelected &&
                !isHovered &&
                rangeStart !== -1 &&
                i >= rowRangeStart &&
                i <= rowRangeEnd;

            let bgClass = '';
            let textClass = 'text-slate-400';
            let borderClass = 'border-transparent';

            // Precedence: Field Hover > Selection > Box Hover
            if (isHovered && isFieldHover) {
                // Field Hover (Highest Priority)
                bgClass = 'bg-white/5';
                textClass = 'text-slate-100 font-bold';
            } else if (isSelected) {
                // Selection (Medium Priority)
                bgClass = 'bg-[#3b82f6] z-10';
                textClass = 'text-slate-100 font-bold';
            } else if (isHovered) {
                // Box Hover (Lowest Priority)
                bgClass = 'bg-white/5';
                textClass = 'text-slate-100 font-bold';
            } else if (isRange) {
                bgClass = 'bg-[var(--secondary-500)]/20';
                textClass = 'text-slate-200';
            } else if (colorIdx !== -1 && THEME_COLOR_MAP[colorIdx]) {
                const styles = THEME_COLOR_MAP[colorIdx].split(' ');
                bgClass = styles[0];
                textClass = 'text-slate-200';
            }

            const isActive = isSelected || isHovered;
            let style = '';

            if (isActive) {
                const checkNeighbor = (offset) => {
                    if (isHovered && isFieldHover)
                        return offset >= hovOffset && offset < hovEnd;
                    if (isSelected)
                        return offset >= selOffset && offset < selEnd;
                    if (isHovered)
                        return (
                            offset >= hovOffset &&
                            offset < hovEnd &&
                            !(offset >= selOffset && offset < selEnd)
                        );
                    return false;
                };

                const isTopSame = checkNeighbor(byteOffset - 16);
                const isBottomSame = checkNeighbor(byteOffset + 16);
                const isLeftSame = i > 0 && checkNeighbor(byteOffset - 1);
                const isRightSame = i < 15 && checkNeighbor(byteOffset + 1);

                // Strong border for outer edges, subtle border for inner edges
                const strongAlpha =
                    isHovered && isFieldHover ? 0.8 : isSelected ? 0.6 : 0.4;
                const subtleAlpha = 0.1;

                const t = !isTopSame ? strongAlpha : subtleAlpha;
                const b = !isBottomSame ? strongAlpha : subtleAlpha;
                const l = !isLeftSame ? strongAlpha : subtleAlpha;
                const r = !isRightSame ? strongAlpha : subtleAlpha;

                style = `border-color: rgba(255, 255, 255, ${t}) rgba(255, 255, 255, ${r}) rgba(255, 255, 255, ${b}) rgba(255, 255, 255, ${l});`;
            } else if (colorIdx !== -1) {
                const currentId = rowIds[i];
                const subtleAlpha = 0.2;

                // Left/Right check within the row
                const l =
                    i > 0 && rowIds[i - 1] !== currentId ? subtleAlpha : 0;
                const r =
                    i < 15 && rowIds[i + 1] !== currentId ? subtleAlpha : 0;

                // Top/Bottom check using cached rows
                let t = 0;
                if (rowStartOffset >= 16) {
                    const prevRow = this._computeRowStyles(rowStartOffset - 16);
                    if (prevRow && prevRow.rowIds[i] !== currentId)
                        t = subtleAlpha;
                }

                let b = 0;
                if (rowStartOffset + 16 < this._view.length) {
                    const nextRow = this._computeRowStyles(rowStartOffset + 16);
                    if (nextRow && nextRow.rowIds[i] !== currentId)
                        b = subtleAlpha;
                }

                if (t || r || b || l) {
                    style = `border-color: rgba(255, 255, 255, ${t}) rgba(255, 255, 255, ${r}) rgba(255, 255, 255, ${b}) rgba(255, 255, 255, ${l});`;
                }
            }

            const hexByte = byte.toString(16).padStart(2, '0').toUpperCase();
            const char =
                byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.';

            const spacingClass = '';

            byteNodes[i] = html`<span
                class="inline-block text-center w-6 h-5 leading-5 text-[11px] cursor-crosshair relative border ${bgClass} ${textClass} ${borderClass} ${spacingClass}"
                style="${style}"
                data-byte-offset="${byteOffset}"
                >${hexByte}</span
            >`;
            asciiNodes[i] = html`<span
                class="inline-block text-center w-4 h-5 leading-5 text-[11px] relative border ${bgClass} ${textClass} ${borderClass} ${spacingClass} cursor-crosshair"
                style="${style}"
                data-byte-offset="${byteOffset}"
                >${char}</span
            >`;
        }

        return html`
            <div
                class="flex font-mono h-5 hover:bg-white/10 min-w-[580px]"
                style="contain: content; transform: translateZ(0);"
            >
                <div
                    class="w-24 text-right pr-4 text-slate-400 select-none bg-white/5 border-r border-white/10 shrink-0 text-[10px] leading-5"
                >
                    ${rowStartOffset
                        .toString(16)
                        .padStart(8, '0')
                        .toUpperCase()}
                </div>
                <div class="flex px-3 select-none shrink-0">${byteNodes}</div>
                <div class="w-px bg-white/5 mx-2 shrink-0"></div>
                <div class="flex select-none shrink-0">${asciiNodes}</div>
            </div>
        `;
    }

    renderStructure() {
        const fileSizeKB = this._buffer
            ? (this._buffer.byteLength / 1024).toFixed(2)
            : '0.00';
        const template = html`
            <div
                class="shrink-0 h-10 bg-white/5 border-b border-white/10 flex items-center justify-between px-4 z-30 relative"
            >
                <div
                    class="text-xs font-bold text-slate-400 flex items-center gap-2"
                >
                    ${icons.binary}
                    <span class="r"
                        >Bitstream Explorer</span
                    >
                    <span
                        class="bg-white/5 text-slate-400 px-1.5 rounded border border-white/10 font-mono"
                        >${fileSizeKB} KB</span
                    >
                </div>
                <div class="flex gap-1">
                    <button
                        @click=${() => this.handleCopy('hex')}
                        class="p-1.5 text-slate-400 hover:text-slate-100 transition-colors rounded hover:bg-white/10"
                        title="Copy Hex"
                    >
                        ${icons.clipboardCopy}
                    </button>
                </div>
            </div>

            <div
                class="flex bg-white/5 border-b border-white/10 text-[10px] font-bold text-slate-400 py-1.5 select-none z-20 font-mono min-w-[580px] overflow-hidden"
            >
                <div class="w-24 text-right pr-4 shrink-0">Offset</div>
                <div class="w-[384px] px-3 shrink-0">
                    Hexadecimal (16 bytes)
                </div>
                <div class="pl-4 shrink-0">ASCII</div>
            </div>

            <div
                class="grow relative bg-transparent overflow-auto custom-scrollbar"
                id="hex-grid-content"
                @mouseleave=${this._handleMouseLeave}
            >
                <div class="absolute inset-0 min-w-[580px]" translate="no">
                    <virtualized-list
                        class="h-full w-full"
                        .items=${this._rows || []}
                        .rowTemplate=${this._renderRow}
                        .rowHeight=${20}
                        .itemId=${(item) => item}
                    ></virtualized-list>
                </div>
            </div>
        `;
        render(template, this);
    }
}

customElements.define('hex-view-component', HexViewComponent);

export const hexViewTemplate = (buffer, maps) => {
    return html`<hex-view-component
        .data=${{ buffer, maps }}
    ></hex-view-component>`;
};
