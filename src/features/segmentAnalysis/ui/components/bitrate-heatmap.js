import * as icons from '@/ui/icons';
import { disposeChart, renderChart } from '@/ui/shared/charts/chart-renderer';
import { html, render } from 'lit-html';

class BitrateHeatmapComponent extends HTMLElement {
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
        const chart = this.querySelector('#heatmap-chart');
        if (chart) disposeChart(/** @type {HTMLElement} */ (chart));
    }

    render() {
        if (!this._data || !this._data.frames) return;
        const { frames, summary } = this._data;

        const template = html`
            <div
                class="bg-slate-900 rounded-xl border border-slate-800 p-4 shadow-sm"
            >
                <div class="flex justify-between items-center mb-4">
                    <div>
                        <h3
                            class="text-sm font-bold text-white flex items-center gap-2"
                        >
                            ${icons.trendingUp} Bitrate Heatmap & Frame Size
                        </h3>
                        <p class="text-xs text-slate-400 mt-1">
                            Total Frames: ${summary.totalFrames} • GOP:
                            ${summary.gopLength.toFixed(1)}
                        </p>
                    </div>
                </div>
                <div id="heatmap-chart" class="w-full h-64"></div>
            </div>
        `;
        render(template, this);

        requestAnimationFrame(() => {
            const container = this.querySelector('#heatmap-chart');
            if (container)
                this.initChart(/** @type {HTMLElement} */ (container), frames);
        });
    }

    initChart(container, frames) {
        // Prepare Data: [Index, Size, Type]
        const data = frames.map((f, i) => ({
            value: f.size,
            frameType: f.isKeyFrame ? 'I' : f.type,
            itemStyle: {
                color: f.isKeyFrame
                    ? '#ef4444'
                    : f.type.includes('P')
                      ? '#3b82f6'
                      : '#6366f1',
            },
        }));

        const options = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                borderColor: '#334155',
                textStyle: { color: '#f8fafc', fontSize: 11 },
                formatter: (params) => {
                    const item = params[0];
                    const f = data[item.dataIndex];
                    return `
                        <b>Frame ${item.dataIndex}</b><br/>
                        Type: <span style="color:${f.itemStyle.color}">${f.frameType}</span><br/>
                        Size: ${(f.value / 1024).toFixed(2)} KB<br/>
                        Bitrate Spike Risk: ${f.value > 500000 ? '<span style="color:red">High</span>' : 'Low'}
                    `;
                },
            },
            grid: { left: 50, right: 10, top: 10, bottom: 20 },
            xAxis: {
                type: 'category',
                data: frames.map((_, i) => i),
                show: false,
            },
            yAxis: {
                type: 'value',
                name: 'Size (Bytes)',
                splitLine: { lineStyle: { color: '#1e293b' } },
                axisLabel: { color: '#64748b', fontSize: 10 },
            },
            dataZoom: [{ type: 'inside', start: 0, end: 100 }],
            visualMap: {
                show: false,
                min: 0,
                max: Math.max(...frames.map((f) => f.size)),
                inRange: {
                    colorLightness: [0.4, 0.8], // Make larger frames brighter
                },
            },
            series: [
                {
                    type: 'bar',
                    data: data,
                    barCategoryGap: '10%',
                    large: true,
                },
            ],
        };

        renderChart(container, options);
    }
}

customElements.define('bitrate-heatmap', BitrateHeatmapComponent);

export const bitrateHeatmapTemplate = (bitstreamData) =>
    html`<bitrate-heatmap .data=${bitstreamData}></bitrate-heatmap>`;
