import { disposeChart, renderChart } from '@/ui/shared/charts/chart-renderer';
import { formatBitrate } from '@/ui/shared/format';
import { html, render } from 'lit-html';

const abrLadderChartOptions = (abrData) => {
    const allHeights = [
        ...new Set(
            (abrData || []).flatMap((d) => (d.tracks || []).map((t) => t.height))
        ),
    ].sort((a, b) => a - b);

    // Workbench chart: slate for first stream, emerald for the rest.
    // Extra streams cycle the same two — amber stays reserved for warnings.
    const textMuted = '#64748b';
    const textMain = '#e2e8f0';
    const borderMain = 'rgba(255,255,255,0.08)';
    const bgPanel = '#0b111c';
    const STREAM_HUES = ['#94a3b8', '#34d399', '#64748b'];

    const series = (abrData || []).map((streamData, index) => {
        const trackMap = new Map(
            (streamData.tracks || []).map((t) => [t.height, t])
        );
        const seriesColor = STREAM_HUES[index % STREAM_HUES.length];

        return {
            name: streamData.name,
            type: 'bar',
            barGap: '10%',
            barCategoryGap: '20%',
            emphasis: {
                focus: 'series',
            },
            itemStyle: {
                color: seriesColor,
                borderRadius: [4, 4, 0, 0],
                opacity: 0.9,
                shadowBlur: 0,
                borderColor: 'transparent',
            },
            z: 2,
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
            textStyle: { color: textMuted },
            bottom: 0,
            type: 'scroll',
            pageTextStyle: { color: textMuted },
        },
        tooltip: {
            backgroundColor: bgPanel,
            borderColor: borderMain,
            textStyle: { color: textMain, fontSize: 12 },
            padding: [10, 12],
            borderRadius: 6,
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
            nameTextStyle: { color: textMuted, fontSize: 12 },
            axisLine: { lineStyle: { color: borderMain } },
            axisLabel: { color: textMuted },
            data: allHeights.map((h) => `${h}p`),
        },
        yAxis: {
            type: 'value',
            name: 'Bitrate',
            nameTextStyle: { color: textMuted },
            axisLine: { lineStyle: { color: borderMain } },
            axisLabel: {
                formatter: (value) => formatBitrate(value),
                color: textMuted,
            },
            splitLine: {
                lineStyle: { color: borderMain, type: 'dashed', opacity: 0.3 },
            },
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
        if (JSON.stringify(newData) === JSON.stringify(this._data)) return;
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

        const rows = Array.isArray(this._data) ? this._data : [];
        if (
            rows.length === 0 ||
            rows.every((d) => (d?.tracks || []).length === 0)
        ) {
            render(
                html`<div
                    class="flex items-center justify-center h-full text-center text-slate-400 text-sm"
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
