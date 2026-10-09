import { useAnalysisStore } from '@/state/analysisStore';
import { networkActions, useNetworkStore } from '@/state/networkStore';
import { usePlayerStore } from '@/state/playerStore';
import { uiActions } from '@/state/uiStore'; // Added uiActions
import { playerActiveWarningTemplate } from '@/ui/components/player-active-warning.js';
import * as icons from '@/ui/icons';
import { openModalWithContent } from '@/ui/services/modalService';
import { disposeChart, renderChart } from '@/ui/shared/charts/chart-renderer';
import { throughputChartOptions } from '@/ui/shared/charts/throughput-chart';
import { html, render } from 'lit-html';
import { styleMap } from 'lit-html/directives/style-map.js'; // Added styleMap
import { networkDetailsPanelTemplate } from './components/network-details-panel.js';
import { networkToolbarTemplate } from './components/network-toolbar.js';
import { summaryCardsTemplate } from './components/summary-cards.js';
import { waterfallChartTemplate } from './components/waterfall-chart.js';
import { createNetworkViewModel } from './view-model.js';

// Semantic Layout Styles for "Cards" - matching summary/ui/index.js pattern
const layoutCardStyles = {
    
    borderRadius: '0.75rem',
    boxShadow: '0 8px 30px rgb(0 0 0 / 0.35)',
    backdropFilter: 'blur(12px)',
    background: '#1e293b', // Default background
};

let container = null;
let networkUnsubscribe = null;
let analysisUnsubscribe = null;
let playerUnsubscribe = null;

function renderNetworkView() {
    if (!container) return;

    const {
        events,
        selectedEventId,
        filters,
        visibleStreamIds,
        interventionRules,
    } = useNetworkStore.getState();

    const allVisibleStreamEvents = events.filter(
        (event) =>
            event.streamId !== null && visibleStreamIds.has(event.streamId)
    );

    let filteredStreamEvents = allVisibleStreamEvents;

    if (filters.type !== 'all') {
        filteredStreamEvents = filteredStreamEvents.filter(
            (event) => event.resourceType === filters.type
        );
    }

    if (filters.search) {
        const term = filters.search.toLowerCase();
        filteredStreamEvents = filteredStreamEvents.filter((e) =>
            e.url.toLowerCase().includes(term)
        );
    }

    const selectedEvent = filteredStreamEvents.find(
        (event) => event.id === selectedEventId
    );
    const viewModel = createNetworkViewModel(
        filteredStreamEvents,
        allVisibleStreamEvents
    );

    requestAnimationFrame(() => {
        const chartContainer = container?.querySelector(
            '#throughput-chart-container'
        );
        if (chartContainer && chartContainer.isConnected) {
            if (viewModel.throughputData.length > 0) {
                renderChart(
                    chartContainer,
                    throughputChartOptions(viewModel.throughputData)
                );
            } else {
                renderChart(chartContainer, throughputChartOptions([]));
            }
        }
    });

    const activeRulesCount = interventionRules.filter((r) => r.enabled).length;

    const handleOpenChaosModal = () => {
        openModalWithContent({
            title: 'Network Interventions',
            url: 'Chaos Tools',
            content: { type: 'networkIntervention', data: {} },
            isFullWidth: false,
        });
    };

    // --- LAYOUT INJECTION ---
    // Inject Title and Controls into Shell Top Bar
    uiActions.setShellSlot('topBar', html`
        <div class="w-full h-full flex items-center justify-between px-4">
            <h3 class="text-xl font-bold text-slate-100 flex items-center gap-3">
                 <div class="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                    ${icons.network}
                </div>
                Network Inspector
            </h3>
            <button
                @click=${handleOpenChaosModal}
                class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 hover:bg-slate-800"
            >
                ${icons.zapOff} Chaos Tools
                ${activeRulesCount > 0
            ? html`<span
                          class="bg-red-500 text-white px-1.5 rounded-full text-[9px]"
                          >${activeRulesCount}</span
                      >`
            : ''}
            </button>
        </div>
    `);

    // Main Content
    const template = html`
        <div
            class="flex flex-col h-full animate-fadeIn custom-scrollbar"
            style="gap: 0.75rem; padding-bottom: 0.75rem;"
        >
            ${playerActiveWarningTemplate('Network Inspector')}

            <!-- Toolbar & Summary Section -->
             <div
                class="flex flex-col shrink-0"
                style="gap: 0.75rem"
            >
                 <!-- Toolbar Card -->
                <div
                    class="relative overflow-hidden p-4 transition-all duration-300"
                    style=${styleMap({ ...layoutCardStyles, background: '#1e293b' })}
                >
                    ${networkToolbarTemplate()}
                </div>

                <!-- Stats Cards -->
                 ${summaryCardsTemplate(viewModel.summary)}
            </div>

            <!-- Throughput Chart -->
             <div
                class="relative overflow-hidden p-2 transition-all duration-300 min-h-[140px]"
                style=${styleMap({ ...layoutCardStyles, background: '#1e293b' })}
            >
                 <h4
                    class="absolute top-2 left-3 text-[10px] font-bold text-slate-400 uppercase z-10"
                >
                    Throughput
                </h4>
                <div
                    id="throughput-chart-container"
                    class="w-full h-full"
                ></div>
            </div>

            <!-- Split View: Waterfall + Details -->
            <div 
                class="flex gap-4 grow min-h-0 overflow-hidden"
                 style="gap: 0.75rem"
            >
                <!-- Waterfall Area -->
                <div
                    class="grow min-w-0 flex flex-col h-full overflow-hidden relative"
                     style=${styleMap({ ...layoutCardStyles, background: '#1e293b' })}
                >
                    ${waterfallChartTemplate(viewModel.waterfallData)}
                </div>

                <!-- Details Panel -->
                <div
                    class="w-[400px] shrink-0 h-full overflow-hidden relative"
                     style=${styleMap({ ...layoutCardStyles, background: '#1e293b' })}
                >
                    ${networkDetailsPanelTemplate(selectedEvent)}
                </div>
            </div>
        </div>
    `;

    render(template, container);
}

export const networkAnalysisView = {
    mount(containerElement) {
        container = containerElement;
        const { streams } = useAnalysisStore.getState();
        const { visibleStreamIds } = useNetworkStore.getState();
        if (visibleStreamIds.size === 0 && streams.length > 0) {
            networkActions.setVisibleStreamIds(streams.map((s) => s.id));
        }

        if (networkUnsubscribe) networkUnsubscribe();
        if (analysisUnsubscribe) analysisUnsubscribe();
        if (playerUnsubscribe) playerUnsubscribe();

        networkUnsubscribe = useNetworkStore.subscribe(renderNetworkView);
        analysisUnsubscribe = useAnalysisStore.subscribe(renderNetworkView);
        playerUnsubscribe = usePlayerStore.subscribe(renderNetworkView);
        renderNetworkView();
    },

    unmount() {
        const chartContainer = container?.querySelector(
            '#throughput-chart-container'
        );
        if (chartContainer) {
            disposeChart(chartContainer);
        }

        if (networkUnsubscribe) networkUnsubscribe();
        if (analysisUnsubscribe) analysisUnsubscribe();
        if (playerUnsubscribe) playerUnsubscribe();
        networkUnsubscribe = null;
        analysisUnsubscribe = null;
        playerUnsubscribe = null;

        // Clean up slots
        uiActions.setShellSlot('topBar', null);

        if (container) render(html``, container);
        container = null;
    },
};
