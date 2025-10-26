import { html, render } from 'lit-html';
import { useNetworkStore } from '@/state/networkStore';
import { useAnalysisStore } from '@/state/analysisStore';
import { createNetworkViewModel } from './view-model.js';
import { networkToolbarTemplate } from './components/network-toolbar.js';
import { summaryCardsTemplate } from './components/summary-cards.js';
import { throughputChartTemplate } from './components/throughput-chart.js';
import { waterfallChartTemplate } from './components/waterfall-chart.js';
import { networkDetailsPanelTemplate } from './components/network-details-panel.js';

let container = null;
let networkUnsubscribe = null;
let analysisUnsubscribe = null;

function renderNetworkView() {
    if (!container) return;

    const { streams, activeStreamId } = useAnalysisStore.getState();
    const stream = streams.find((s) => s.id === activeStreamId);
    if (!stream) {
        networkAnalysisView.unmount();
        return;
    }

    const { events, selectedEventId, filters } = useNetworkStore.getState();

    const allStreamEvents = events.filter(
        (event) => event.streamId === stream.id
    );

    let filteredStreamEvents = allStreamEvents;
    if (filters.type !== 'all') {
        filteredStreamEvents = allStreamEvents.filter(
            (event) => event.resourceType === filters.type
        );
    }

    const selectedEvent = filteredStreamEvents.find(
        (event) => event.id === selectedEventId
    );

    const viewModel = createNetworkViewModel(
        filteredStreamEvents,
        allStreamEvents,
        stream
    );

    const template = html`
        <div>
            <h3 class="text-xl font-bold mb-4">Network Analysis</h3>
            ${networkToolbarTemplate()}
            ${summaryCardsTemplate(viewModel.summary)}
            <div class="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 mt-6">
                <div class="space-y-6">
                    ${throughputChartTemplate(viewModel.throughputData)}
                    ${waterfallChartTemplate(
                        viewModel.waterfallData,
                        viewModel.timeline
                    )}
                </div>
                <div>${networkDetailsPanelTemplate(selectedEvent)}</div>
            </div>
        </div>
    `;
    render(template, container);
}

export const networkAnalysisView = {
    mount(containerElement, { stream }) {
        container = containerElement;

        if (networkUnsubscribe) networkUnsubscribe();
        if (analysisUnsubscribe) analysisUnsubscribe();

        networkUnsubscribe = useNetworkStore.subscribe(renderNetworkView);
        analysisUnsubscribe = useAnalysisStore.subscribe(renderNetworkView);

        renderNetworkView();
    },

    unmount() {
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
