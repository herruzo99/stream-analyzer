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
        // Single-hue workbench chart: emerald bars, slate chrome.
        // No per-bar colors, no theme-var rainbow.
        const barColor = '#34d399';
        const trackColor = 'rgba(255,255,255,0.05)';
        const gridColor = 'rgba(255,255,255,0.08)';
        const textMain = '#e2e8f0';
        const textMuted = '#64748b';

        const options = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: '#0b111c',
                borderColor: 'rgba(255,255,255,0.1)',
                textStyle: { color: textMain, fontSize: 12 },
                formatter: (params) => {
                    const item = params[0];
                    const track = this._data[item.dataIndex];
                    return `
                        <div style="margin-bottom:2px">${track.height}p</div>
                        <div>Bitrate: ${formatBitrate(track.bandwidth)}</div>
                        <div>Res: ${track.width}x${track.height}</div>
                        <div style="opacity:0.7">${track.codecs}</div>
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
                        color: gridColor,
                        type: 'dashed',
                    },
                },
            },
            yAxis: {
                type: 'category',
                data: this._data.map((d) => `${d.height}p`),
                axisLabel: { color: textMuted },
                axisLine: { show: false },
                axisTick: { show: false },
            },
            series: [
                {
                    type: 'bar',
                    data: this._data.map((d) => ({
                        value: d.bandwidth,
                        itemStyle: {
                            color: barColor,
                            borderRadius: [0, 4, 4, 0],
                        },
                    })),
                    barWidth: '60%',
                    showBackground: true,
                    backgroundStyle: {
                        color: trackColor,
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
