import { html, render } from 'lit-html';
import { uiActions } from '@/state/uiStore';
import { useAnalysisStore } from '@/state/analysisStore';
import { eventBus } from '@/application/event-bus';
import { searchManifest } from '../domain/searchEngine';
import * as icons from '@/ui/icons';

class SearchModal extends HTMLElement {
    constructor() {
        super();
        this.isOpen = false;
        this.query = '';
        this.results = [];
        this.selectedIndex = 0;
        this.inputRef = null;
    }

    connectedCallback() {
        this.render();
        document.addEventListener(
            'keydown',
            this.handleGlobalKeydown.bind(this)
        );
        this.unsubscribe = eventBus.subscribe('ui:search:open', () =>
            this.open()
        );
    }

    disconnectedCallback() {
        document.removeEventListener(
            'keydown',
            this.handleGlobalKeydown.bind(this)
        );
        if (this.unsubscribe) this.unsubscribe();
    }

    handleGlobalKeydown(e) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            this.open();
        }
        if (this.isOpen && e.key === 'Escape') {
            this.close();
        }
    }

    open() {
        this.isOpen = true;
        this.query = '';
        this.results = [];
        this.selectedIndex = 0;
        this.render();
        requestAnimationFrame(() => {
            const input = this.querySelector('input');
            if (input) input.focus();
        });
    }

    close() {
        this.isOpen = false;
        this.render();
    }

    handleInput(e) {
        this.query = e.target.value;
        this.selectedIndex = 0;

        const { streams, activeStreamId } = useAnalysisStore.getState();
        const activeStream = streams.find((s) => s.id === activeStreamId);

        if (activeStream && activeStream.manifest) {
            // Determine which manifest object to search
            let manifestToSearch = activeStream.manifest.serializedManifest;

            const activeUpdate = activeStream.manifestUpdates.find(
                (u) => u.id === activeStream.activeManifestUpdateId
            );
            if (activeUpdate) {
                manifestToSearch = activeUpdate.serializedManifest;
            }

            this.results = searchManifest(manifestToSearch, this.query);
        } else {
            this.results = [];
        }

        this.render();
    }

    handleKeydown(e) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.selectedIndex = Math.min(
                this.selectedIndex + 1,
                this.results.length - 1
            );
            this.render();
            this.scrollSelectedIntoView();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
            this.render();
            this.scrollSelectedIntoView();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (this.results[this.selectedIndex]) {
                this.selectResult(this.results[this.selectedIndex]);
            }
        }
    }

    scrollSelectedIntoView() {
        const list = this.querySelector('.results-list');
        const selected = this.querySelector('.result-item.selected');
        if (list && selected) {
            selected.scrollIntoView({ block: 'nearest' });
        }
    }

    selectResult(result) {
        // 1. Close modal
        this.close();

        // 2. Switch to the Interactive Manifest tab to ensure the selection is visible
        uiActions.setActiveTab('interactive-manifest');

        // 3. Set selection with scroll flag
        // Using a small timeout ensures the view switch has processed before the selection logic triggers scrolling
        setTimeout(() => {
            uiActions.setInteractiveManifestSelectedItem({
                path: result.path,
                scrollIntoView: true,
            });
        }, 50);
    }

    render() {
        if (!this.isOpen) {
            render(html``, this);
            return;
        }

        const template = html`
            <div
                class="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4"
                role="dialog"
                aria-modal="true"
            >
                <div
                    class="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                    @click=${() => this.close()}
                ></div>

                <div
                    class="relative w-full max-w-2xl bg-slate-900 rounded-xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[60vh] animate-fadeInDown"
                >
                    <div
                        class="flex items-center p-4 border-b border-slate-700 gap-3"
                    >
                        <span class="text-slate-400">${icons.search}</span>
                        <input
                            type="text"
                            class="bg-transparent border-none text-white text-lg w-full focus:ring-0 placeholder-slate-500"
                            placeholder="Search in manifest... (e.g. 'id', 'codecs', '1080p')"
                            .value=${this.query}
                            @input=${(e) => this.handleInput(e)}
                            @keydown=${(e) => this.handleKeydown(e)}
                        />
                        <button
                            @click=${() => this.close()}
                            class="text-slate-500 hover:text-white px-2 py-1 rounded text-xs border border-slate-700"
                        >
                            ESC
                        </button>
                    </div>

                    <div class="overflow-y-auto results-list">
                        ${this.results.length === 0 && this.query
                            ? html`<div class="p-8 text-center text-slate-500">
                                  No results found.
                              </div>`
                            : ''}
                        ${this.results.map((result, index) => {
                            const isSelected = index === this.selectedIndex;
                            return html`
                                <div
                                    class="result-item p-3 border-b border-slate-800 cursor-pointer flex items-center gap-3 ${isSelected
                                        ? 'bg-blue-900/30 border-l-4 border-l-blue-500 selected'
                                        : 'hover:bg-slate-800 border-l-4 border-l-transparent'}"
                                    @click=${() => this.selectResult(result)}
                                >
                                    <div class="shrink-0 text-slate-400">
                                        ${result.type === 'key'
                                            ? icons.tag
                                            : icons.code}
                                    </div>
                                    <div class="min-w-0 overflow-hidden">
                                        <div
                                            class="text-sm font-mono text-slate-200 truncate"
                                        >
                                            ${result.context}
                                        </div>
                                        <div
                                            class="text-xs text-slate-500 truncate font-mono"
                                        >
                                            ${result.path}
                                        </div>
                                    </div>
                                </div>
                            `;
                        })}
                    </div>

                    ${this.results.length > 0
                        ? html`
                              <div
                                  class="p-2 bg-slate-800/50 text-xs text-slate-500 border-t border-slate-700 flex justify-between"
                              >
                                  <span>${this.results.length} results</span>
                                  <span
                                      >Use arrows to navigate, Enter to
                                      select</span
                                  >
                              </div>
                          `
                        : ''}
                </div>
            </div>
        `;

        render(template, this);
    }
}

customElements.define('search-modal', SearchModal);
