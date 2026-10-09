import {
    disposeChart,
    renderChart,
} from '@/ui/shared/charts/chart-renderer';
import { formatBitrate } from '@/ui/shared/format';
import { html } from 'lit-html';

class BitrateLadderComponent extends HTMLElement {
    // Port note: was `extends BaseChartComponent` (never committed);
    // chart I/O already uses renderChart/disposeChart directly.
    constructor() {
        super();
        this._data = [];
    }

    set data(val) {
        if (JSON.stringify(val) === JSON.stringify(this._data)) return;
        this._data = val;
        this.render();
    }

    connectedCallback() {
        this.style.display = 'block';
        this.style.height = '300px';
        this.style.width = '100%';
        this.render();
    }

    disconnectedCallback() {
        disposeChart(this);
    }

    render() {
        if (!this._data || this._data.length === 0) return;

        const isMobile = window.innerWidth < 640;
        const getCssVar = (name, fallback) => {
            const val = getComputedStyle(document.documentElement)
                .getPropertyValue(name)
                .trim();
            return val || fallback;
        };

        const bgPanel = getCssVar('--bg-surface-B-panel', '#1e293b');
        const borderMain = getCssVar('--border-on-B', 'rgba(255,255,255,0.1)');
        const textMain = getCssVar('--text-on-B-primary', '#f8fafc');
        const textMuted = getCssVar('--text-on-B-secondary', '#94a3b8');
        const chartColors = [];
        for (let i = 1; i <= 10; i++) {
            chartColors.push(getCssVar(`--chart-${i}`, '#3b82f6'));
        }

        const options = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: bgPanel,
                borderColor: borderMain,
                textStyle: { color: textMain },
                formatter: (params) => {
                    const item = params[0];
                    const track = this._data[item.dataIndex];
                    const color =
                        chartColors[item.dataIndex % chartColors.length];
                    return `
                        <div class="font-bold mb-1" style="color: ${color}">${track.height}p</div>
                        <div class="text-xs text-slate-400">Bitrate: <span style="color: ${color}">${formatBitrate(track.bandwidth)}</span></div>
                        <div class="text-xs text-slate-400">Res: ${track.width}x${track.height}</div>
                        <div class="text-xs text-slate-400 mt-1 opacity-75">${track.codecs}</div>
                    `;
                },
            },
            grid: {
                top: 20,
                right: 20,
                bottom: 20,
                left: isMobile ? 50 : 60,
            },
            xAxis: {
                type: 'value',
                name: 'Bitrate',
                axisLabel: {
                    formatter: (val) => formatBitrate(val),
                    color: textMuted,
                    fontSize: 10,
                },
                splitLine: {
                    lineStyle: {
                        color: borderMain,
                        type: 'dashed',
                        opacity: 0.3,
                    },
                },
            },
            yAxis: {
                type: 'category',
                data: this._data.map((d) => `${d.height}p`),
                axisLabel: { color: textMain, fontWeight: 'bold' },
                axisLine: { show: false },
                axisTick: { show: false },
            },
            series: [
                {
                    type: 'bar',
                    data: this._data.map((d, index) => ({
                        value: d.bandwidth,
                        itemStyle: {
                            color: chartColors[index % chartColors.length],
                            borderRadius: [0, 4, 4, 0],
                        },
                    })),
                    barWidth: '60%',
                    showBackground: true,
                    backgroundStyle: {
                        color: textMain,
                        opacity: 0.05,
                        borderRadius: [0, 4, 4, 0],
                    },
                },
            ],
        };

        renderChart(this, options);
    }
}

customElements.define('summary-bitrate-ladder', BitrateLadderComponent);

export const bitrateLadderTemplate = (vm) => {
    return html`<summary-bitrate-ladder
        .data=${vm.ladderPoints}
    ></summary-bitrate-ladder>`;
};
