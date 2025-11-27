import { useUiStore } from '@/state/uiStore';
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
            rangeStart: -1,
            rangeEnd: -1,
        };
        this.unsubscribe = null;
    }

    connectedCallback() {
        this.classList.add(
            'flex',
            'flex-col',
            'h-full',
            'overflow-hidden',
            'bg-slate-950',
            'border-x',
            'border-slate-800',
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

        const newSelOffset = interactiveSegmentSelectedItem?.item?.offset ?? -1;
        const newSelEnd =
            newSelOffset !== -1
                ? newSelOffset +
                  (interactiveSegmentSelectedItem?.item?.size || 1)
                : -1;

        let newHovOffset = -1;
        let newHovEnd = -1;

        if (interactiveSegmentHighlightedItem) {
            const { item, field } = interactiveSegmentHighlightedItem;
            if (item) {
                // Specific field highlighting (e.g. from Inspector hover)
                if (field && item.details && item.details[field]) {
                    const fieldData = item.details[field];
                    if (typeof fieldData.offset === 'number') {
                        newHovOffset = fieldData.offset;
                        newHovEnd = fieldData.offset + fieldData.length;
                    }
                }

                // Fallback to whole item highlighting if no field specified or found
                if (newHovOffset === -1 && typeof item.offset === 'number') {
                    newHovOffset = item.offset;
                    newHovEnd = item.offset + (item.size || 1);
                }
            }
        }

        const newRangeStart = activeSegmentHighlightRange?.start ?? -1;
        const newRangeEnd = activeSegmentHighlightRange?.end ?? -1;

        if (
            this._state.selOffset !== newSelOffset ||
            this._state.selEnd !== newSelEnd ||
            this._state.hovOffset !== newHovOffset ||
            this._state.hovEnd !== newHovEnd ||
            this._state.rangeStart !== newRangeStart ||
            this._state.rangeEnd !== newRangeEnd
        ) {
            this._state = {
                selOffset: newSelOffset,
                selEnd: newSelEnd,
                hovOffset: newHovOffset,
                hovEnd: newHovEnd,
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

    _computeRowStyles(rowStart) {
        const cache = this._buffer ? metadataCache.get(this._buffer) : null;
        if (cache && cache.has(rowStart)) {
            return cache.get(rowStart);
        }

        const rowEnd = rowStart + 16;
        const rowColors = new Int8Array(16).fill(-1);

        if (!this._maps) {
            const result = { rowColors };
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
                }
            }
            const result = { rowColors };
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
                    const relStart = drawStart - rowStart;
                    const relEnd = drawEnd - rowStart;
                    for (let k = relStart; k < relEnd; k++) {
                        rowColors[k] = color;
                    }
                }
            }

            const result = { rowColors };
            if (cache) cache.set(rowStart, result);
            return result;
        }

        return { rowColors };
    }

    _renderRow(rowOffset) {
        if (!this._view) return html``;

        const rowStartOffset = rowOffset;
        const endOffset = Math.min(rowStartOffset + 16, this._view.length);
        const { selOffset, selEnd, hovOffset, hovEnd, rangeStart, rangeEnd } =
            this._state;
        const palette = this._maps?.palette || [];
        const { rowColors } = this._computeRowStyles(rowStartOffset);

        const byteNodes = new Array(16);
        const asciiNodes = new Array(16);

        for (let i = 0; i < 16; i++) {
            const byteOffset = rowStartOffset + i;

            if (byteOffset >= endOffset) {
                byteNodes[i] = html`<span
                    class="inline-block w-6 h-5 text-center text-slate-800"
                    >..</span
                >`;
                asciiNodes[i] = html`<span
                    class="inline-block w-4 h-5 text-center text-slate-800"
                    >.</span
                >`;
                continue;
            }

            const byte = this._view[byteOffset];
            const colorIdx = rowColors[i];

            let baseClass = '';
            let textClass = 'text-slate-400';

            if (colorIdx !== -1 && palette[colorIdx]) {
                const colorName = palette[colorIdx];
                if (colorName === 'slate') {
                    baseClass = 'bg-slate-800/60';
                } else {
                    baseClass = `bg-${colorName}-900/40`;
                    textClass = 'text-slate-300';
                }
            }

            let highlightClass = '';
            const isSelected = byteOffset >= selOffset && byteOffset < selEnd;
            const isHovered =
                !isSelected && byteOffset >= hovOffset && byteOffset < hovEnd;
            const isRange =
                rangeStart !== -1 &&
                byteOffset >= rangeStart &&
                byteOffset <= rangeEnd;

            if (isSelected) {
                highlightClass =
                    'bg-blue-600 font-bold text-white z-10 shadow-sm';
                textClass = 'text-white';
            } else if (isHovered) {
                // Solid hover state
                highlightClass = 'bg-slate-700 text-white z-10';
                textClass = 'text-white';
            } else if (isRange) {
                baseClass = 'bg-yellow-500/30';
                textClass = 'text-yellow-100';
            }

            const hexByte = byte.toString(16).padStart(2, '0').toUpperCase();
            const char =
                byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.';

            byteNodes[i] = html`<span
                class="inline-block text-center w-6 h-5 leading-5 text-[11px] cursor-crosshair relative ${baseClass} ${highlightClass} ${textClass}"
                data-byte-offset="${byteOffset}"
                >${hexByte}</span
            >`;
            asciiNodes[i] = html`<span
                class="inline-block text-center w-4 h-5 leading-5 text-[11px] relative ${baseClass} ${highlightClass} ${textClass}"
                >${char}</span
            >`;
        }

        return html`
            <div
                class="flex font-mono h-5 hover:bg-white/[0.03] min-w-[580px]"
                style="contain: content; transform: translateZ(0);"
            >
                <div
                    class="w-24 text-right pr-4 text-slate-500 select-none bg-slate-900/50 border-r border-slate-800 shrink-0 text-[10px] leading-5"
                >
                    ${rowStartOffset
                        .toString(16)
                        .padStart(8, '0')
                        .toUpperCase()}
                </div>
                <div class="flex px-3 select-none shrink-0 gap-px">
                    ${byteNodes}
                </div>
                <div class="w-px bg-slate-800/50 mx-2 shrink-0"></div>
                <div class="flex select-none shrink-0 gap-px">
                    ${asciiNodes}
                </div>
            </div>
        `;
    }

    renderStructure() {
        const fileSizeKB = this._buffer
            ? (this._buffer.byteLength / 1024).toFixed(2)
            : '0.00';
        const template = html`
            <div
                class="shrink-0 h-10 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shadow-sm z-30 relative"
            >
                <div
                    class="text-xs font-bold text-slate-400 flex items-center gap-2"
                >
                    ${icons.binary}
                    <span class="uppercase tracking-wider"
                        >Bitstream Explorer</span
                    >
                    <span
                        class="bg-slate-800 text-slate-500 px-1.5 rounded border border-slate-700/50 font-mono"
                        >${fileSizeKB} KB</span
                    >
                </div>
                <div class="flex gap-1">
                    <button
                        @click=${() => this.handleCopy('hex')}
                        class="p-1.5 text-slate-500 hover:text-white transition-colors rounded hover:bg-slate-800"
                        title="Copy Hex"
                    >
                        ${icons.clipboardCopy}
                    </button>
                </div>
            </div>

            <div
                class="flex bg-slate-900/95 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase py-1.5 select-none z-20 backdrop-blur font-mono min-w-[580px] overflow-hidden"
            >
                <div class="w-24 text-right pr-4 shrink-0">Offset</div>
                <div class="w-[384px] px-3 shrink-0">
                    Hexadecimal (16 bytes)
                </div>
                <div class="pl-4 shrink-0">ASCII</div>
            </div>

            <div
                class="grow relative bg-slate-900 overflow-auto"
                id="hex-grid-content"
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
