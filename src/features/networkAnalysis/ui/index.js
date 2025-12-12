import { useAnalysisStore } from '@/state/analysisStore';
import { networkActions, useNetworkStore } from '@/state/networkStore';
import { usePlayerStore } from '@/state/playerStore';
import { playerActiveWarningTemplate } from '@/ui/components/player-active-warning.js';
import * as icons from '@/ui/icons';
import { openModalWithContent } from '@/ui/services/modalService';
import { disposeChart, renderChart } from '@/ui/shared/charts/chart-renderer';
import { throughputChartOptions } from '@/ui/shared/charts/throughput-chart';
import { html, render } from 'lit-html';
import { networkDetailsPanelTemplate } from './components/network-details-panel.js';
import { networkToolbarTemplate } from './components/network-toolbar.js';
import { summaryCardsTemplate } from './components/summary-cards.js';
import { waterfallChartTemplate } from './components/waterfall-chart.js';
import { createNetworkViewModel } from './view-model.js';

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

    const template = html`
        <div class="flex flex-col h-full bg-slate-950 overflow-hidden">
            ${playerActiveWarningTemplate('Network Inspector')}

            <div class="flex h-full min-h-0 overflow-hidden">
                <!-- Main Content Container -->
                <div
                    class="flex flex-col grow min-w-0 h-full p-4 sm:p-6 overflow-hidden"
                >
                    <!-- Top Section (Toolbar + Stats + Chart) -->
                    <div class="shrink-0 space-y-4 mb-4">
                        <div class="flex justify-between items-start">
                            <h3 class="text-xl font-bold text-white">
                                Network Inspector
                            </h3>
                            <button
                                @click=${handleOpenChaosModal}
                                class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-slate-900 text-slate-400 hover:text-white border border-slate-700"
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

                        ${networkToolbarTemplate()}
                        ${summaryCardsTemplate(viewModel.summary)}

                        <!-- Throughput Chart -->
                        <div
                            class="h-32 bg-slate-900 rounded-lg border border-slate-800 p-2 relative"
                        >
                            <h4
                                class="absolute top-2 left-3 text-[10px] font-bold text-slate-500 uppercase z-10"
                            >
                                Throughput
                            </h4>
                            <div
                                id="throughput-chart-container"
                                class="w-full h-full"
                            ></div>
                        </div>
                    </div>

                    <!-- Split View: Waterfall + Details -->
                    <div class="flex gap-4 grow min-h-0 overflow-hidden">
                        <!-- Waterfall Area -->
                        <div
                            class="grow min-w-0 flex flex-col h-full overflow-hidden rounded-lg border border-slate-700 bg-slate-900"
                        >
                            ${waterfallChartTemplate(viewModel.waterfallData)}
                        </div>

                        <!-- Details Panel -->
                        <div
                            class="w-[350px] shrink-0 h-full overflow-hidden rounded-lg border border-slate-700 bg-slate-900"
                        >
                            ${networkDetailsPanelTemplate(selectedEvent)}
                        </div>
                    </div>
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

        if (container) render(html``, container);
        container = null;
    },
};
