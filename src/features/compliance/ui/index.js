import { eventBus } from '@/application/event-bus';
import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { styleMap } from 'lit-html/directives/style-map.js';
import './components/compliance-scorecard.js';
import './components/issue-list.js';
import './components/compliance-sidebar.js';
import { navigationTemplate } from './components/navigation.js';
import { manifestViewTemplate } from './components/renderer.js';
import { standardSelectorTemplate } from './components/standard-selector.js';

// --- Semantic Layout Styles (Strict Compliance) ---
// Using manual semantic hooks as per Guideline IV.2 for Light DOM containers
const panelStyles = {
    background: '#1e293b', // Guidelines: B-3 for standard panels
    backdropFilter: 'blur(12px)',

    borderRadius: '0.75rem',
    boxShadow: '0 8px 30px rgb(0 0 0 / 0.35)',
};

const strongPanelStyles = {
    ...panelStyles,
    background: '#1e293b', // Guidelines: B-6 for heavy containers
};

class ComplianceView {
    // Port note: was `extends BaseView` (never committed). Plain class
    // with inlined mount/unmount/subscribe; slots composed in-container
    // and into #contextual-sidebar (no shell slots in 1.2.0).
    constructor() {
        this.viewMode = 'dashboard'; // 'dashboard' | 'source'
        this.currentStandardVersion = null;
        this.trackedStreamId = null;
        this.hasContextualSidebar = true;
        this._unsubs = [];
        this.container = null;
        this.stream = null;
    }

    subscribe(store, listener) {
        const unsubscribe = store.subscribe(listener);
        this._unsubs.push(unsubscribe);
        return unsubscribe;
    }

    /**
     * @param {HTMLElement} containerElement
     * @param {{ stream?: any }} [args]
     */
    mount(containerElement, { stream } = {}) {
        this.container = containerElement;
        this.stream = stream || null;
        this.onMount();
    }

    unmount() {
        for (const unsubscribe of this._unsubs.splice(0)) {
            try {
                unsubscribe();
            } catch {
                /* ignore late unsubscribe errors */
            }
        }
        if (this.container) render(html``, this.container);
        const sidebarContainer =
            document.getElementById('contextual-sidebar');
        if (sidebarContainer) render(html``, sidebarContainer);
        this.container = null;
        this.stream = null;
    }

    onMount() {
        // Subscribe to relevant store parts
        this.subscribe(useUiStore, (state, prevState) => {
            if (state.complianceStandardVersion !== (prevState?.complianceStandardVersion ?? state.complianceStandardVersion)) {
                this.currentStandardVersion = state.complianceStandardVersion;
                this.render();
            }
        });

        this.subscribe(useAnalysisStore, () => this.render());

        // Initial render
        this.render();
    }

    onUnmount() {
        // BaseView auto-cleans subscriptions and shell slots
    }

    updateViewMode(mode) {
        this.viewMode = mode;
        this.render();
    }

