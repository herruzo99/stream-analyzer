import { html, render } from 'lit-html';
import { renderChart, disposeChart } from '@/ui/shared/charts/chart-renderer';

const timelineChartOptions = (viewModel) => {
    if (!viewModel || viewModel.tracks.length === 0) {
        return {};
    }

    const { tracks, segments, events, adAvails, duration, isLive } = viewModel;

    // ECharts custom series renderItem function
    const renderItem = (params, api) => {
        const categoryIndex = api.value(0);
        const start = api.coord([api.value(1), categoryIndex]);
        const end = api.coord([api.value(2), categoryIndex]);
        const height = api.size([0, 1])[1] * 0.6; // 60% of the band height

        const rectShape = {
            x: start[0],
            y: start[1] - height / 2,
            width: end[0] - start[0],
            height: height,
        };

        return {
            type: 'rect',
            shape: rectShape,
            style: api.style(),
        };
    };

    return {
        dataZoom: [
            {
                type: 'slider',
                filterMode: 'weakFilter',
                showDataShadow: false,
                top: 50,
                labelFormatter: '',
            },
            {
                type: 'inside',
                filterMode: 'weakFilter',
            },
        ],
        grid: {
            height: tracks.length * 40, // 40px per track
            top: 100,
            left: 150,
            right: 30,
        },
        xAxis: {
            min: 0,
            max: duration,
            scale: true,
            axisLabel: {
                formatter: (val) => `${val.toFixed(2)}s`,
                color: '#9ca3af',
            },
            axisLine: { lineStyle: { color: '#4b5563' } },
        },
        yAxis: {
            data: tracks.map((t) => t.label),
            inverse: true,
            axisLabel: { color: '#9ca3af' },
            axisLine: { lineStyle: { color: '#4b5563' } },
        },
        series: [
            {
                type: 'custom',
                renderItem: renderItem,
                itemStyle: {
                    opacity: 0.8,
                },
                encode: {
                    x: [1, 2], // startTime, endTime
                    y: 0, // trackIndex
                },
                data: segments.map((seg) => ({
                    value: [
                        seg.trackIndex,
                        seg.startTime,
                        seg.endTime,
                        seg.duration,
                    ],
                    itemStyle: {
                        color: seg.isPartial ? '#2563eb' : '#475569',
                    },
                    segment: seg, // Attach original data for tooltip
                })),
                markArea: {
                    silent: true,
                    itemStyle: {
                        color: 'rgba(168, 85, 247, 0.3)',
                        borderColor: 'rgba(168, 85, 247, 0.8)',
                        borderWidth: 1,
                    },
                    data: adAvails.map((avail) => [
                        {
                            name: `Ad: ${avail.id}\n${avail.duration.toFixed(
                                2
                            )}s`,
                            xAxis: avail.startTime,
                        },
                        { xAxis: avail.startTime + avail.duration },
                    ]),
                },
                markLine: {
                    silent: true,
                    symbol: ['none', 'none'],
                    label: { show: true, position: 'start', formatter: '{b}' },
                    data: events.map((event) => ({
                        name: event.type,
                        xAxis: event.time,
                        lineStyle: { color: event.color, width: 2 },
                    })),
                },
            },
        ],
    };
};

class TimelineChart extends HTMLElement {
    constructor() {
        super();
        this.chartContainer = null;
        this._viewModel = null;
    }

    set viewModel(newViewModel) {
        if (this._viewModel === newViewModel) return;
        this._viewModel = newViewModel;
        this.render();
    }

    get viewModel() {
        return this._viewModel;
    }

    connectedCallback() {
        this.chartContainer = document.createElement('div');
        this.chartContainer.style.width = '100%';
        this.chartContainer.style.height = `${
            (this._viewModel?.tracks?.length || 1) * 40 + 120
        }px`;
        this.appendChild(this.chartContainer);
        this.render();
    }

    disconnectedCallback() {
        if (this.chartContainer) {
            disposeChart(this.chartContainer);
        }
    }

    render() {
        if (!this.chartContainer || !this._viewModel) return;

        if (this._viewModel.tracks.length === 0) {
            render(
                html`<div
                    class="flex items-center justify-center h-full text-center text-gray-500"
                >
                    No timeline data available for this stream.
                </div>`,
                this
            );
            return;
        }

        this.chartContainer.style.height = `${
            this._viewModel.tracks.length * 40 + 120
        }px`;
        renderChart(this.chartContainer, timelineChartOptions(this._viewModel));
    }
}

customElements.define('timeline-chart', TimelineChart);
