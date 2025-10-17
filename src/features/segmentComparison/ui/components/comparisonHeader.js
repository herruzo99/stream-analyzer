import { html } from 'lit-html';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import * as icons from '@/ui/icons';

/**
 * Renders the header for a single segment column in the comparison view.
 * @param {object} header - The header data for one segment.
 * @returns {import('lit-html').TemplateResult}
 */
const headerCardTemplate = (header) => {
    return html`
        <div
            class="bg-gray-800 p-3 rounded-lg border border-gray-700 h-full flex flex-col justify-between"
        >
            <div>
                <p class="font-bold text-gray-200">${header.streamName}</p>
                <p class="text-sm text-gray-400">
                    Segment #${header.segmentNumber}
                </p>
            </div>
            <div class="mt-2">
                <button
                    @click=${() =>
                        copyTextToClipboard(
                            header.segmentUrl,
                            'Segment URL copied!'
                        )}
                    class="text-xs font-mono text-cyan-400 hover:text-cyan-300 break-all text-left flex items-center gap-2"
                    title="Copy URL: ${header.segmentUrl}"
                >
                    <span class="truncate"
                        >${header.segmentUrl.split('/').pop()}</span
                    >
                    ${icons.clipboardCopy}
                </button>
            </div>
        </div>
    `;
};

/**
 * Renders the header section of the comparison table.
 * @param {object[]} headers - An array of header data objects.
 * @returns {import('lit-html').TemplateResult}
 */
export const comparisonHeaderTemplate = (headers) => {
    const gridStyle = `grid-template-columns: 250px repeat(${headers.length}, minmax(300px, 1fr));`;

    return html`
        <div
            class="grid gap-2 sticky top-0 bg-gray-900/80 backdrop-blur-sm z-10 py-2"
            style="${gridStyle}"
        >
            <div class="font-semibold text-gray-300 p-3 flex items-center">
                Property
            </div>
            ${headers.map(headerCardTemplate)}
        </div>
    `;
};
