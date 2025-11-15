import { html, render } from 'lit-html';
import { renderChart, disposeChart } from '@/ui/shared/charts/chart-renderer';
import { formatBitrate } from '@/ui/shared/format';

const abrLadderChartOptions = (abrData) => {
    const allHeights = [
        ...new Set(abrData.flatMap((d) => d.tracks.map((t) => t.height))),
    ].sort((a, b) => a - b);

    const series = abrData.map((streamData) => {
        const trackMap = new Map(streamData.tracks.map((t) => [t.height, t]));

        return {
            name: streamData.name,
            type: 'bar',
            barGap: 0,
            emphasis: {
                focus: 'series',
            },
            data: allHeights.map((height) => {
                const track = trackMap.get(height);
                return track
                    ? {
                          value: track.bandwidth,
                          trackInfo: track,
                      }
                    : null;
            }),
        };
    });

    return {
        legend: {
            data: abrData.map((d) => d.name),
            textStyle: { color: '#e5e7eb' },
            bottom: 0,
            type: 'scroll',
        },
        // ARCHITECTURAL FIX: Increased bottom margin to prevent overlap with legend.
        grid: { top: '50', right: '20', bottom: '90', left: '80' },
        xAxis: {
            type: 'category',
            name: 'Resolution',
            nameLocation: 'middle',
            nameGap: 30,
            nameTextStyle: { color: '#9ca3af' },
            axisLine: { lineStyle: { color: '#4b5563' } },
            axisLabel: { color: '#9ca3af' },
            data: allHeights.map((h) => `${h}p`),
        },
        yAxis: {
            type: 'value',
            name: 'Bitrate',
            nameTextStyle: { color: '#9ca3af' },
            axisLine: { lineStyle: { color: '#4b5563' } },
            axisLabel: {
                formatter: (value) => formatBitrate(value),
                color: '#9ca3af',
            },
            splitLine: { lineStyle: { color: '#374151' } },
        },
        series,
    };
};

class AbrLadderChart extends HTMLElement {
    _data = null;
    chartContainer = null;

    constructor() {
        super();
        this.chartContainer = document.createElement('div');
        this.chartContainer.style.width = '100%';
        this.chartContainer.style.height = '100%';
    }

    set data(newData) {
        if (this._data === newData) return;
        this._data = newData;
        this.render();
    }

    get data() {
        return this._data;
    }

    connectedCallback() {
        this.appendChild(this.chartContainer);
        this.render();
    }

    disconnectedCallback() {
        if (this.chartContainer) {
            disposeChart(this.chartContainer);
        }
    }

    render() {
        if (!this.chartContainer) return;

        if (
            !this._data ||
            this._data.length === 0 ||
            this._data.every((d) => d.tracks.length === 0)
        ) {
            render(
                html`<div
                    class="flex items-center justify-center h-full text-center text-slate-500"
                >
                    No comparable video tracks found.
                </div>`,
                this
            );
            return;
        }

        renderChart(this.chartContainer, abrLadderChartOptions(this._data));
    }
}

if (!customElements.get('abr-ladder-chart')) {
    customElements.define('abr-ladder-chart', AbrLadderChart);
}