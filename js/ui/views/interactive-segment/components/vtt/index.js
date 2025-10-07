import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { highlightHls } from '../../../../shared/syntax-highlighter.js';

/**
 * Renders the raw text content of a VTT file with line numbers.
 * @param {ArrayBuffer} buffer - The raw ArrayBuffer data of the VTT segment.
 * @returns {import('lit-html').TemplateResult}
 */
export function getInteractiveVttTemplate(buffer) {
    const decoder = new TextDecoder();
    const vttString = decoder.decode(buffer);
    const lines = vttString.split(/\r?\n/);

    // VTT highlighting is very similar to HLS, so we can reuse the highlighter.
    const highlightedLines = lines.map(
        (line, index) =>
            html`<div class="flex">
                <span
                    class="text-right text-gray-500 pr-4 select-none flex-shrink-0 w-10"
                    >${index + 1}</span
                >
                <span class="flex-grow whitespace-pre-wrap break-all"
                    >${unsafeHTML(highlightHls(line))}</span
                >
            </div>`
    );

    return html`
        <div
            class="bg-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto"
        >
            ${highlightedLines}
        </div>
    `;
}
