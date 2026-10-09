import { disposeChart, renderChart } from '@/ui/shared/charts/chart-renderer';
import { formatBitrate } from '@/ui/shared/format';
import { html, render } from 'lit-html';

const getCssVar = (name, fallback) => {
    const val = getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim();
    return val || fallback;
};

const abrLadderChartOptions = (abrData) => {
    const allHeights = [
        ...new Set(abrData.flatMap((d) => d.tracks.map((t) => t.height))),
    ].sort((a, b) => a - b);

    // const primary400 = getCssVar('--primary-accent', '#60a5fa');
    // const primary500 = getCssVar('--primary-accent', '#3b82f6');
    // const primary300 = getCssVar('--primary-accent-hover', '#93c5fd');
    // const primaryGlow = getCssVar(
    //     '--primary-accent-glow',
    //     'rgba(59, 130, 246, 0.5)'
    // );
    const textMuted = getCssVar('--text-on-B-secondary', '#94a3b8');
    const textMain = getCssVar('--text-on-B-primary', '#f8fafc');
    const borderMain = getCssVar('--border-on-B', 'rgba(255,255,255,0.1)');
    const bgPanel = getCssVar('--bg-surface-B-panel', '#1e293b');
    const backdropFilter = getCssVar('--region-backdrop', 'blur(10px)');

    const series = abrData.map((streamData, index) => {
        const trackMap = new Map(streamData.tracks.map((t) => [t.height, t]));

        // Use indexed chart colors from theme
        const colorVar = `--chart-${(index % 10) + 1}`;
        const seriesColor = getCssVar(colorVar, '#3b82f6'); // Fallback to blue

        return {
            name: streamData.name,
            type: 'bar',
            barGap: '10%', // Slight gap between bars
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
            textStyle: { color: textMain },
            backdropFilter: backdropFilter,
            padding: [10, 14],
            borderRadius: 12,
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
            axisLabel: { color: textMain, fontWeight: 'bold' },
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
    // Port note: was `extends BaseChartComponent` (never committed);
    // chart I/O already uses renderChart/disposeChart directly.
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

        if (
            !this._data ||
            this._data.length === 0 ||
            this._data.every((d) => d.tracks.length === 0)
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
