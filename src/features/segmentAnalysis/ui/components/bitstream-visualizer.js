import { html, render } from 'lit-html';
import { renderChart, disposeChart } from '@/ui/shared/charts/chart-renderer';
import * as icons from '@/ui/icons';

class BitstreamVisualizer extends HTMLElement {
    constructor() {
        super();
        this._data = null;
    }

    set data(val) {
        this._data = val;
        this.render();
    }

    connectedCallback() {
        this.render();
    }

    disconnectedCallback() {
        const chart = this.querySelector('#bs-chart');
        if (chart) disposeChart(/** @type {HTMLElement} */ (chart));
    }

    render() {
        if (!this._data || !this._data.frames) return;

        const template = html`
            <div
                class="bg-slate-900 rounded-xl border border-slate-800 shadow-inner p-4"
            >
                <div class="flex justify-between items-center mb-4">
                    <h3
                        class="text-sm font-bold text-slate-300 flex items-center gap-2"
                    >
                        ${icons.activity} Frame Size Distribution
                    </h3>
                    <div class="flex gap-4 text-xs">
                        <span class="flex items-center gap-1.5 text-slate-400">
                            <span
                                class="w-2 h-2 rounded-full bg-red-500"
                            ></span>
                            I-Frame
                        </span>
                        <span class="flex items-center gap-1.5 text-slate-400">
                            <span
                                class="w-2 h-2 rounded-full bg-blue-500"
                            ></span>
                            P-Frame
                        </span>
                        <span class="flex items-center gap-1.5 text-slate-400">
                            <span
                                class="w-2 h-2 rounded-full bg-indigo-500"
                            ></span>
                            B-Frame
                        </span>
                    </div>
                </div>
                <div id="bs-chart" class="w-full h-64"></div>
            </div>
        `;
        render(template, this);

        requestAnimationFrame(() => {
            const container = this.querySelector('#bs-chart');
            if (container) this.initChart(container, this._data.frames);
        });
    }

    initChart(container, frames) {
        const data = frames.map((f) => {
            let color = '#64748b'; // default slate
            if (f.isKeyFrame)
                color = '#ef4444'; // red
            else if (f.nalTypes.includes(1))
                color = '#3b82f6'; // P (approx) - simplified mapping
            else color = '#6366f1'; // B/Other

            // Override for explicit P/B detection if available in NAL types (simplified)
            // In actual implementation, deeper NAL parsing gives precise types.

            return {
                value: f.size,
                itemStyle: { color, borderRadius: [2, 2, 0, 0] },
                frameIndex: f.index,
                nalTypes: f.nalTypes,
            };
        });

        const options = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                borderColor: '#334155',
                textStyle: { color: '#f8fafc', fontSize: 11 },
                formatter: (params) => {
                    const item = params[0];
                    const f = frames[item.dataIndex];
                    const type = f.isKeyFrame ? 'I-Frame' : 'Delta Frame';
                    return `
                        <div class="font-bold mb-1">Frame ${f.index}</div>
                        <div class="text-xs text-slate-300">${type}</div>
                        <div class="text-xs text-cyan-400 font-mono">${(f.size / 1024).toFixed(2)} KB</div>
                    `;
                },
            },
            grid: { top: 10, right: 0, bottom: 20, left: 50 },
            xAxis: {
                type: 'category',
                data: frames.map((f) => f.index),
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: { show: false }, // Clean look
            },
            yAxis: {
                type: 'value',
                splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
                axisLabel: { color: '#64748b', fontSize: 10 },
            },
            dataZoom: [{ type: 'inside', start: 0, end: 100 }],
            series: [
                {
                    type: 'bar',
                    data: data,
                    barCategoryGap: '20%',
                    large: true,
                },
            ],
        };

        renderChart(container, options);
    }
}

customElements.define('segment-bitstream-visualizer', BitstreamVisualizer);
