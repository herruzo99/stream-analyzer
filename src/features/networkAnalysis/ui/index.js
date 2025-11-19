import { html, render } from 'lit-html';
import { useNetworkStore, networkActions } from '@/state/networkStore';
import { useAnalysisStore } from '@/state/analysisStore';
import { createNetworkViewModel } from './view-model.js';
import { networkToolbarTemplate } from './components/network-toolbar.js';
import { summaryCardsTemplate } from './components/summary-cards.js';
import { waterfallChartTemplate } from './components/waterfall-chart.js';
import { networkDetailsPanelTemplate } from './components/network-details-panel.js';

// New ECharts integration
import { renderChart, disposeChart } from '@/ui/shared/charts/chart-renderer';
import { throughputChartOptions } from '@/ui/shared/charts/throughput-chart';

let container = null;
let networkUnsubscribe = null;
let analysisUnsubscribe = null;

function renderNetworkView() {
    if (!container) return;

    const { streams } = useAnalysisStore.getState();
    if (streams.length === 0) {
        networkAnalysisView.unmount();
        return;
    }

    const { events, selectedEventId, filters, visibleStreamIds } =
        useNetworkStore.getState();

    // --- ARCHITECTURAL FIX: Filter out internal app requests ---
    // Only include events that have a non-null streamId and are in the visible set.
    const allVisibleStreamEvents = events.filter(
        (event) =>
            event.streamId !== null && visibleStreamIds.has(event.streamId)
    );
    // --- END FIX ---

    let filteredStreamEvents = allVisibleStreamEvents;
    if (filters.type !== 'all') {
        filteredStreamEvents = allVisibleStreamEvents.filter(
            (event) => event.resourceType === filters.type
        );
    }

    const selectedEvent = filteredStreamEvents.find(
        (event) => event.id === selectedEventId
    );

    const viewModel = createNetworkViewModel(
        filteredStreamEvents,
        allVisibleStreamEvents
    );

    const chartOpts = throughputChartOptions(viewModel.throughputData);
    // Defer chart rendering until after lit-html has created the container div
    setTimeout(() => {
        const chartContainer = container?.querySelector(
            '#throughput-chart-container'
        );
        if (chartContainer) {
            renderChart(chartContainer, chartOpts);
        }
    }, 0);

    const template = html`
        <div class="flex flex-col h-full">
            <div class="shrink-0">
                <h3 class="text-xl font-bold mb-4">Network Analysis</h3>
                ${networkToolbarTemplate()}
                <div class="mt-6">
                    ${summaryCardsTemplate(viewModel.summary)}
                </div>
            </div>
            <div
                class="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 mt-6 grow min-h-0"
            >
                <div class="flex flex-col gap-6 min-h-0">
                    <div class="bg-gray-800 p-4 rounded-lg shrink-0">
                        <h4 class="font-bold text-gray-300 mb-2">
                            Throughput Over Time
                        </h4>
                        <div id="throughput-chart-container" class="h-48"></div>
                    </div>
                    <div class="grow min-h-0">
                        ${waterfallChartTemplate(
                            viewModel.waterfallData,
                            viewModel.timeline
                        )}
                    </div>
                </div>
                <div class="min-h-0">
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

        if (networkUnsubscribe) networkUnsubscribe();
        if (analysisUnsubscribe) analysisUnsubscribe();

        const { streams } = useAnalysisStore.getState();
        const allStreamIds = streams.map((s) => s.id);
        networkActions.setVisibleStreamIds(allStreamIds);

        networkUnsubscribe = useNetworkStore.subscribe(renderNetworkView);
        analysisUnsubscribe = useAnalysisStore.subscribe(renderNetworkView);

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
        networkUnsubscribe = null;
        analysisUnsubscribe = null;

        if (container) {
            render(html``, container);
        }
        container = null;
    },
};
