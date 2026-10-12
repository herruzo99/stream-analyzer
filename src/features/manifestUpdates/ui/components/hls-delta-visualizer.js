import * as icons from '@/ui/icons';
import { disposeChart, renderChart } from '@/ui/shared/charts/chart-renderer';
import { html } from 'lit-html';

export class HlsDeltaVisualizer extends HTMLElement {
    // Port note: was `extends BaseChartComponent` (never committed). The
    // base contributed only lifecycle shells; chart I/O already uses the
    // 1.2.0 `renderChart`/`disposeChart` helpers directly.
    constructor() {
        super();
        this.chartContainer = document.createElement('div');
        this.chartContainer.style.width = '100%';
        this.chartContainer.style.height = '100%';
        this.chart = null;
        this._data = null;
    }

    set data(val) {
        if (JSON.stringify(val) === JSON.stringify(this._data)) return;
        this._data = val;
        this.render();
    }

    connectedCallback() {
        this.appendChild(this.chartContainer);
        this.render();
    }

    disconnectedCallback() {
        if (this.chartContainer) disposeChart(this.chartContainer);
    }

    render() {
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

        const getCssVar = (name) => {
            return getComputedStyle(document.documentElement)
                .getPropertyValue(name)
                .trim();
        };

        const colorWarning = getCssVar('--color-warning');
        const colorPrimary = getCssVar('--primary-accent');
        const bgPanel = getCssVar('--bg-surface-B-panel');
        const borderMain = getCssVar('--border-on-A');
        const textMain = getCssVar('--text-on-B-primary');
        const textMuted = getCssVar('--text-on-B-secondary');

        // Prepare Data
        // 1. Skipped Block (Ghost)
        const skippedData = [];
        if (skippedCount > 0) {
            skippedData.push({
                value: skippedCount,
                itemStyle: {
                    color: colorWarning + '33', // 20% opacity
                    borderType: 'dashed',
                    borderColor: colorWarning,
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
                color: colorPrimary,
            },
        }));

        const option = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: bgPanel,
                borderColor: borderMain,
                textStyle: { color: textMain },
                formatter: (params) => {
                    const item = params[0];
                    if (!item) return '';
                    if (item.seriesName === 'Skipped') {
                        return `<b>EXT-X-SKIP</b><br/>Skipped Segments: ${item.value}`;
                    }
                    return `<b>${item.name}</b><br/>Duration: ${item.value}s`;
                },
            },
            grid: { top: 15, bottom: 20, left: 10, right: 10 },
            xAxis: {
                type: 'category',
                data: [
                    ...(skippedCount > 0 ? ['Skipped Range'] : []),
                    ...activeData.map((_, i) => `#${currentStartSeq + i}`),
                ],
                axisLine: { lineStyle: { color: borderMain } },
                axisLabel: { show: false }, // Hide labels to save vertical space
                axisTick: { show: false },
            },
            yAxis: {
                type: 'value',
                name: 'Duration (s)',
                nameLocation: 'end',
                nameTextStyle: { padding: [0, 0, 0, 10], color: textMuted },
                splitLine: { lineStyle: { color: borderMain, opacity: 0.2 } },
                axisLabel: { show: false }, // Hide Y labels for cleanliness in small view
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
                    barWidth: '80%',
                },
                {
                    name: 'Active',
                    type: 'bar',
                    stack: 'total',
                    data:
                        skippedCount > 0
                            ? [0, ...activeData.map((d) => d.value)]
                            : activeData.map((d) => d.value),
                    barWidth: '80%',
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
            class="h-full flex flex-col bg-white/5 w-full min-w-0"
            style="border-radius: 0.75rem; overflow: hidden; backdrop-filter: blur(12px); box-shadow: 0 8px 30px rgb(0 0 0 / 0.35);"
        >
            <div
                class="p-2 border-b border-white/10 flex items-center justify-between bg-white/5 shrink-0"
            >
                <div class="flex items-center gap-2">
                    <span class="text-amber-400 scale-75"
                        >${icons.history}</span
                    >
                    <h4
                        class="text-[10px] font-bold text-slate-400 r"
                    >
                        Sliding Window
                    </h4>
                </div>
                ${hasSkip
            ? html`<span
                          class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-bold"
                          >Delta Update</span
                      >`
            : ''}
            </div>
            <div class="grow relative p-2 min-h-0">
                <hls-delta-visualizer
                    .data=${{ update }}
                ></hls-delta-visualizer>
            </div>
        </div>
    `;
};
