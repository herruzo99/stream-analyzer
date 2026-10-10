import { useAnalysisStore } from '@/state/analysisStore';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { styleMap } from 'lit-html/directives/style-map.js';
import { compatibilityMatrixTemplate } from './components/compatibility-matrix.js';
import { integrationGuideTemplate } from './components/integration-guide.js';
import { technicalSpecsTemplate } from './components/technical-specs.js';
import { createIntegratorsReportViewModel } from './view-model.js';




const whitelistPanel = (domains, isGlass) => {
    const glassStyles = {
        borderRadius: '0.75rem',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 30px rgb(0 0 0 / 0.35)',
        background: '#1e293b',
    };

    const containerClass = isGlass
        ? "group h-full flex flex-col relative overflow-hidden"
        : "group h-full flex flex-col relative overflow-hidden bg-slate-800 border border-slate-800 rounded-sm";

    const itemRadius = isGlass ? 'rounded-xl' : 'rounded-sm';

    return html`
    <div 
        class="${containerClass}"
        style=${styleMap(isGlass ? glassStyles : {})}
    >
        <!-- Top Accent -->
        <div
            class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/50 via-[#60a5fa]/50 to-blue-500/50 opacity-50"
        ></div>

        <div
            class="shrink-0 p-6 border-b border-slate-800 bg-slate-800/50"
        >
            <h3
                class="font-black text-slate-400 text-xs flex items-center gap-2 uppercase tracking-[0.2em]"
            >
                ${icons.network} Network Whitelist
            </h3>
        </div>
        <div class="p-6 grow overflow-y-auto custom-scrollbar relative">
            ${domains.length === 0
            ? html`<div
                      class="flex flex-col items-center justify-center h-full text-slate-400 gap-3"
                  >
                      <div
                          class="p-3 bg-slate-900/50 rounded-full border border-slate-800"
                      >
                          ${icons.shieldCheck}
                      </div>
                      <span
                          class="text-xs font-bold uppercase tracking-wider opacity-60"
                          >No external domains</span
                      >
                  </div>`
            : html`
                      <ul class="space-y-3">
                          ${domains.map(
                (d) => html`
                                  <li
                                      class="flex items-center gap-3 text-xs font-mono text-blue-400 bg-slate-700 px-4 py-3 ${itemRadius} border border-blue-500/20 hover:border-[#60a5fa]/50 hover:bg-slate-700 transition-all group/item shadow-[0_0_10px_rgba(0,0,0,0.1)] hover:shadow-[0_0_15px_#3b82f6]/10"
                                  >
                                      <span
                                          class="text-blue-400/70 group-hover/item:text-[#60a5fa] transition-colors scale-90"
                                          >${icons.server}</span
                                      >
                                      <span class="tracking-tight">${d}</span>
                                      <span
                                          class="ml-auto text-[10px] text-blue-400/40 font-bold uppercase tracking-wider opacity-0 group-hover/item:opacity-100 transition-opacity"
                                          >Allowed</span
                                      >
                                  </li>
                              `
            )}
                      </ul>
                  `}
        </div>
    </div>
`;
};

class IntegratorsReportView {
    // Port note: was `extends BaseView` (never committed). Plain class
    // with inlined mount/unmount/subscribe; slots composed in-container
    // and into #contextual-sidebar (no shell slots in 1.2.0). Theme
    // variants dropped: solid styling (isGlass=false) throughout.
    constructor() {
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
        // Subscribe to analysis store to trigger re-renders on data change
        this.subscribe(useAnalysisStore, () => this.render());
    }

    render() {
        if (!this.container) return;

        const { streams, activeStreamId } = useAnalysisStore.getState();
        const stream = streams.find((s) => s.id === activeStreamId) ?? streams[0];

        // --- EMPTY STATE ---
        if (!stream || !stream.manifest) {
            // Clear sidebar
            const sidebarContainer =
                document.getElementById('contextual-sidebar');
            if (sidebarContainer) render(html``, sidebarContainer);

            render(
                html`
                    <div
                        class="flex flex-col items-center justify-center h-full text-slate-400 gap-6 relative overflow-hidden"
                    >
                        <!-- Ambient Background -->
                        <div
                            class="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800 z-0"
                        ></div>
                        <div
                            class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"
                        ></div>

                        <div class="relative z-10 flex flex-col items-center">
                            <div
                                class="scale-150 mb-8 p-8 bg-slate-800 rounded-full border border-slate-800 shadow-2xl backdrop-blur-sm animate-pulse-slow"
                            >
                                ${icons.integrators}
                            </div>
                            <h3
                                class="text-2xl font-black text-slate-100 tracking-tight drop-shadow-lg"
                            >
                                Integration Report
                            </h3>
                            <p
                                class="text-sm font-medium text-slate-400 uppercase tracking-widest mt-2"
                            >
                                Load a stream to generate report
                            </p>
                        </div>
                    </div>
                `,
                this.container
            );
            return;
        }

        const vm = createIntegratorsReportViewModel(stream);
        if (!vm) return;

        // --- 1. HEADER (in-flow; 1.2.0 has no topBar slot) ---
        const headerPanel = html`
            <div class="w-full h-full flex items-center gap-4">
                 <div
                    class="p-3 bg-slate-700 rounded-xl border border-blue-500/20 text-[#60a5fa] shadow-[0_0_20px_#3b82f6]/15"
                >
                    ${icons.integrators}
                </div>
                <div>
                    <h2 class="text-3xl font-black text-slate-100 tracking-tight drop-shadow-md">
                        Integrator's Dashboard
                    </h2>
                    <p class="text-slate-400 text-sm font-medium mt-1">
                        Technical specifications for <span class="text-[#60a5fa] font-bold">${vm.overview.streamName}</span>
                    </p>
                </div>
            </div>
        `;

        // --- 2. WHITELIST SIDEBAR (into #contextual-sidebar) ---
        const isGlass = false; // Port: no theme registry; solid styling.
        const sidebarContainer =
            document.getElementById('contextual-sidebar');
        if (sidebarContainer) {
            render(
                html`
            <div class="h-full w-full">
                ${whitelistPanel(vm.domains, isGlass)}
            </div>
        `,
                sidebarContainer
            );
        }

        // --- 3. RENDER MAIN CONTENT (header composed in-flow) ---
        const template = html`
            <div class="flex flex-col h-full min-h-0">
                <div class="shrink-0 px-2 pt-2">${headerPanel}</div>
                <div class="grow min-h-0 overflow-hidden">
            <div
                class="grid grid-cols-1 xl:grid-cols-2 gap-3 h-full overflow-y-auto custom-scrollbar pb-24"
            >
                <!-- Row 1 Left: Specs -->
                <div class="min-h-[500px]">
                     ${technicalSpecsTemplate(vm, isGlass)}
                </div>

                <!-- Row 1 Right: Code -->
                <div class="min-h-[500px]">
                    ${integrationGuideTemplate(vm, isGlass)}
                </div>

                <!-- Row 2 Full: Compatibility -->
                <div class="xl:col-span-2 min-h-[400px]">
                    ${compatibilityMatrixTemplate(vm.compatibility, isGlass)}
                </div>
                </div>
            </div>
            </div>
        `;

        render(template, this.container);
    }
}

export const integratorsReportView = new IntegratorsReportView();
