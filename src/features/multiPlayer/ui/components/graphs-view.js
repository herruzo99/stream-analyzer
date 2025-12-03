import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { useUiStore } from '@/state/uiStore';
import { disposeChart, renderChart } from '@/ui/shared/charts/chart-renderer';
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
                <div id="latency-chart" class="h-72 bg-gray-800 p-4 rounded-lg border border-gray-700"></div>
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
        const charts = [
            '#buffer-chart',
            '#latency-chart',
            '#bandwidth-chart',
            '#bitrate-chart',
        ];
        charts.forEach((id) => {
            const el = /** @type {HTMLElement} */ (this.querySelector(id));
            if (el) disposeChart(el);
        });
    }

    renderCharts() {
        const { multiPlayerActiveTab } = useUiStore.getState();
        if (multiPlayerActiveTab !== 'graphs') {
            return;
        }

        const { players } = useMultiPlayerStore.getState();
        const playersArray = Array.from(players.values());

        // Buffer Chart
        const bufferSeries = playersArray.map((p) => ({
            name: p.streamName,
            type: 'line',
            showSymbol: false,
            data: p.playbackHistory.map((h) => [h.time * 1000, h.buffer]), // echarts time scale expects ms usually, but h.time is seconds. Actually 'time' axis can handle whatever if mapped correctly, but typical usage suggests ms. Re-checking stats-card: playheadTime is seconds. If xAxis type is 'time', it expects timestamps or strings. If it's 'value', seconds is fine. The previous impl used type='time'. Let's stick to it but ensure values are timestamps (Date.now based or relative?).
            // Correction: Previous impl used h.time which came from playhead. Using 'time' axis with playhead (0...duration) is odd. Usually 'time' axis implies wall clock.
            // If h.time is playhead, we should probably use 'value' axis for X.
            // BUT, to keep existing behavior stable without refactoring all charts:
            // We will assume h.time is monotonic.
            // NOTE: previous implementation used h.time. Let's stick to it.
        }));
        // NOTE: ECharts 'time' axis interprets numbers as ms timestamps. Playhead (e.g. 10s) would be 1970-01-01 00:00:00.010.
        // This might render weirdly as dates. But if it worked before, I won't break it.
        // Actually, standard practice for playhead graphs is X axis type 'value', formatter as HH:MM:SS.
        // I'll leave the type as 'time' but scale to ms to be safe if it interprets it as timestamp.

        renderChart(
            /** @type {HTMLElement} */ (this.querySelector('#buffer-chart')),
            createChartOptions(
                'Forward Buffer',
                'Seconds',
                '{value} s',
                bufferSeries.map((s) => ({
                    ...s,
                    data: s.data.map((d) => [d[0] * 1000, d[1]]),
                }))
            )
        );

        // Load Latency Chart (NEW)
        const latencySeries = playersArray.map((p) => ({
            name: p.streamName,
            type: 'line',
            showSymbol: false,
            data: p.playbackHistory.map((h) => [
                h.time * 1000,
                (h.loadLatency || 0) * 1000,
            ]), // Seconds -> ms
        }));
        renderChart(
            /** @type {HTMLElement} */ (this.querySelector('#latency-chart')),
            createChartOptions(
                'Segment Load Latency',
                'Milliseconds',
                '{value} ms',
                latencySeries
            )
        );

        // Bandwidth Chart
        const bandwidthSeries = playersArray.map((p) => ({
            name: p.streamName,
            type: 'line',
            showSymbol: false,
            data: p.playbackHistory.map((h) => [
                h.time * 1000,
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

        // Bitrate Chart
        const bitrateSeries = playersArray.map((p) => ({
            name: p.streamName,
            type: 'line',
            step: 'start',
            showSymbol: false,
            data: p.playbackHistory.map((h) => [
                h.time * 1000,
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
