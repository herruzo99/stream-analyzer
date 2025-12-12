import { disposeChart, renderChart } from '@/ui/shared/charts/chart-renderer';
import { formatBitrate } from '@/ui/shared/format';
import { html, render } from 'lit-html';

const abrLadderChartOptions = (abrData) => {
    const allHeights = [
        ...new Set(abrData.flatMap((d) => d.tracks.map((t) => t.height))),
    ].sort((a, b) => a - b);

    const series = abrData.map((streamData) => {
        const trackMap = new Map(streamData.tracks.map((t) => [t.height, t]));
        const isRef = streamData.isReference;

        return {
            name: streamData.name,
            type: 'bar',
            barGap: '10%', // Slight gap between bars
            barCategoryGap: '20%',
            emphasis: {
                focus: 'series',
            },
            // Highlight reference stream visually
            itemStyle: isRef
                ? {
                      color: '#fbbf24', // Amber-400
                      borderColor: '#fff',
                      borderWidth: 1,
                      shadowBlur: 5,
                      shadowColor: 'rgba(251, 191, 36, 0.5)',
                  }
                : undefined,
            z: isRef ? 10 : 1, // Bring reference to front
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
        backgroundColor: 'transparent',
        legend: {
            data: abrData.map((d) => d.name),
            textStyle: { color: '#9ca3af' }, // slate-400
            bottom: 0,
            type: 'scroll',
            pageTextStyle: { color: '#9ca3af' },
        },
        grid: {
            top: '30',
            right: '20',
            bottom: '60',
            left: '60',
        },
        xAxis: {
            type: 'category',
            name: 'Resolution',
            nameLocation: 'middle',
            nameGap: 30,
            nameTextStyle: { color: '#9ca3af', fontSize: 12 },
            axisLine: { lineStyle: { color: '#475569' } }, // slate-600
            axisLabel: { color: '#cbd5e1', fontWeight: 'bold' }, // slate-300
            data: allHeights.map((h) => `${h}p`),
        },
        yAxis: {
            type: 'value',
            name: 'Bitrate',
            nameTextStyle: { color: '#9ca3af' },
            axisLine: { lineStyle: { color: '#475569' } },
            axisLabel: {
                formatter: (value) => formatBitrate(value),
                color: '#9ca3af',
            },
            splitLine: { lineStyle: { color: '#334155', type: 'dashed' } }, // slate-700
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
                    class="flex items-center justify-center h-full text-center text-slate-500 text-sm"
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
