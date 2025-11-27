import { renderChart } from '@/ui/shared/charts/chart-renderer';
import { formatBitrate } from '@/ui/shared/format';
import { html } from 'lit-html';

class BitrateLadderComponent extends HTMLElement {
    constructor() {
        super();
        this._data = [];
    }

    set data(val) {
        this._data = val;
        this.renderChart();
    }

    connectedCallback() {
        this.style.display = 'block';
        this.style.height = '250px';
        this.style.width = '100%';
        this.renderChart();
    }

    renderChart() {
        if (!this._data || this._data.length === 0) return;

        const options = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                borderColor: '#334155',
                textStyle: { color: '#f8fafc' },
                formatter: (params) => {
                    const item = params[0];
                    const track = this._data[item.dataIndex];
                    return `
                        <div class="font-bold mb-1">${track.height}p</div>
                        <div class="text-xs text-slate-300">Bitrate: <span class="text-cyan-400">${formatBitrate(track.bandwidth)}</span></div>
                        <div class="text-xs text-slate-300">Res: ${track.width}x${track.height}</div>
                        <div class="text-xs text-slate-400 mt-1">${track.codecs}</div>
                    `;
                },
            },
            grid: {
                top: 20,
                right: 20,
                bottom: 20,
                left: 60,
                containLabel: true,
            },
            xAxis: {
                type: 'value',
                name: 'Bitrate',
                axisLabel: {
                    formatter: (val) => formatBitrate(val),
                    color: '#94a3b8',
                    fontSize: 10,
                },
                splitLine: { lineStyle: { color: '#334155', type: 'dashed' } },
            },
            yAxis: {
                type: 'category',
                data: this._data.map((d) => `${d.height}p`),
                axisLabel: { color: '#e2e8f0', fontWeight: 'bold' },
                axisLine: { show: false },
                axisTick: { show: false },
            },
            series: [
                {
                    type: 'bar',
                    data: this._data.map((d) => d.bandwidth),
                    barWidth: '60%',
                    itemStyle: {
                        color: {
                            type: 'linear',
                            x: 0,
                            y: 0,
                            x2: 1,
                            y2: 0,
                            colorStops: [
                                { offset: 0, color: '#3b82f6' }, // blue-500
                                { offset: 1, color: '#06b6d4' }, // cyan-500
                            ],
                        },
                        borderRadius: [0, 4, 4, 0],
                    },
                    showBackground: true,
                    backgroundStyle: {
                        color: 'rgba(255, 255, 255, 0.05)',
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
