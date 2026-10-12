import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { styleMap } from 'lit-html/directives/style-map.js';

import { adTimelineTemplate } from './components/ad-timeline.js';
import { breakCardTemplate } from './components/break-card.js';
import { inspectorTemplate } from './components/inspector.js';
import { createAdvertisingViewModel } from './view-model.js';
import { statCardTemplate } from '@/features/summary/ui/components/shared';

// Flat layout styles
// Used in styleMap for panels that need an explicit surface
const layoutCardStyles = {
    borderRadius: '0.75rem',
    boxShadow: '0 8px 30px rgb(0 0 0 / 0.35)',
    backdropFilter: 'blur(12px)',
};

class AdvertisingView {
    // Port note: was `extends BaseView` (never committed). Plain class
    // with inlined mount/unmount/subscribe; slots composed in-container
    // and into #contextual-sidebar (no shell slots in 1.2.0).
    constructor() {
        this.hasContextualSidebar = true;
        this._unsubs = [];
        this.container = null;
        this.stream = null;
        this.selectedAvailId = null;
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
        this.onUnmount();
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
        this.selectedAvailId = null;
        // Start with sidebar enabled for this view
        uiActions.setActiveSidebar('contextual');

        // Subscribe to Analysis Store
        this.subscribe(useAnalysisStore, () => this.render());
    }

    onUnmount() {
        // Subscriptions release in unmount().
    }

    toggleSettings() {
        const { activeSidebar } = useUiStore.getState();
        const isContextualOpen = activeSidebar === 'contextual';

        if (isContextualOpen && !this.selectedAvailId) {
            // If already open and showing settings -> Close
            uiActions.setActiveSidebar(null);
        } else {
            // Else -> Open and show settings
            uiActions.setActiveSidebar('contextual');
            this.selectedAvailId = null;
        }
        // No need to call render manually; store update triggers it via BaseView subscription
    }

    renderTemplate() {
        const { streams, activeStreamId } = useAnalysisStore.getState();
        const { adDetectionPreferences } = useUiStore.getState();
        const stream = streams.find((s) => s.id === activeStreamId) ?? streams[0];

        // --- EMPTY STATE ---
        if (!stream) {
            return html`
                <div class="flex flex-col items-center justify-center h-full text-slate-400">
                    <div class="p-6 rounded-full bg-white/5 mb-4">
                        ${icons.search}
                    </div>
                    <p class="text-lg font-medium text-slate-200">
                        No stream loaded.
                    </p>
                </div>
            `;
        }

        const vm = createAdvertisingViewModel(stream, adDetectionPreferences);

        // --- MAIN CONTENT ---
        const handleSelect = (avail) => {
            this.selectedAvailId = avail.id;
            // Ensure sidebar is open when selecting an item
            uiActions.setActiveSidebar('contextual');
            // Store update will trigger render, but selectedAvailId local change won't, so we render()
            this.render();
        };

        return html`
            <div class="flex flex-col h-full custom-scrollbar" style="gap: 0.75rem">
                
                <!-- STATS ROW -->
                <!-- We use a grid that adapts to screen size -->
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
                    ${statCardTemplate({
            label: 'Total Breaks',
            value: vm.stats.totalAvails,
            icon: icons.layers,
            colorVar: '--secondary-accent',
            customClasses: '!bg-white/5 hover:!bg-white/5 transition-colors duration-300'
        })}
                    ${statCardTemplate({
            label: 'Ad Load',
            value: `${vm.stats.adLoad}%`,
            icon: icons.percent,
            tooltip: 'Percentage of total duration occupied by ads.',
            colorVar: '--primary-accent',
            customClasses: '!bg-white/5 hover:!bg-white/5 transition-colors duration-300'
        })}
                    ${statCardTemplate({
            label: 'Total Duration',
            value: `${vm.stats.totalAdDuration}s`,
            icon: icons.clock,
            colorVar: '--tertiary-accent',
            customClasses: '!bg-white/5 hover:!bg-white/5 transition-colors duration-300'
        })}
                    ${statCardTemplate({
            label: 'SCTE-35 Signals',
            value: (vm.stats.detectionCounts['SCTE35_INBAND'] || 0) + (vm.stats.detectionCounts['SCTE35_DATERANGE'] || 0),
            icon: icons.binary,
            colorVar: '--color-info',
            customClasses: '!bg-white/5 hover:!bg-white/5 transition-colors duration-300'
        })}
                </div>

                <!-- TIMELINE PANEL -->
                <div
                    class="p-6 transition-all duration-300 group"
                    style=${styleMap({ ...layoutCardStyles, background: '#1e293b' })}
                >
                     <div class="flex items-center justify-between mb-6">
                        <h3 class="text-xs font-bold text-slate-400 r flex items-center gap-2">
                            <span class="p-1.5 rounded-md bg-white/5 text-emerald-200">
                                ${icons.barChart}
                            </span>
                            Timeline Visualization
                        </h3>
                        <span class="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-slate-400 hover:text-slate-200 transition-colors cursor-default">
                            ${vm.duration.toFixed(2)}s Total
                        </span>
                    </div>
                    ${adTimelineTemplate(vm.avails, vm.duration, handleSelect, this.selectedAvailId)}
                </div>

                <!-- BREAK CHRONOLOGY (FEED) -->
                <div
                    class="flex flex-col grow overflow-hidden transition-all duration-300"
                    style=${styleMap({ ...layoutCardStyles, background: '#1e293b' })}
                >
                    <div class="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
                        <h3 class="text-xs font-bold text-slate-400 r flex items-center gap-2">
                            <span class="p-1.5 rounded-md bg-white/5 text-slate-300">
                                ${icons.list}
                            </span>
                            Break Chronology
                        </h3>
                        <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-400/25 text-[10px] font-bold text-emerald-200">
                            ${vm.avails.length} Events
                        </span>
                    </div>

                    <div class="p-4 overflow-y-auto custom-scrollbar space-y-3 grow">
                        ${vm.avails.length === 0
                ? html`
                                <div class="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                                    <div class="p-6 rounded-full bg-white/5 mb-4 border border-white/10">
                                        ${icons.ghost}
                                    </div>
                                    <p class="text-sm font-bold">No Ad Breaks Detected</p>
                                    <p class="text-xs mt-1 opacity-70">Adjust settings to enable heuristic detection</p>
                                </div>
                            `
                : vm.avails.map((avail) => breakCardTemplate(avail, avail.id === this.selectedAvailId, handleSelect))
            }
                    </div>
                </div>
            </div>
        `;
    }

