import * as icons from '@/ui/icons';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { html } from 'lit-html';

export const configGeneratorTemplate = (configObject) => {
    const jsonString = JSON.stringify(configObject, null, 2);

    const handleCopy = () => {
        copyTextToClipboard(jsonString, 'Configuration JSON copied!');
    };

    return html`
        <div
            class="bg-slate-900 rounded-xl border border-slate-700 flex flex-col h-full overflow-hidden shadow-lg"
        >
            <div
                class="flex items-center justify-between p-3 border-b border-slate-700 bg-slate-950"
            >
                <div class="flex items-center gap-2">
                    <span class="text-blue-400">${icons.code}</span>
                    <h3 class="text-sm font-bold text-slate-200">
                        Player Configuration
                    </h3>
                </div>
                <button
                    @click=${handleCopy}
                    class="text-xs flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                >
                    ${icons.clipboardCopy} Copy JSON
                </button>
            </div>

            <div class="grow relative group">
                <textarea
                    readonly
                    class="w-full h-full bg-slate-900 p-4 font-mono text-xs text-green-400 focus:outline-none resize-none"
                    spellcheck="false"
                >
${jsonString}</textarea
                >
            </div>
        </div>
    `;
};
