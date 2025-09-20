import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { analysisState } from '../../core/state.js';
import { generateHexAsciiView } from './logic.js';

/**
 * Renders a simplified hex/ASCII view for a Transport Stream segment.
 * This view omits the ISOBMFF-specific box tree and inspector panel.
 */
export function getInteractiveTsTemplate() {
    const { activeSegmentUrl, segmentCache } = analysisState;
    const cachedSegment = segmentCache.get(activeSegmentUrl);

    const hexViewTemplate = (buffer) => {
        const viewModel = generateHexAsciiView(buffer); // No parsed data
        return html`
            <div
                class="bg-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto"
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
                        <div class="flex items-center hover:bg-slate-700/50">
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
        `;
    };

    return html`
        <div class="text-sm text-gray-400 mb-2">
            Displaying raw hex view for Transport Stream segment. Box structure analysis is not applicable.
        </div>
        ${hexViewTemplate(cachedSegment.data)}
    `;
}