import { eventBus } from '@/application/event-bus';
import { useAnalysisStore } from '@/state/analysisStore';
import { EVENTS } from '@/types/events';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';

class SearchModal extends HTMLElement {
    constructor() {
        super();
        this.isOpen = false;
        this.query = '';
        this.results = [];
        this.selectedIndex = 0;
        this.unsubscribe = null;
    }

    connectedCallback() {
        this.render();
        window.addEventListener('keydown', this.handleGlobalKeydown.bind(this));

        // Listen for internal frame close
        this.addEventListener('close', () => this.close()); // Handle backdrop clicks from ModalFrame

        this.unsubscribe = useAnalysisStore.subscribe(() => {
            if (this.isOpen) this.performSearch(); // Live update results if data changes
        });
    }

    disconnectedCallback() {
        window.removeEventListener('keydown', this.handleGlobalKeydown.bind(this));
        if (this.unsubscribe) this.unsubscribe();
    }

    handleGlobalKeydown(e) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            this.toggle();
        }
        if (this.isOpen && e.key === 'Escape') {
            this.close();
        }
    }

    toggle() {
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            this.query = '';
            this.results = [];
            this.selectedIndex = 0;
            setTimeout(() => {
                const input = this.querySelector('input');
                if (input) input.focus();
            }, 50);
        }
        this.render();
    }

    close() {
        this.isOpen = false;
        this.render();
    }

    performSearch() {
        if (!this.query.trim()) {
            this.results = [];
            this.render();
            return;
        }

        const { manifestData } = useAnalysisStore.getState();
        const q = this.query.toLowerCase();

        // Mock search logic relying on flattened manifest nodes (simplified for migration)
        // In reality this would traverse the AST or use a pre-computed index
        const hits = [];

        // Searching AdaptationSets (Mock)
        if (manifestData?.adaptationSets) {
            manifestData.adaptationSets.forEach(as => {
                if (as.mimeType.includes(q) || as.id.includes(q)) {
                    hits.push({ type: 'AdaptationSet', label: `AS: ${as.id} (${as.mimeType})`, id: as.id });
                }
                as.representations.forEach(rep => {
                    if (rep.id.includes(q) || rep.bandwidth.toString().includes(q)) {
                        hits.push({ type: 'Representation', label: `Rep: ${rep.id} (${rep.bandwidth})`, id: rep.id, parent: as.id });
                    }
                });
            });
        }

        // Searching Periods
        if (manifestData?.periods) {
            manifestData.periods.forEach(p => {
                if (p.id.includes(q)) {
                    hits.push({ type: 'Period', label: `Period: ${p.id}`, id: p.id });
                }
            });
        }

        this.results = hits.slice(0, 10);
        this.selectedIndex = 0;
        this.render();
    }

    handleInput(e) {
        this.query = e.target.value;
        this.performSearch();
    }

    handleKeyDown(e) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.selectedIndex = (this.selectedIndex + 1) % this.results.length;
            this.render();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.selectedIndex = (this.selectedIndex - 1 + this.results.length) % this.results.length;
            this.render();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (this.results[this.selectedIndex]) {
                this.selectResult(this.results[this.selectedIndex]);
            }
        }
    }

    selectResult(result) {
        // Navigate to the item
        console.log('Selected:', result);
        this.close();

        // Example: Switch to Interactive Manifest view and highlight
        eventBus.dispatch(EVENTS.UI.NAVIGATE_REQUESTED, { view: 'interactiveManifest' });

        // Dispatch specific selection event that the view listens to
        // eventBus.dispatch(EVENTS.MANIFEST.SELECT_NODE, { id: result.id });
    }

    render() {
        if (!this.isOpen) {
            render(html``, this);
            return;
        }

        // Use standard ModalFrame with 'md' size for a focused palette look
        // 'no-header' to implement custom search input header
        const template = html`
            <div class="flex flex-col h-full min-h-0">
                <div class="flex flex-col h-[50vh] max-h-[500px]">
                    <!-- Search Header -->
                    <div class="flex items-center gap-3 p-4 border-b border-slate-800 shrink-0">
                        <div class="text-blue-400">
                            ${icons.search}
                        </div>
                        <input
                            type="text"
                            class="grow bg-transparent border-none outline-none text-[#f1f5f9] text-lg placeholder-slate-400"
                            placeholder="Search manifest elements..."
                            .value=${this.query}
                            @input=${this.handleInput.bind(this)}
                            @keydown=${this.handleKeyDown.bind(this)}
                            autofocus
                        />
                        <div class="text-[10px] font-bold px-2 py-1 bg-slate-800 rounded text-[#94a3b8] border border-slate-800">
                            ESC
                        </div>
                    </div>
                    
                    <!-- Results List -->
                    <div class="grow overflow-y-auto custom-scrollbar p-2">
                        ${this.results.length === 0 && this.query ? html`
                            <div class="text-center p-8 text-[#94a3b8]">
                                <p>No results found for "${this.query}"</p>
                            </div>
                        ` : ''}
                        
                        ${this.results.length === 0 && !this.query ? html`
                            <div class="text-center p-8 text-[#94a3b8] opacity-50">
                                <p>Type to search...</p>
                            </div>
                        ` : ''}

                        ${this.results.map((res, idx) => html`
                            <div
                                @click=${() => this.selectResult(res)}
                                class="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${idx === this.selectedIndex
                ? 'bg-blue-500/10 border border-blue-500/20'
                : 'hover:bg-slate-800 border border-transparent'
            }"
                            >
                                <div class="p-1.5 rounded bg-slate-800 text-[#94a3b8] border border-slate-800">
                                    ${icons.fileText}
                                </div>
                                <div class="min-w-0">
                                    <div class="text-sm font-bold text-[#f1f5f9] truncate">
                                        ${res.label}
                                    </div>
                                    <div class="text-[10px] text-[#94a3b8]">
                                        ${res.type}
                                    </div>
                                </div>
                                ${idx === this.selectedIndex ? html`
                                    <div class="ml-auto text-blue-400">
                                        ${icons.arrowRight}
                                    </div>
                                ` : ''}
                            </div>
                        `)}
                    </div>
                    
                    <!-- Footer Helper -->
                    <div class="p-2 border-t border-slate-800 bg-slate-800 text-[10px] text-[#94a3b8] flex justify-between px-4">
                        <span><strong class="text-[#f1f5f9]">↑↓</strong> to navigate</span>
                        <span><strong class="text-[#f1f5f9]">Enter</strong> to select</span>
                    </div>
                </div>
            </div>
        `;

        render(template, this);
    }
}

customElements.define('search-modal', SearchModal);
