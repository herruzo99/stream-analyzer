import { init as initChart } from 'echarts/core';
import { disposeChart } from '@/ui/shared/charts/chart-renderer';

class DriftChart extends HTMLElement {
    constructor() {
        super();
        this._data = [];
        this.chart = null;
        this.resizeObserver = null;
    }

    set data(val) {
        this._data = val;
        this.updateChart();
    }

    connectedCallback() {
        this.style.display = 'block';
        this.style.width = '100%';
        this.style.height = '100%';

        const container = document.createElement('div');
        container.style.width = '100%';
        container.style.height = '100%';
        this.appendChild(container);

        this.chart = initChart(container);
        this.resizeObserver = new ResizeObserver(() => this.chart?.resize());
        this.resizeObserver.observe(container);
    }

    disconnectedCallback() {
        if (this.resizeObserver) this.resizeObserver.disconnect();
        if (this.chart) disposeChart(this.chart);
    }

    updateChart() {
        if (!this.chart || !this._data) return;

        const timestamps = this._data.map((d) =>
            new Date(d.timestamp).toLocaleTimeString()
        );
        const drifts = this._data.map((d) => d.drift.toFixed(2));

        const option = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                borderColor: '#334155',
                textStyle: { color: '#f8fafc', fontSize: 11 },
            },
            grid: {
                top: 20,
                left: 50,
                right: 20,
                bottom: 30,
            },
            xAxis: {
                type: 'category',
                data: timestamps,
                axisLabel: { color: '#64748b', fontSize: 10 },
                axisLine: { lineStyle: { color: '#334155' } },
            },
            yAxis: {
                type: 'value',
                name: 'Drift (s)',
                nameTextStyle: { color: '#64748b', fontSize: 10 },
                axisLabel: { color: '#64748b', fontSize: 10 },
                splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
            },
            series: [
                {
                    data: drifts,
                    type: 'line',
                    smooth: true,
                    symbol: 'none',
                    lineStyle: { color: '#f59e0b', width: 2 },
                    areaStyle: {
                        color: {
                            type: 'linear',
                            x: 0,
                            y: 0,
                            x2: 0,
                            y2: 1,
                            colorStops: [
                                { offset: 0, color: 'rgba(245, 158, 11, 0.3)' },
                                { offset: 1, color: 'rgba(245, 158, 11, 0)' },
                            ],
                        },
                    },
                },
            ],
        };

        this.chart.setOption(option);
    }
}

customElements.define('drift-chart', DriftChart);
