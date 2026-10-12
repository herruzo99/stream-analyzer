import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { html, render } from 'lit-html';

const TABS = [
    { id: 'shaka', label: 'shaka', icon: icons.play },
    { id: 'hlsjs', label: 'hls.js', icon: icons.layers },
    { id: 'dashjs', label: 'dash.js', icon: icons.activity },
    { id: 'html5', label: 'native', icon: icons.code },
];

class IntegrationGuide extends HTMLElement {
    constructor() {
        super();
        this._data = null;
    }

    set data(val) {
        this._data = val;
        this.render();
    }

    connectedCallback() {
        this.render();
    }

    get activeTab() {
        const { integratorReportActiveTab } = useUiStore.getState();
        return TABS.some((t) => t.id === integratorReportActiveTab)
            ? integratorReportActiveTab
            : 'shaka';
    }

    setActiveTab(tab) {
        uiActions.setIntegratorReportActiveTab(tab);
        this.render();
    }

    handleCopy() {
        const snippets = this._data?.codeSnippets;
        const code = snippets?.[this.activeTab];
        if (typeof code === 'string' && code)
            copyTextToClipboard(code, 'snippet copied');
    }

    handleCopyAll() {
        const snippets = this._data?.codeSnippets;
        if (!snippets) return;
        const all = TABS.map(
            ({ id, label }) =>
                `--- ${label} ---\n${snippets[id] || '(unavailable)'}`
        ).join('\n\n');
        copyTextToClipboard(all, 'all snippets copied');
    }

    render() {
        if (!this._data) return;
        const { codeSnippets } = this._data;
        const activeTab = this.activeTab;
        const code = codeSnippets?.[activeTab] ?? '';

        const template = html`
            <div class="flex flex-col h-full rounded-md border border-white/5 bg-[#0b111c] overflow-hidden">
                <div class="shrink-0 border-b border-white/5 flex items-stretch">
                    <div class="flex grow min-w-0 overflow-x-auto custom-scrollbar">
                        ${TABS.map(
                            ({ id, label, icon }) => html`
                                <button
                                    @click=${() => this.setActiveTab(id)}
                                    aria-pressed=${activeTab === id}
                                    class="px-3.5 py-2.5 mono text-[11px] border-b transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === id
                                        ? 'border-emerald-400/60 text-slate-100 bg-white/[0.03]'
                                        : 'border-transparent text-slate-500 hover:text-slate-200'}"
                                >
                                    <span class="${activeTab === id ? 'text-emerald-300' : 'text-slate-600'}">${icon}</span>
                                    ${label}
                                </button>
                            `
                        )}
                    </div>
                    <div class="flex items-center gap-1 px-2 shrink-0">
                        <button
                            @click=${() => this.handleCopyAll()}
                            class="p-1.5 rounded-md text-slate-500 hover:text-slate-100 hover:bg-white/5 transition-colors"
                            title="Copy all snippets"
                            aria-label="Copy all snippets"
                        >
                            ${icons.layers}
                        </button>
                        <button
                            @click=${() => this.handleCopy()}
                            class="p-1.5 rounded-md text-slate-500 hover:text-slate-100 hover:bg-white/5 transition-colors"
                            title="Copy this snippet"
                            aria-label="Copy this snippet"
                        >
                            ${icons.clipboardCopy}
                        </button>
                    </div>
                </div>

                <div class="relative grow min-h-0 bg-black/40">
                    <pre
                        class="absolute inset-0 p-4 overflow-auto custom-scrollbar font-mono text-[12px] leading-relaxed text-slate-200"
                    ><code>${code}</code></pre>
                </div>

                <div class="shrink-0 px-4 py-2 border-t border-white/5 flex items-center justify-between">
                    <span class="mono text-[10px] text-slate-600">
                        generated for ${activeTab}
                    </span>
                    <span class="mono text-[10px] text-slate-600">javascript</span>
                </div>
            </div>
        `;

        render(template, this);
    }
}

if (!customElements.get('integration-guide')) {
    customElements.define('integration-guide', IntegrationGuide);
}

export const integrationGuideTemplate = (vm) =>
    html`<integration-guide .data=${vm}></integration-guide>`;
