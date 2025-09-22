import { html, render } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { generateHexAsciiView } from './logic.js';
import { dom } from '../../core/state.js';

/**
 * A shared, reusable component for rendering a Hex/ASCII view of an ArrayBuffer.
 * It includes pagination and dispatches re-renders.
 * @param {ArrayBuffer} buffer
 * @param {object[] | null} parsedData
 * @param {number} currentPage
 * @param {number} bytesPerPage
 * @param {() => void} onPageChange - A callback to trigger a re-render of the parent view.
 * @returns {import('lit-html').TemplateResult}
 */
export const hexViewTemplate = (buffer, parsedData, currentPage, bytesPerPage, onPageChange) => {
    const totalPages = Math.ceil(buffer.byteLength / bytesPerPage);
    const startOffset = (currentPage - 1) * bytesPerPage;
    const viewModel = generateHexAsciiView(buffer, parsedData, startOffset, bytesPerPage);

    return html`
        <div
            class="bg-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto hex-viewer-area h-full"
        >
            <div
                class="flex sticky top-0 bg-slate-800 pb-2 mb-2 border-b border-gray-600 z-10"
            >
                <div class="w-24 flex-shrink-0 text-gray-400 font-semibold">
                    Offset
                </div>
                <div class="text-gray-400 font-semibold">Hexadecimal</div>
                <div
                    class="w-64 flex-shrink-0 text-gray-400 font-semibold ml-4"
                >
                    ASCII
                </div>
            </div>

            ${viewModel.map(
                (row) => html`
                    <div
                        class="flex items-center hover:bg-slate-700/50"
                        data-row-offset="${parseInt(row.offset, 16)}"
                    >
                        <div
                            class="w-24 flex-shrink-0 text-gray-500 font-mono"
                        >
                            ${row.offset}
                        </div>
                        <div class="font-mono flex items-center">
                            ${unsafeHTML(row.hex)}
                        </div>
                        <div
                            class="w-64 flex-shrink-0 text-cyan-400 font-mono tracking-wider ml-4 flex items-center"
                        >
                            ${unsafeHTML(row.ascii)}
                        </div>
                    </div>
                `
            )}
        </div>

        ${totalPages > 1
            ? html`
                  <div class="text-center text-sm text-gray-500 mt-2">
                      Showing bytes ${startOffset} -
                      ${Math.min(startOffset + bytesPerPage - 1, buffer.byteLength - 1)}
                      of ${buffer.byteLength} ($
                      {(buffer.byteLength / 1024).toFixed(2)} KB)
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
              `
            : ''}
    `;
};