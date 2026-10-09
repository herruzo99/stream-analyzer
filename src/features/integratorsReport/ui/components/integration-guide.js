import * as icons from '@/ui/icons';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { html, render } from 'lit-html';
import { styleMap } from 'lit-html/directives/style-map.js';

class IntegrationGuide extends HTMLElement {
    constructor() {
        super();
        this._data = null;
        this._isGlass = false;
        this.activeTab = 'shaka'; // default
    }

    set isGlass(val) {
        this._isGlass = val;
        this.render();
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
                class="px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 relative group overflow-hidden ${this
                .activeTab === id
                ? 'border-blue-500 text-slate-200 bg-slate-900/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/5'}"
            >
                ${this.activeTab === id
                ? html`<div
                          class="absolute inset-0 bg-blue-500/10 blur-md"
                      ></div>`
                : ''}
                ${icon
                ? html`<span
                          class="scale-90 relative z-10 ${this.activeTab === id
                        ? 'text-[#60a5fa]'
                        : ''}"
                          >${icon}</span
                      >`
                : ''}
                <span class="relative z-10 tracking-wide">${label}</span>
            </button>
        `;

        const glassStyles = {
            borderRadius: '0.75rem',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 30px rgb(0 0 0 / 0.35)',
            background: '#1e293b',
        };

        const containerClass = this._isGlass
            ? "flex flex-col h-full relative overflow-hidden group"
            : "flex flex-col h-full relative overflow-hidden group bg-slate-800 border border-slate-800 rounded-sm";

        const template = html`
            <div
                class="${containerClass}"
                style=${styleMap(this._isGlass ? glassStyles : {})}
            >
                <!-- Top Accent -->
                <div
                    class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/50 via-[#60a5fa]/50 to-blue-500/50 opacity-50"
                ></div>

                <div
                    class="shrink-0 bg-slate-800/50 border-b border-slate-800 flex justify-between items-center pr-3"
                >
                    <div class="flex">
                        ${tabBtn('shaka', 'Shaka Player', icons.play)}
                        ${tabBtn('hlsjs', 'HLS.js', icons.layers)}
                        ${tabBtn('dashjs', 'Dash.js', icons.activity)}
                        ${tabBtn('html5', 'Native / HTML5', icons.code)}
                    </div>
                    <button
                        @click=${() => this.handleCopy()}
                        class="text-slate-400 hover:text-slate-200 p-2 rounded-lg hover:bg-slate-900/10 transition-all active:scale-95"
                        title="Copy Code"
                    >
                        ${icons.clipboardCopy}
                    </button>
                </div>

                <div
                    class="relative grow bg-slate-900 group border-t border-slate-800 min-h-0"
                >
                    <div
                        class="absolute inset-0 bg-gradient-to-b from-black/5 to-transparent pointer-events-none"
                    ></div>
                    <pre
                        class="absolute inset-0 p-6 overflow-auto custom-scrollbar text-xs font-mono leading-relaxed text-slate-100 selection:bg-blue-500/30"
                    ><code>${code}</code></pre>
                </div>

                <div
                    class="shrink-0 p-3 bg-slate-800/50 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between font-medium"
                >
                    <span class="flex items-center gap-2">
                        <span
                            class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"
                        ></span>
                        Generated for ${this.activeTab} integration
                    </span>
                    <span class="font-mono opacity-70">JavaScript</span>
                </div>
            </div>
        `;

        render(template, this);
    }
}

customElements.define('integration-guide', IntegrationGuide);

export const integrationGuideTemplate = (vm, isGlass) =>
    html`<integration-guide .data=${vm} .isGlass=${isGlass}></integration-guide>`;
