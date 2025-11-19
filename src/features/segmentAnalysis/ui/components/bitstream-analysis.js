import { html, render } from 'lit-html';
import { renderChart, disposeChart } from '@/ui/shared/charts/chart-renderer';
import { formatBitrate } from '@/ui/shared/format';
import * as icons from '@/ui/icons';

const gopChartOptions = (frames) => {
    if (!frames || frames.length === 0) return {};

    const data = frames.map((f) => {
        const color = f.isKeyFrame ? '#ef4444' : '#3b82f6'; // Red for I, Blue for P/B
        return {
            value: f.size,
            itemStyle: { color },
            frameType: f.isKeyFrame ? 'Keyframe (I)' : 'Delta (P/B)',
        };
    });

    return {
        tooltip: {
            trigger: 'axis',
            formatter: (params) => {
                const p = params[0];
                const frame = frames[p.dataIndex];
                return `
                    <b>Frame #${frame.index}</b><br/>
                    Type: ${p.data.frameType}<br/>
                    Size: ${(frame.size / 1024).toFixed(2)} KB<br/>
                    NALs: ${frame.nalTypes.join(', ')}
                `;
            },
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            borderColor: '#334155',
            textStyle: { color: '#f8fafc' },
        },
        grid: { top: 20, bottom: 30, left: 60, right: 20 },
        xAxis: {
            type: 'category',
            data: frames.map((f) => f.index),
            axisLine: { lineStyle: { color: '#475569' } },
            axisLabel: { interval: 'auto', color: '#94a3b8' },
        },
        yAxis: {
            type: 'value',
            name: 'Size (Bytes)',
            nameTextStyle: { color: '#94a3b8' },
            splitLine: { lineStyle: { color: '#334155', type: 'dashed' } },
            axisLabel: { color: '#94a3b8' },
        },
        series: [
            {
                type: 'bar',
                data: data,
                barMaxWidth: 20,
            },
        ],
    };
};

export class BitstreamAnalysisComponent extends HTMLElement {
    constructor() {
        super();
        this._analysis = null;
    }

    set analysis(val) {
        this._analysis = val;
        this.render();
    }

    connectedCallback() {
        this.render();
    }

    disconnectedCallback() {
        const chart = this.querySelector('#gop-chart');
        if (chart) disposeChart(/** @type {HTMLElement} */ (chart));
    }

    render() {
        if (!this._analysis || this._analysis.error) {
            this.innerHTML = `<div class="p-4 text-center text-slate-500">Bitstream analysis not available. ${this._analysis?.error || ''}</div>`;
            return;
        }

        const { frames, summary } = this._analysis;
        const template = html`
            <div class="space-y-6">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div
                        class="bg-slate-800 p-3 rounded-lg border border-slate-700"
                    >
                        <div class="text-xs text-slate-400 mb-1">
                            GOP Structure
                        </div>
                        <div class="font-bold text-white">
                            ${summary.gopStructure}
                        </div>
                    </div>
                    <div
                        class="bg-slate-800 p-3 rounded-lg border border-slate-700"
                    >
                        <div class="text-xs text-slate-400 mb-1">
                            GOP Length
                        </div>
                        <div class="font-bold text-white">
                            ${summary.gopLength} frames
                        </div>
                    </div>
                    <div
                        class="bg-slate-800 p-3 rounded-lg border border-slate-700"
                    >
                        <div class="text-xs text-slate-400 mb-1">
                            Avg Bitrate
                        </div>
                        <div class="font-bold text-cyan-400">
                            ${formatBitrate(summary.bitrate)}
                        </div>
                    </div>
                    <div
                        class="bg-slate-800 p-3 rounded-lg border border-slate-700"
                    >
                        <div class="text-xs text-slate-400 mb-1">Max Frame</div>
                        <div class="font-bold text-white">
                            ${(summary.maxFrameSize / 1024).toFixed(1)} KB
                        </div>
                    </div>
                </div>

                <div
                    class="bg-slate-800 rounded-lg border border-slate-700 p-4"
                >
                    <h4
                        class="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2"
                    >
                        ${icons.binary} Frame Size Distribution
                    </h4>
                    <div id="gop-chart" class="h-64 w-full"></div>
                </div>

                <div class="text-xs text-slate-500 italic">
                    * Analysis based on NAL unit parsing. I-Frames detected via
                    IDR/CRA/BLA NAL types.
                </div>
            </div>
        `;

        const tempContainer = document.createElement('div');
        render(template, tempContainer);
        this.replaceChildren(...tempContainer.childNodes);

        const chartContainer = this.querySelector('#gop-chart');
        if (chartContainer) {
            renderChart(
                /** @type {HTMLElement} */ (chartContainer),
                gopChartOptions(frames)
            );
        }
    }
}

customElements.define('bitstream-analysis', BitstreamAnalysisComponent);
