import { disposeChart } from '@/ui/shared/charts/chart-renderer';
import { init as initChart } from 'echarts/core';
import { html } from 'lit-html';

// --- High Contrast Neon Palette ---
const COLORS = {
    segment: '#38bdf8', // Sky-400
    segment_short: '#facc15', // Yellow-400
    period: '#a78bfa', // Violet-400
    content: '#818cf8', // Indigo-400
    ad: '#f472b6', // Pink-400
    gap: '#ef4444', // Red-500
    drift: '#fb923c', // Orange-400
    bg_track: 'rgba(255, 255, 255, 0.05)',
};

export class SemanticDiffChart extends HTMLElement {
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
        this.render();
    }

    connectedCallback() {
        this.style.display = 'block';
        this.style.height = '100%';
        this.style.minHeight = '500px';
        this.appendChild(this.chartContainer);
        this.chart = initChart(this.chartContainer);

        this.resizeObserver = new ResizeObserver(() => {
            if (this.chart) this.chart.resize();
        });
        this.resizeObserver.observe(this.chartContainer);

        this.render();
    }

    disconnectedCallback() {
        this.resizeObserver?.disconnect();
        if (this.chart) disposeChart(this.chart);
    }

    render() {
        if (!this._data || !this.chart) return;

        const { trackA, trackB, diffTrack, duration } = this._data;
        const maxDuration = Math.max(duration, 60);
        const categories = [trackB.name, 'Difference', trackA.name];

        if (trackA.items.length === 0 && trackB.items.length === 0) {
            this.chart.setOption(
                {
                    title: {
                        text: 'No timeline data available.',
                        left: 'center',
                        top: 'center',
                        textStyle: { color: '#94a3b8' },
                    },
                },
                true
            );
            return;
        }

        // --- 1. Data Preparation (Lifted to top for scope safety) ---
        const mapItems = (items, yIndex) =>
            items.map((item) => ({
                value: [yIndex, item.start, item.end, item.duration],
                meta: item,
            }));

        // Series 0: Backgrounds (One item per category covering full width)
        const backgroundData = categories.map((_, i) => [i, 0, maxDuration]);

        // Series 1: Actual Items (Flattened list of objects)
        const mainSeriesData = [
            ...mapItems(trackB.items, 0),
            ...mapItems(diffTrack.items, 1),
            ...mapItems(trackA.items, 2),
        ];

        // --- 2. Renderers ---

        // Renderer for Main Data Items
        const renderItem = (params, api) => {
            // FIX: Access source data directly via index to ensure metadata preservation.
            // params.data can sometimes be stripped of custom properties by ECharts optimizations.
            const dataItem = mainSeriesData[params.dataIndex];
            const itemMeta = dataItem?.meta;

            // Safety check: if metadata is missing, we cannot determine color/label
            if (!itemMeta) return;

            const categoryIndex = api.value(0);
            const rawStart = api.value(1);
            const rawEnd = api.value(2);

            const start = api.coord([rawStart, categoryIndex]);
            const end = api.coord([rawEnd, categoryIndex]);

            // Dynamic Height
            const bandHeight = api.size([0, 1])[1];
            const barHeight = Math.max(30, Math.min(bandHeight * 0.7, 100));

            const x = start[0];
            const y = start[1] - barHeight / 2;
            const width = Math.max(2, end[0] - start[0]);

            // Color Resolution
            let color = COLORS[itemMeta.type] || COLORS.content;
            if (itemMeta.type === 'segment' && itemMeta.duration < 1.0) {
                color = COLORS.segment_short;
            }

            const rects = [];

            // 1. Main Block
            rects.push({
                type: 'rect',
                shape: { x, y, width, height: barHeight, r: 4 },
                style: {
                    fill: color,
                    stroke: 'rgba(0,0,0,0.2)',
                    lineWidth: 1,
                },
                emphasis: {
                    style: {
                        fill: color,
                        stroke: '#fff',
                        lineWidth: 2,
                        shadowBlur: 10,
                        shadowColor: color,
                    },
                },
            });

            // 2. Text Label (if space permits)
            if (width > 40) {
                rects.push({
                    type: 'text',
                    style: {
                        text: itemMeta.label,
                        x: x + width / 2,
                        y: y + barHeight / 2,
                        align: 'center',
                        verticalAlign: 'middle',
                        fill: '#fff',
                        fontSize: 10,
                        fontWeight: 'bold',
                        overflow: 'truncate',
                        width: width - 4,
                    },
                    silent: true,
                });
            }

            return {
                type: 'group',
                children: rects,
            };
        };

        // Renderer for Background (Ghost Tracks)
        const renderBackground = (params, api) => {
            const yIndex = api.value(0);
            const start = api.coord([0, yIndex]);
            const end = api.coord([maxDuration, yIndex]);
            const bandHeight = api.size([0, 1])[1];
            const barHeight = Math.max(30, Math.min(bandHeight * 0.7, 100));

            return {
                type: 'rect',
                shape: {
                    x: start[0],
                    y: start[1] - barHeight / 2,
                    width: end[0] - start[0],
                    height: barHeight,
                    r: 4,
                },
                style: { fill: COLORS.bg_track },
                silent: true,
            };
        };

        // --- 3. Chart Options ---
        const option = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'item',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                borderColor: '#334155',
                textStyle: { color: '#f8fafc' },
                padding: [10, 14],
                formatter: (params) => {
                    const d = params.data?.meta; // Tooltip usually receives the full object
                    if (!d) return '';

                    let html = `<div class="font-bold text-sm mb-2 border-b border-slate-600 pb-1" style="color:${COLORS[d.type] || '#fff'}">${d.label || d.type.toUpperCase()}</div>`;
                    html += `<div class="text-xs text-slate-300 font-mono space-y-1">
                        <div>Start: <span class="text-blue-300">${d.start.toFixed(3)}s</span></div>
                        <div>End:   <span class="text-blue-300">${d.end.toFixed(3)}s</span></div>
                        <div>Dur:   <span class="text-emerald-300">${d.duration.toFixed(3)}s</span></div>
                        <div class="text-slate-500 uppercase text-[10px] mt-1">${d.type}</div>
                    </div>`;
                    return html;
                },
            },
            grid: {
                top: 40,
                bottom: 60,
                left: 120,
                right: 40,
                containLabel: false,
            },
            xAxis: {
                type: 'value',
                min: 0,
                max: maxDuration,
                splitLine: {
                    show: true,
                    lineStyle: {
                        color: '#334155',
                        type: 'dashed',
                        opacity: 0.3,
                    },
                },
                axisLabel: {
                    color: '#94a3b8',
                    formatter: (val) => `${val.toFixed(0)}s`,
                    margin: 14,
                    fontWeight: 'bold',
                },
                axisLine: { lineStyle: { color: '#475569' } },
            },
            yAxis: {
                type: 'category',
                data: categories,
                axisLabel: {
                    color: '#e2e8f0',
                    fontWeight: 'bold',
                    fontSize: 13,
                    width: 100,
                    overflow: 'break',
                    lineHeight: 16,
                    margin: 15,
                },
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { show: false },
            },
            dataZoom: [
                {
                    type: 'slider',
                    bottom: 10,
                    height: 24,
                    borderColor: 'transparent',
                    backgroundColor: 'rgba(30, 41, 59, 0.5)',
                    fillerColor: 'rgba(56, 189, 248, 0.2)',
                    handleStyle: { color: '#38bdf8', borderColor: '#38bdf8' },
                    textStyle: { color: '#94a3b8', fontSize: 10 },
                    start: 0,
                    end: 100,
                },
                { type: 'inside', filterMode: 'weakFilter' },
            ],
            series: [
                // Series 0: Backgrounds
                {
                    type: 'custom',
                    renderItem: renderBackground,
                    data: backgroundData,
                    z: 0,
                    silent: true,
                    animation: false,
                },
                // Series 1: Data
                {
                    type: 'custom',
                    renderItem: renderItem,
                    data: mainSeriesData,
                    encode: { x: [1, 2], y: 0 }, // Map [start, end] to X, [yIndex] to Y
                    z: 2,
                },
            ],
        };

        this.chart.setOption(option, { notMerge: true });
    }
}

customElements.define('semantic-diff-chart', SemanticDiffChart);

export const semanticDiffChartTemplate = (diffData) =>
    html`<semantic-diff-chart .data=${diffData}></semantic-diff-chart>`;
