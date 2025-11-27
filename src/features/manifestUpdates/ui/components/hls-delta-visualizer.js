import * as icons from '@/ui/icons';
import { disposeChart, renderChart } from '@/ui/shared/charts/chart-renderer';
import { html } from 'lit-html';

export class HlsDeltaVisualizer extends HTMLElement {
    constructor() {
        super();
        this.chartContainer = document.createElement('div');
        this.chartContainer.style.width = '100%';
        this.chartContainer.style.height = '100%';
        this.chart = null;
        this._data = null;
    }

    set data(val) {
        this._data = val;
        this.renderChart();
    }

    connectedCallback() {
        this.appendChild(this.chartContainer);
        this.renderChart();
    }

    disconnectedCallback() {
        if (this.chartContainer) disposeChart(this.chartContainer);
    }

    renderChart() {
        if (!this._data || !this.chartContainer) return;

        const { update } = this._data;
        if (!update || !update.serializedManifest) return;

        const manifest = update.serializedManifest;
        const segments = manifest.segments || [];

        // Detect EXT-X-SKIP info
        const skipTag = manifest.tags.find((t) => t.name === 'EXT-X-SKIP');
        const skippedCount = skipTag
            ? skipTag.value['SKIPPED-SEGMENTS'] || 0
            : 0;

        const mediaSequence = manifest.mediaSequence || 0;
        const currentStartSeq = mediaSequence + skippedCount;

        // Prepare Data
        // 1. Skipped Block (Ghost)
        const skippedData = [];
        if (skippedCount > 0) {
            skippedData.push({
                value: skippedCount,
                itemStyle: {
                    color: 'rgba(251, 191, 36, 0.2)', // Amber-500 low opacity
                    borderType: 'dashed',
                    borderColor: '#fbbf24',
                    borderWidth: 2,
                },
                name: 'Skipped',
            });
        }

        // 2. Active Segments
        const activeData = segments.map((seg, idx) => ({
            value: seg.duration,
            name: `Seg #${currentStartSeq + idx}`,
            itemStyle: {
                color: '#3b82f6', // Blue-500
            },
        }));

        // 3. Future/Parts (if LL-HLS)
        // Not visualized in simple block model, keeping it clean.

        const option = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                borderColor: '#334155',
                textStyle: { color: '#f8fafc' },
                formatter: (params) => {
                    const item = params[0];
                    if (!item) return '';
                    if (item.seriesName === 'Skipped') {
                        return `<b>EXT-X-SKIP</b><br/>Skipped Segments: ${item.value}`;
                    }
                    return `<b>${item.name}</b><br/>Duration: ${item.value}s`;
                },
            },
            grid: { top: 30, bottom: 30, left: 20, right: 20 },
            xAxis: {
                type: 'category',
                data: [
                    ...(skippedCount > 0 ? ['Skipped Range'] : []),
                    ...activeData.map((_, i) => `#${currentStartSeq + i}`),
                ],
                axisLine: { lineStyle: { color: '#4b5563' } },
                axisLabel: { color: '#94a3b8', fontSize: 10 },
            },
            yAxis: {
                type: 'value',
                name: 'Duration (s)',
                splitLine: { lineStyle: { color: '#1e293b' } },
                axisLabel: { color: '#64748b' },
            },
            series: [
                {
                    name: 'Skipped',
                    type: 'bar',
                    stack: 'total',
                    data:
                        skippedCount > 0
                            ? [skippedCount, ...activeData.map(() => 0)]
                            : [],
                    barWidth: '60%',
                },
                {
                    name: 'Active',
                    type: 'bar',
                    stack: 'total',
                    data:
                        skippedCount > 0
                            ? [0, ...activeData.map((d) => d.value)]
                            : activeData.map((d) => d.value),
                    barWidth: '60%',
                },
            ],
        };

        renderChart(this.chartContainer, option);
    }
}

customElements.define('hls-delta-visualizer', HlsDeltaVisualizer);

export const hlsDeltaVisualizerTemplate = (update) => {
    const manifest = update?.serializedManifest;
    const skipTag = manifest?.tags?.find((t) => t.name === 'EXT-X-SKIP');
    const hasSkip = !!skipTag;

    return html`
        <div
            class="h-full flex flex-col bg-slate-900 border-l border-slate-800/50"
        >
            <div
                class="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/30"
            >
                <div class="flex items-center gap-2">
                    <span class="text-amber-400">${icons.history}</span>
                    <h4
                        class="text-xs font-bold text-slate-300 uppercase tracking-wider"
                    >
                        Sliding Window
                    </h4>
                </div>
                ${hasSkip
                    ? html`<span
                          class="px-2 py-0.5 rounded bg-amber-900/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold"
                          >Delta Update</span
                      >`
                    : ''}
            </div>
            <div class="grow relative p-4">
                <hls-delta-visualizer
                    .data=${{ update }}
                ></hls-delta-visualizer>
            </div>
        </div>
    `;
};