    render() {
        if (!this.container) return;
        render(
            html`
            <div class="flex flex-col h-full w-full overflow-hidden">
                <div class="shrink-0 px-2 pt-2">${this.topBarTemplate()}</div>
                <div class="grow min-h-0 overflow-hidden">
                    ${this.renderTemplate()}
                </div>
            </div>
        `,
            this.container
        );
        const sidebarContainer =
            document.getElementById('contextual-sidebar');
        if (sidebarContainer) {
            render(this.sidebarTemplate(), sidebarContainer);
        }
    }

    topBarTemplate() {
        const { activeSidebar } = useUiStore.getState();
        const isContextualOpen = activeSidebar === 'contextual';
        const isSettingsActive = isContextualOpen && !this.selectedAvailId;

        // Hero header (in-flow; 1.2.0 has no topBar slot)
        return html`
            <div class="w-full h-full flex items-center justify-between">
                 <div class="relative group">
                    <div class="flex items-center gap-4 p-2">
                        <div class="p-3 rounded-md text-emerald-200 border border-emerald-400/25 relative overflow-hidden">
                             ${icons.activity}
                        </div>
                        <div>
                            <h1 class="text-xl font-bold text-slate-200 leading-none">
                                Ad Verification
                            </h1>
                            <div class="flex items-center gap-2 mt-1.5">
                                <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-200 border border-emerald-400/25">
                                    SCTE-35
                                </span>
                                <span class="text-[10px] font-bold text-slate-400 opacity-80">
                                    & Manifest Analysis
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Settings Action -->
                <button
                    @click=${() => this.toggleSettings()}
                    class="flex items-center gap-2 px-4 py-2 rounded-md border transition-all duration-300 font-bold text-sm ${isSettingsActive ? 'bg-emerald-500/10 text-slate-100 border-emerald-400/25 ' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-slate-200' }"
                >
                    ${icons.settings}
                    <span>Config</span>
                </button>
            </div>
        `;
    }

    sidebarTemplate() {
        const { activeSidebar } = useUiStore.getState();
        const isContextualOpen = activeSidebar === 'contextual';
        if (!isContextualOpen) return html``;

        const { streams, activeStreamId } = useAnalysisStore.getState();
        const stream = streams.find((s) => s.id === activeStreamId) ?? streams[0];
        if (!stream) return html``;
        const { adDetectionPreferences } = useUiStore.getState();
        const vm = createAdvertisingViewModel(stream, adDetectionPreferences);
        const selectedAvail =
            vm.avails.find((a) => a.id === this.selectedAvailId) || null;

        // The Inspector template handles its own scrolling (h-full flex flex-col).
        const onClose = () => {
            // When closing from the Inspector (which is usually the "Configure" button in the Break card),
            // we want to return to the Settings view (Clear selection)
            this.selectedAvailId = null;
            this.render();
        };

        return inspectorTemplate(selectedAvail, onClose);
    }
}

export const advertisingView = new AdvertisingView();
