import * as icons from '@/ui/icons';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { html, render } from 'lit-html';

class IntegrationGuide extends HTMLElement {
    constructor() {
        super();
        this._data = null;
        this.activeTab = 'shaka'; // default
    }

    set data(val) {
        this._data = val;
        this.render();
    }

    connectedCallback() {
        this.render();
    }

    setActiveTab(tab) {
        this.activeTab = tab;
        this.render();
    }

    handleCopy() {
        const code = this._data.codeSnippets[this.activeTab];
        copyTextToClipboard(code, 'Code snippet copied!');
    }

    render() {
        if (!this._data) return;
        const { codeSnippets } = this._data;
        const code = codeSnippets[this.activeTab];

        const tabBtn = (id, label, icon) => html`
            <button
                @click=${() => this.setActiveTab(id)}
                class="px-3 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${this
                    .activeTab === id
                    ? 'border-blue-500 text-white bg-slate-800'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}"
            >
                ${icon ? html`<span class="scale-75">${icon}</span>` : ''}
                ${label}
            </button>
        `;

        const template = html`
            <div
                class="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg flex flex-col h-full"
            >
                <div
                    class="bg-slate-950 border-b border-slate-800 flex justify-between items-center pr-2"
                >
                    <div class="flex">
                        ${tabBtn('shaka', 'Shaka Player', icons.play)}
                        ${tabBtn('hlsjs', 'HLS.js', icons.layers)}
                        ${tabBtn('dashjs', 'Dash.js', icons.activity)}
                        ${tabBtn('html5', 'Native / HTML5', icons.code)}
                    </div>
                    <button
                        @click=${() => this.handleCopy()}
                        class="text-slate-500 hover:text-white p-1.5 rounded hover:bg-slate-800 transition-colors"
                        title="Copy Code"
                    >
                        ${icons.clipboardCopy}
                    </button>
                </div>

                <div class="relative grow bg-[#0d1117] group">
                    <pre
                        class="absolute inset-0 p-4 overflow-auto custom-scrollbar text-xs font-mono leading-relaxed text-blue-100 selection:bg-blue-500/30"
                    ><code>${code}</code></pre>
                </div>

                <div
                    class="p-2 bg-slate-900 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between"
                >
                    <span>Generated for ${this.activeTab} integration</span>
                    <span class="font-mono">JavaScript</span>
                </div>
            </div>
        `;

        render(template, this);
    }
}

customElements.define('integration-guide', IntegrationGuide);

export const integrationGuideTemplate = (vm) =>
    html`<integration-guide .data=${vm}></integration-guide>`;
