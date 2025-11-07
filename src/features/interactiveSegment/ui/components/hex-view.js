import { html } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map.js';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import * as icons from '@/ui/icons';
import '@/ui/components/virtualized-list';
import { useUiStore } from '@/state/uiStore';

const escapeHtml = (str) => {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
};

/**
 * Renders a single row for the virtualized hex grid.
 * @param {{offset: number}} row - An object representing the row to render.
 * @param {number} index - The index of the row.
 * @param {Uint8Array} view - The byte array view.
 * @param {Map<number, object>} fullByteMap - The pre-built map of all byte properties for the segment.
 * @param {object} allTooltips - The aggregated tooltip data for all formats.
 * @returns {import('lit-html').TemplateResult}
 */
const renderHexRow = (row, index, view, fullByteMap, allTooltips) => {
    const {
        interactiveSegmentSelectedItem,
        interactiveSegmentHighlightedItem,
    } = useUiStore.getState();

    const rowStartOffset = row.offset;
    const hexSpans = [];
    const asciiSpans = [];
    const endOffset = Math.min(rowStartOffset + 16, view.length);

    for (
        let byteOffset = rowStartOffset;
        byteOffset < endOffset;
        byteOffset++
    ) {
        const byte = view[byteOffset];
        const mapEntry = fullByteMap.get(byteOffset);
        const item = mapEntry?.box || mapEntry?.packet || mapEntry?.sample;
        const fieldName = mapEntry?.fieldName;

        let tooltipText = '';
        let isoRefText = '';

        if (mapEntry) {
            if (item?.isSample) {
                tooltipText = `Sample ${item.index}`;
            } else {
                const itemType = item?.type;
                const fieldTooltipKey = itemType
                    ? `${itemType}@${fieldName}`
                    : fieldName;
                const fieldInfo = allTooltips[fieldTooltipKey];
                tooltipText = fieldInfo?.text || fieldName || 'Unknown Data';
                isoRefText = fieldInfo?.ref || '';
            }
        }

        const isSelected =
            item &&
            interactiveSegmentSelectedItem?.item?.offset === item.offset;
        const isHovered =
            item &&
            interactiveSegmentHighlightedItem?.item?.offset === item.offset;
        const isFieldHovered =
            isHovered && interactiveSegmentHighlightedItem?.field === fieldName;

        const baseClasses = {
            relative: true,
            [mapEntry?.color?.bgClass || '']: !!mapEntry?.color?.bgClass,
            'highlight-hover-field': isFieldHovered,
            'highlight-select-box': isSelected,
            'highlight-hover-box': isHovered && !isFieldHovered,
        };

        const hexClasses = { ...baseClasses, 'hex-byte': true };
        const asciiClasses = { ...baseClasses, 'ascii-char': true };

        const hexByte = byte.toString(16).padStart(2, '0').toUpperCase();
        hexSpans.push(
            html`<span
                data-byte-offset="${byteOffset}"
                data-tooltip="${escapeHtml(tooltipText)}"
                data-iso="${escapeHtml(isoRefText)}"
                class=${classMap(hexClasses)}
                >${hexByte}</span
            >`
        );

        const asciiChar =
            byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.';
        asciiSpans.push(
            html`<span
                data-byte-offset="${byteOffset}"
                data-tooltip="${escapeHtml(tooltipText)}"
                data-iso="${escapeHtml(isoRefText)}"
                class=${classMap(asciiClasses)}
                >${asciiChar}</span
            >`
        );
    }

    return html`
        <div class="flex">
            <div
                class="text-slate-500 select-none text-right shrink-0 w-24 pr-4"
            >
                ${rowStartOffset.toString(16).padStart(8, '0').toUpperCase()}
            </div>
            <div class="hex-row grow border-r border-slate-700 pr-2 mr-2">
                ${hexSpans}
            </div>
            <div class="ascii-row shrink-0 w-40 pl-2">${asciiSpans}</div>
        </div>
    `;
};

export const hexViewTemplate = (buffer, fullByteMap, allTooltips) => {
    const view = new Uint8Array(buffer);
    const rowCount = Math.ceil(view.length / 16);
    const rows = Array.from({ length: rowCount }, (_, i) => ({
        offset: i * 16,
    }));

    const handleCopyHex = () => {
        const hexString = Array.from(view)
            .map((byte) => byte.toString(16).padStart(2, '0').toUpperCase())
            .join(' ');
        copyTextToClipboard(hexString, 'Hex data copied to clipboard!');
    };

    const handleCopyAscii = () => {
        const asciiString = Array.from(view)
            .map((byte) =>
                byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.'
            )
            .join('');
        copyTextToClipboard(asciiString, 'ASCII data copied to clipboard!');
    };

    const rowRenderer = (row, index) =>
        renderHexRow(row, index, view, fullByteMap, allTooltips);

    return html`
        <style>
            .hex-row,
            .ascii-row {
                display: grid;
                grid-template-columns: repeat(16, minmax(0, 1fr));
            }
            .hex-byte,
            .ascii-char {
                text-align: center;
                padding: 0 0.125rem;
            }
            .clear-byte-pattern {
                background-image: repeating-linear-gradient(
                    45deg,
                    transparent,
                    transparent 2px,
                    rgba(255, 255, 255, 0.1) 2px,
                    rgba(255, 255, 255, 0.1) 4px
                );
            }
        </style>
        <div
            class="bg-slate-900 rounded-lg font-mono text-sm leading-relaxed flex flex-col h-full border border-slate-700"
        >
            <div
                class="flex items-center justify-between p-2 border-b border-slate-700 shrink-0"
            >
                <div class="flex items-center gap-2">
                    <button
                        @click=${handleCopyHex}
                        class="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded flex items-center gap-1.5"
                    >
                        ${icons.clipboardCopy} Copy Hex
                    </button>
                    <button
                        @click=${handleCopyAscii}
                        class="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded flex items-center gap-1.5"
                    >
                        ${icons.clipboardCopy} Copy ASCII
                    </button>
                </div>
                <div class="text-xs text-slate-500">
                    Total Size: ${(buffer.byteLength / 1024).toFixed(2)} KB
                </div>
            </div>
            <div
                class="sticky top-0 bg-slate-800 z-10 flex text-xs font-semibold text-slate-400"
            >
                <div class="shrink-0 w-24 pr-4 text-right">Offset</div>
                <div
                    class="grow text-center border-r border-slate-700 pr-2 mr-2"
                >
                    Hexadecimal
                </div>
                <div class="shrink-0 w-40 text-center pl-2">ASCII</div>
            </div>
            <virtualized-list
                .items=${rows}
                .rowTemplate=${rowRenderer}
                .rowHeight=${22}
                .itemId=${(item) => item.offset}
                class="grow"
                id="hex-grid-content"
            ></virtualized-list>
        </div>
    `;
};
