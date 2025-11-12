import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { useUiStore } from '@/state/uiStore';
import { renderChart, disposeChart } from '@/ui/shared/charts/chart-renderer';
import { formatBitrate } from '@/ui/shared/format';

const createChartOptions = (title, yAxisName, yAxisFormatter, seriesData) => ({
    title: { text: title, textStyle: { color: '#e5e7eb', fontSize: 16 } },
    tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(31, 41, 55, 0.9)',
        borderColor: '#4b5563',
        textStyle: { color: '#e5e7eb' },
    },
    legend: { type: 'scroll', bottom: 0, textStyle: { color: '#9ca3af' } },
    grid: { top: '60', right: '20', bottom: '50', left: '65' },
    xAxis: { type: 'time', axisLine: { lineStyle: { color: '#4b5563' } } },
    yAxis: {
        type: 'value',
        name: yAxisName,
        axisLabel: { formatter: yAxisFormatter },
        splitLine: { lineStyle: { color: '#374151' } },
        axisLine: { lineStyle: { color: '#4b5563' } },
    },
    series: seriesData,
});

class GraphsViewComponent extends HTMLElement {
    constructor() {
        super();
        this.multiPlayerUnsubscribe = null;
        this.uiUnsubscribe = null;
    }

    connectedCallback() {
        this.innerHTML = `
            <div class="space-y-8">
                <div id="buffer-chart" class="h-72 bg-gray-800 p-4 rounded-lg border border-gray-700"></div>
                <div id="bandwidth-chart" class="h-72 bg-gray-800 p-4 rounded-lg border border-gray-700"></div>
                <div id="bitrate-chart" class="h-72 bg-gray-800 p-4 rounded-lg border border-gray-700"></div>
            </div>
        `;
        this.multiPlayerUnsubscribe = useMultiPlayerStore.subscribe(() =>
            this.renderCharts()
        );
        this.uiUnsubscribe = useUiStore.subscribe(() => this.renderCharts());
        this.renderCharts();
    }

    disconnectedCallback() {
        if (this.multiPlayerUnsubscribe) this.multiPlayerUnsubscribe();
        if (this.uiUnsubscribe) this.uiUnsubscribe();
        disposeChart(
            /** @type {HTMLElement} */ (this.querySelector('#buffer-chart'))
        );
        disposeChart(
            /** @type {HTMLElement} */ (this.querySelector('#bandwidth-chart'))
        );
        disposeChart(
            /** @type {HTMLElement} */ (this.querySelector('#bitrate-chart'))
        );
    }

    renderCharts() {
        // --- PERFORMANCE FIX: Conditionally render based on visibility ---
        // Only execute the expensive chart rendering if this component's tab is active.
        const { multiPlayerActiveTab } = useUiStore.getState();
        if (multiPlayerActiveTab !== 'graphs') {
            return;
        }
        // --- END FIX ---

        const { players } = useMultiPlayerStore.getState();
        const playersArray = Array.from(players.values());

        const bufferSeries = playersArray.map((p) => ({
            name: p.streamName,
            type: 'line',
            showSymbol: false,
            data: p.playbackHistory.map((h) => [h.time, h.buffer]),
        }));
        renderChart(
            /** @type {HTMLElement} */ (this.querySelector('#buffer-chart')),
            createChartOptions(
                'Forward Buffer',
                'Seconds',
                '{value} s',
                bufferSeries
            )
        );

        const bandwidthSeries = playersArray.map((p) => ({
            name: p.streamName,
            type: 'line',
            showSymbol: false,
            data: p.playbackHistory.map((h) => [
                h.time,
                p.stats?.abr.estimatedBandwidth || 0,
            ]),
        }));
        renderChart(
            /** @type {HTMLElement} */ (this.querySelector('#bandwidth-chart')),
            createChartOptions(
                'Estimated Bandwidth',
                'Bitrate',
                (val) => formatBitrate(val),
                bandwidthSeries
            )
        );

        const bitrateSeries = playersArray.map((p) => ({
            name: p.streamName,
            type: 'line',
            step: 'start',
            showSymbol: false,
            data: p.playbackHistory.map((h) => [
                h.time,
                p.stats?.abr.currentVideoBitrate || 0,
            ]),
        }));
        renderChart(
            /** @type {HTMLElement} */ (this.querySelector('#bitrate-chart')),
            createChartOptions(
                'Video Bitrate',
                'Bitrate',
                (val) => formatBitrate(val),
                bitrateSeries
            )
        );
    }
}

if (!customElements.get('graphs-view-component')) {
    customElements.define('graphs-view-component', GraphsViewComponent);
}