    renderHeader(protocol, stream, complianceStandardVersion) {
        const isHls = protocol === 'hls';

        return html`
            <div class="h-full w-full flex items-center justify-between pl-2">
                <!-- Left: Title & Identity -->
                <div class="flex items-center gap-6">
                     <!-- Icon Container -->
                     <div class="relative group">
                        <div class="absolute inset-0 bg-blue-500/30 blur-xl rounded-full group-hover:bg-blue-500/50 transition-all duration-500"></div>
                         <div 
                            class="relative w-12 h-12 flex items-center justify-center rounded-2xl border transition-all duration-300"
                            style="background: #1e293b; border-color: #1e293b;"
                         >
                            <span class="text-blue-400 drop-shadow-[0_0_15px_#3b82f6]">
                                ${icons.shieldCheck}
                            </span>
                         </div>
                     </div>

                     <div class="flex flex-col">
                        <h1 class="text-2xl font-black text-slate-100 tracking-tight leading-none uppercase">
                            Compliance
                        </h1>
                         <div class="flex items-center gap-2 mt-1">
                            <span 
                                class="text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider transition-colors"
                                style="background: #1e293b; border-color: #1e293b; color: #94a3b8;"
                            >
                                ${isHls ? 'HLS' : 'MPEG-DASH'}
                            </span>
                            ${isHls ? html`
                                 <span class="text-[10px] font-mono" style="color: #94a3b8;">
                                    v${complianceStandardVersion}
                                 </span>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- Right: Controls -->
                <div class="flex items-center gap-4">
                    <!-- View Switcher -->
                     <div 
                        class="flex p-1 rounded-xl backdrop-blur-md border shadow-inner"
                        style="background: #1e293b; border-color: #1e293b;"
                     >
                        <button
                            @click=${() => this.updateViewMode('dashboard')}
                            class="px-4 py-2 text-xs font-bold rounded-lg transition-all duration-300 flex items-center gap-2 relative z-10"
                            style="${this.viewMode === 'dashboard'
                ? 'color: #f1f5f9; background: #3b82f6; box-shadow: 0 4px 12px #3b82f6;'
                : 'color: #94a3b8;'}"
                        >
                            ${icons.layout} Dashboard
                        </button>
                        <button
                            @click=${() => this.updateViewMode('source')}
                            class="px-4 py-2 text-xs font-bold rounded-lg transition-all duration-300 flex items-center gap-2 relative z-10"
                            style="${this.viewMode === 'source'
                ? 'color: #f1f5f9; background: #3b82f6; box-shadow: 0 4px 12px #3b82f6;'
                : 'color: #94a3b8;'}"
                        >
                            ${icons.code} Source
                        </button>
                     </div>
                     
                     <div class="w-px h-10" style="background: #1e293b;"></div>

                     <!-- Context Actions -->
                     <div class="flex items-center gap-3">
                        ${isHls ? standardSelectorTemplate({
                    selectedVersion: complianceStandardVersion,
                    onVersionChange: (version) =>
                        eventBus.dispatch(
                            'ui:compliance:standard-version-changed',
                            { version }
                        ),
                }) : ''}
                        
                        ${navigationTemplate(stream)}
                     </div>
                </div>
            </div>
        `;
    }

    render() {
        if (!this.container) return;

        const { streams, activeStreamId } = useAnalysisStore.getState();
        const stream = streams.find((s) => s.id === activeStreamId);

        if (!stream || !stream.manifest) {
            // Clear sidebar if no stream
            const sidebarContainer =
                document.getElementById('contextual-sidebar');
            if (sidebarContainer) render(html``, sidebarContainer);

            render(
                html`
                    <div class="flex flex-col items-center justify-center h-full p-8 text-center italic animate-fadeIn" style="color: #94a3b8;">
                        <div 
                            class="w-20 h-20 mb-4 rounded-full flex items-center justify-center opacity-50"
                            style="background: #1e293b;"
                        >
                            ${icons.search}
                        </div>
                        <p class="text-lg font-medium">No stream selected for analysis.</p>
                    </div>
                `,
                this.container
            );
            return;
        }

        const { complianceStandardVersion } = useUiStore.getState();
        const { protocol, activeManifestUpdateId } = stream;

        // 1. Header (in-flow; 1.2.0 has no topBar slot)
        const headerPanel = this.renderHeader(
            protocol,
            stream,
            complianceStandardVersion
        );

        // 2. Sidebar into #contextual-sidebar
        const sidebarContainer =
            document.getElementById('contextual-sidebar');
        if (sidebarContainer) {
            render(
                html`<compliance-sidebar .data=${{ stream }}></compliance-sidebar>`,
                sidebarContainer
            );
        }

        const currentUpdate = stream.manifestUpdates.find((u) => u.id === activeManifestUpdateId) || stream.manifestUpdates[0];
        const complianceResults = currentUpdate?.complianceResults || [];

        let activeContent;

        if (this.viewMode === 'dashboard') {
            activeContent = html`
                <div class="h-full w-full animate-fadeIn flex flex-col relative">
                     <!-- Main Glass Pane -->
                     <div style=${styleMap(strongPanelStyles)} class="flex-1 flex flex-col overflow-hidden relative shadow-2xl backdrop-blur-xl">
                        <!-- Header for Feed -->
                        <div 
                            class="flex items-center justify-between p-5 z-10 relative"
                            style="border-bottom: 1px solid #1e293b; background: linear-gradient(to bottom, #1e293b, transparent);"
                        >
                            <div class="flex items-center gap-3">
                                <div 
                                    class="p-2.5 rounded-xl shadow-lg"
                                    style="background: #1e293b; border: 1px solid #1e293b; color: #3b82f6;"
                                >
                                    ${icons.list}
                                </div>
                                <div>
                                    <h3 class="text-lg font-black tracking-tight text-slate-100">Detailed Findings</h3>
                                    <p class="text-[10px] text-slate-400 uppercase tracking-widest font-bold opacity-60">Real-time Validation</p>
                                </div>
                            </div>
                            <div 
                                class="px-3 py-1.5 rounded-lg text-xs font-mono font-bold shadow-inner"
                                style="background: #0f172a; border: 1px solid #1e293b; color: #94a3b8;"
                            >
                                ${complianceResults.length} CHECKS
                            </div>
                        </div>

                        <!-- List Container -->
                        <div class="flex-1 min-h-0 relative z-0">
                            <compliance-issue-list .data=${{ issues: complianceResults, stream }}></compliance-issue-list>
                        </div>
                     </div>
                </div>
            `;
        } else {
            // Source View
            activeContent = html`
                <div class="h-full w-full animate-fadeIn flex flex-col relative">
                    <div style=${styleMap(strongPanelStyles)} class="flex-1 overflow-hidden flex flex-col">
                         <div 
                            class="p-3 flex items-center justify-between"
                            style="border-bottom: 1px solid #1e293b; background: #1e293b;"
                         >
                            <span class="text-xs font-mono pl-2" style="color: #94a3b8;">MANIFEST SOURCE</span>
                            <div class="flex gap-2">
                                 <button 
                                    class="p-1.5 rounded-md transition-colors"
                                    style="color: #94a3b8;"
                                    title="Copy"
                                 >
                                    ${icons.copy}
                                 </button>
                                 <button 
                                    class="p-1.5 rounded-md transition-colors"
                                    style="color: #94a3b8;"
                                    title="Download"
                                 >
                                    ${icons.download}
                                 </button>
                            </div>
                         </div>
                         <div 
                             class="flex-1 overflow-auto p-4 custom-scrollbar font-mono text-xs leading-relaxed"
                            style="background: #0f172a; color: #f1f5f9;"
                         >
                            ${manifestViewTemplate(
                currentUpdate?.rawManifest || stream.rawManifest,
                protocol,
                complianceResults,
                currentUpdate?.serializedManifest || stream.manifest.serializedManifest,
                'all'
            )}
                         </div>
                    </div>
                </div>
            `;
        }

        render(
            html`
                <div class="flex flex-col h-full w-full relative overflow-hidden">
                    <div class="shrink-0 px-2 pt-2">${headerPanel}</div>
                    <!-- Main Content Area -->
                    <div class="grow min-h-0 overflow-hidden">
                        ${activeContent}
                    </div>
                </div>
            `,
            this.container
        );
    }
}

// Export Singleton
export const complianceView = new ComplianceView();
