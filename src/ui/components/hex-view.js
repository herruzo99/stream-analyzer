import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';

const escapeHtml = (str) => {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
};

/**
 * Renders the full grid content as three separate HTML strings for each column.
 * @param {Uint8Array} view - The byte array view.
 * @param {number} start - The starting byte offset to render.
 * @param {number} end - The ending byte offset to render.
 * @param {Map<number, object>} byteMap - The pre-built map of byte properties.
 * @param {object} allTooltips - The aggregated tooltip data for all formats.
 * @returns {{offsets: string, hexes: string, asciis: string}}
 */
function renderHexGridContent(view, start, end, byteMap, allTooltips) {
    let offsetsHtml = '';
    let hexHtml = '';
    let asciiHtml = '';

    const rowCount = Math.ceil((end - start) / 16);

    for (let row = 0; row < rowCount; row++) {
        const rowStartOffset = start + row * 16;
        offsetsHtml += `<div class="text-gray-500 select-none text-right">${rowStartOffset
            .toString(16)
            .padStart(8, '0')
            .toUpperCase()}</div>`;

        let hexRow = '';
        let asciiRow = '';

        for (let col = 0; col < 16; col++) {
            const byteOffset = rowStartOffset + col;
            if (byteOffset < end) {
                const byte = view[byteOffset];
                const mapEntry = byteMap.get(byteOffset);
                const prevMapEntry = byteMap.get(byteOffset - 1);

                let tooltipText = '';
                let isoRefText = '';
                let fieldBoundaryClass = '';
                let isClearStyle = '';

                if (mapEntry) {
                    const item =
                        mapEntry.box || mapEntry.packet || mapEntry.sample;
                    const fieldName = mapEntry.fieldName;
                    const itemType = item?.type;

                    if (mapEntry.isClear) {
                        isClearStyle = 'clear-byte-pattern';
                    }

                    if (item?.isSample) {
                        tooltipText = `Sample ${item.index}`;
                    } else {
                        const fieldTooltipKey = itemType
                            ? `${itemType}@${fieldName}`
                            : fieldName;
                        const fieldInfo = allTooltips[fieldTooltipKey];
                        const boxInfo = allTooltips[itemType];

                        if (fieldInfo) {
                            tooltipText = fieldInfo.text;
                            isoRefText = fieldInfo.ref || '';
                        } else if (boxInfo) {
                            tooltipText = `${fieldName} in ${itemType}`;
                            isoRefText = boxInfo.ref || '';
                        } else if (fieldName) {
                            tooltipText = fieldName;
                        } else {
                            tooltipText = 'Unknown Data';
                        }
                    }

                    if (
                        prevMapEntry &&
                        mapEntry.fieldName !== prevMapEntry.fieldName &&
                        item?.offset ===
                            (
                                prevMapEntry.box ||
                                prevMapEntry.packet ||
                                prevMapEntry.sample
                            )?.offset &&
                        byteOffset % 16 !== 0
                    ) {
                        fieldBoundaryClass = 'border-l-2 border-white/10';
                    }
                }

                const bgClass = mapEntry?.color?.bgClass || '';
                const hexByte = byte
                    .toString(16)
                    .padStart(2, '0')
                    .toUpperCase();
                const commonAttrs = `data-byte-offset="${byteOffset}" data-tooltip="${escapeHtml(
                    tooltipText
                )}" data-iso="${escapeHtml(isoRefText)}"`;
                hexRow += `<span ${commonAttrs} class="hex-byte relative ${bgClass} ${fieldBoundaryClass} ${isClearStyle}">${hexByte}</span>`;

                const asciiChar =
                    byte >= 32 && byte <= 126
                        ? String.fromCharCode(byte).replace('<', '&lt;')
                        : '.';
                asciiRow += `<span ${commonAttrs} class="ascii-char relative ${bgClass} ${fieldBoundaryClass} ${isClearStyle}">${asciiChar}</span>`;
            } else {
                hexRow += '<span></span>';
                asciiRow += '<span></span>';
            }
        }
        hexHtml += `<div class="hex-row">${hexRow}</div>`;
        asciiHtml += `<div class="ascii-row">${asciiRow}</div>`;
    }
    return { offsets: offsetsHtml, hexes: hexHtml, asciis: asciiHtml };
}

export const hexViewTemplate = (
    buffer,
    byteMap,
    currentPage,
    bytesPerPage,
    onPageChange,
    allTooltips
) => {
    const totalPages = Math.ceil(buffer.byteLength / bytesPerPage);
    const startOffset = (currentPage - 1) * bytesPerPage;
    const view = new Uint8Array(buffer);
    const endByte = Math.min(startOffset + bytesPerPage, view.length);

    const { offsets, hexes, asciis } = renderHexGridContent(
        view,
        startOffset,
        endByte,
        byteMap,
        allTooltips
    );

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
            class="bg-slate-800 rounded-lg font-mono text-sm leading-relaxed flex flex-col"
        >
            <div class="grow overflow-y-auto p-4">
                <div
                    class="grid grid-cols-[auto_1fr_auto] gap-x-4 sticky top-0 bg-slate-800 pb-2 mb-2 border-b border-gray-600 z-20"
                >
                    <div class="text-gray-400 font-semibold text-right">
                        Offset
                    </div>
                    <div class="text-gray-400 font-semibold text-center">
                        Hexadecimal
                    </div>
                    <div class="text-gray-400 font-semibold text-center">
                        ASCII
                    </div>
                </div>
                <div
                    id="hex-grid-content"
                    class="grid grid-cols-[auto_1fr_auto] gap-x-4"
                >
                    <div class="pr-4 leading-loose">${unsafeHTML(offsets)}</div>
                    <div class="hex-content-grid leading-loose">
                        ${unsafeHTML(hexes)}
                    </div>
                    <div class="text-cyan-400 ascii-content-grid leading-loose">
                        ${unsafeHTML(asciis)}
                    </div>
                </div>
            </div>

            ${totalPages > 1
                ? html`
                      <div
                          class="shrink-0 text-center text-sm text-gray-500 py-2 border-t border-gray-700"
                      >
                          Showing bytes ${startOffset} -
                          ${Math.min(
                              startOffset + bytesPerPage - 1,
                              buffer.byteLength - 1
                          )}
                          of ${buffer.byteLength}
                          (${(buffer.byteLength / 1024).toFixed(2)} KB)
                          <div>
                              <button
                                  @click=${() => onPageChange(-1)}
                                  ?disabled=${currentPage === 1}
                                  class="px-2 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-1"
                              >
                                  &lt;
                              </button>
                              Page ${currentPage} of ${totalPages}
                              <button
                                  @click=${() => onPageChange(1)}
                                  ?disabled=${currentPage === totalPages}
                                  class="px-2 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-1"
                              >
                                  &gt;
                              </button>
                          </div>
                      </div>
                  `
                : ''}
        </div>
    `;
};