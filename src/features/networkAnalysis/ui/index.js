import { html, render } from 'lit-html';
import { useNetworkStore, networkActions } from '@/state/networkStore';
import { useAnalysisStore } from '@/state/analysisStore';
import { createNetworkViewModel } from './view-model.js';
import { networkToolbarTemplate } from './components/network-toolbar.js';
import { summaryCardsTemplate } from './components/summary-cards.js';
import { waterfallChartTemplate } from './components/waterfall-chart.js';
import { networkDetailsPanelTemplate } from './components/network-details-panel.js';
import { renderChart, disposeChart } from '@/ui/shared/charts/chart-renderer';
import { throughputChartOptions } from '@/ui/shared/charts/throughput-chart';

let container = null;
let networkUnsubscribe = null;
let analysisUnsubscribe = null;

function renderNetworkView() {
    if (!container) return;

    const { streams } = useAnalysisStore.getState();
    // Handle empty state if needed, though the view is usually robust
    if (streams.length === 0) {
        // Optional: render empty state
    }

    const { events, selectedEventId, filters, visibleStreamIds } =
        useNetworkStore.getState();

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

    // Render Chart Logic
    // We use RAF to ensure the DOM element exists after Lit renders the template below.
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
                // If no data, we might want to clear the chart or show "No Data"
                // Re-rendering with empty options handles clearing/updating title
                renderChart(chartContainer, throughputChartOptions([]));
            }
        }
    });

    const template = html`
        <div
            class="flex flex-col h-full p-4 sm:p-6 bg-slate-950 overflow-hidden"
        >
            <!-- Top Section -->
            <div class="shrink-0 space-y-4">
                <h3 class="text-xl font-bold text-white">Network Inspector</h3>
                ${networkToolbarTemplate()}
                ${summaryCardsTemplate(viewModel.summary)}
            </div>

            <!-- Throughput Chart -->
            <div
                class="mt-4 h-32 shrink-0 bg-slate-900 rounded-lg border border-slate-800 p-2 relative"
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

            <!-- Split View: Waterfall + Details -->
            <div class="flex gap-4 mt-4 grow min-h-0 h-full overflow-hidden">
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

        networkUnsubscribe = useNetworkStore.subscribe(renderNetworkView);
        analysisUnsubscribe = useAnalysisStore.subscribe(renderNetworkView);
        renderNetworkView();
    },

    unmount() {
        // Explicitly dispose of the chart before clearing the DOM to prevent leaks/orphans
        const chartContainer = container?.querySelector(
            '#throughput-chart-container'
        );
        if (chartContainer) {
            disposeChart(chartContainer);
        }

        if (networkUnsubscribe) networkUnsubscribe();
        if (analysisUnsubscribe) analysisUnsubscribe();
        networkUnsubscribe = null;
        analysisUnsubscribe = null;

        if (container) render(html``, container);
        container = null;
    },
};
