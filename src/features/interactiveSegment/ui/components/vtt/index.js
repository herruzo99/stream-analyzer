import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { highlightHls } from '@/ui/shared/syntax-highlighter';

export function getInteractiveVttTemplate(buffer) {
    const decoder = new TextDecoder();
    const vttString = decoder.decode(buffer);
    const lines = vttString.split(/\r?\n/);

    const highlightedLines = lines.map(
        (line, index) =>
            html`<div class="flex">
                <span
                    class="text-right text-slate-500 pr-4 select-none shrink-0 w-10"
                    >${index + 1}</span
                >
                <span class="grow whitespace-pre-wrap break-all"
                    >${unsafeHTML(highlightHls(line))}</span
                >
            </div>`
    );

    return html`
        <div
            class="bg-slate-900 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-auto h-full border border-slate-700"
        >
            ${highlightedLines}
        </div>
    `;
}
