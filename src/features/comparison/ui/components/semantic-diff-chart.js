import { useUiStore } from '@/state/uiStore';
import { disposeChart } from '@/ui/shared/charts/chart-renderer';
import { init as initChart } from 'echarts/core';
import { html } from 'lit-html';

// --- High Contrast Neon Palette ---
const getColors = () => {
    const getCssVar = (name, fallback) => {
        const val = getComputedStyle(document.documentElement)
            .getPropertyValue(name)
            .trim();
        return val || fallback;
    };

    return {
        segment: getCssVar('--primary-accent', '#60a5fa'),
        segment_short: getCssVar('--color-warning', '#fbbf24'),
        period: getCssVar('--secondary-accent', '#c084fc'),
        content: getCssVar('--tertiary-accent', '#34d399'),
        ad: getCssVar('--secondary-accent-hover', '#f472b6'),
        gap: getCssVar('--color-error', '#f87171'),
        drift: getCssVar('--color-warning', '#fbbf24'),
        bg_track: getCssVar('--text-on-B-primary', '#f8fafc'),
        textMuted: getCssVar('--text-on-B-secondary', '#94a3b8'),
        textMain: getCssVar('--text-on-B-primary', '#f8fafc'),
        bgPanel: getCssVar('--bg-surface-B-panel', '#1e293b'),
        borderMain: getCssVar('--border-on-B', 'rgba(255,255,255,0.1)'),
        primary500: getCssVar('--primary-accent', '#3b82f6'),
        backdropFilter: getCssVar('--region-backdrop', 'blur(10px)'),
    };
};

export class SemanticDiffChart extends HTMLElement {
    // Port note: was `extends BaseChartComponent` (never committed).
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
        this.style.display = 'block';
        this.style.height = '100%';
        this.style.minHeight = '500px';
        this.appendChild(this.chartContainer);
        this.chart = initChart(this.chartContainer);

        this.resizeObserver = new ResizeObserver(() => {
            if (this.chart) this.chart.resize();
        });
        this.resizeObserver.observe(this.chartContainer);

        // Subscribe to theme changes
        let currentTheme = useUiStore.getState().theme;
        this.unsubTheme = useUiStore.subscribe((state) => {
            if (state.theme !== currentTheme) {
                currentTheme = state.theme;
                this.render();
            }
        });

        this.render();
    }

    disconnectedCallback() {
        this.resizeObserver?.disconnect();
        if (this.unsubTheme) this.unsubTheme();
        if (this.chart) disposeChart(this.chart);
    }

    render() {
        if (!this._data || !this.chart) return;

        const COLORS = getColors();
        const { trackA, trackB, diffTrack, minTime, maxTime } = this._data;
        const categories = [trackB.name, 'Difference', trackA.name];

        if (trackA.items.length === 0 && trackB.items.length === 0) {
            this.chart.setOption(
                {
                    title: {
                        text: 'No timeline data available.',
                        left: 'center',
                        top: 'center',
                        textStyle: { color: COLORS.textMuted },
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
        const backgroundData = categories.map((_, i) => [i, minTime, maxTime]);

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
                shape: { x, y, width, height: barHeight, r: 6 },
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
                        fill: '#fff', // Keep white for contrast on colored bars
                        fontSize: 10,
                        fontWeight: 'bold',
                        overflow: 'truncate',
                        width: width - 4,
                        textShadowBlur: 2,
                        textShadowColor: 'rgba(0,0,0,0.5)',
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
            const start = api.coord([minTime, yIndex]); // Map from strict min
            const end = api.coord([maxTime, yIndex]); // Map from strict max
            const bandHeight = api.size([0, 1])[1];
            const barHeight = Math.max(30, Math.min(bandHeight * 0.7, 100));

            return {
                type: 'rect',
                shape: {
                    x: start[0],
                    y: start[1] - barHeight / 2,
                    width: end[0] - start[0],
                    height: barHeight,
                    r: 6,
                },
                style: { fill: COLORS.bg_track, fillOpacity: 0.03 },
                silent: true,
            };
        };

        // --- 3. Chart Options ---
        const option = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'item',
                backgroundColor: COLORS.bgPanel,
                borderColor: COLORS.borderMain,
                textStyle: { color: COLORS.textMain },
                padding: [12, 16],
                borderRadius: 12,
                backdropFilter: COLORS.backdropFilter,
                formatter: (params) => {
                    const d = params.data?.meta; // Tooltip usually receives the full object
                    if (!d) return '';

                    let html = `<div class="font-bold text-sm mb-2 border-b border-slate-800 pb-2" style="color:${COLORS[d.type] || '#fff'}">${d.label || d.type.toUpperCase()}</div>`;
                    html += `<div class="text-xs text-slate-400 font-mono space-y-1.5">
                        <div class="flex justify-between gap-4"><span>Start:</span> <span class="text-[#60a5fa] font-bold">${d.start.toFixed(3)}s</span></div>
                        <div class="flex justify-between gap-4"><span>End:</span>   <span class="text-[#60a5fa] font-bold">${d.end.toFixed(3)}s</span></div>
                        <div class="flex justify-between gap-4"><span>Dur:</span>   <span class="text-emerald-400 font-bold">${d.duration.toFixed(3)}s</span></div>
                        <div class="text-slate-400 uppercase text-[10px] mt-2 pt-1 border-t border-slate-800 tracking-wider">${d.type}</div>
                    </div>`;
                    return html;
                },
            },
            grid: {
                top: 40,
                bottom: 60,
                left: 80, // Reduced from 120
                right: 20, // Reduced from 40
                containLabel: true, // Ensure labels don't get cut off
            },
            xAxis: {
                type: 'value',
                min: minTime,
                max: maxTime,
                splitLine: {
                    show: true,
                    lineStyle: {
                        color: COLORS.textMain,
                        type: 'dashed',
                        opacity: 0.05,
                    },
                },
                axisLabel: {
                    color: COLORS.textMuted,
                    formatter: (val) => `${val.toFixed(0)}s`,
                    margin: 14,
                    fontWeight: 'bold',
                },
                axisLine: { lineStyle: { color: COLORS.borderMain } },
            },
            yAxis: {
                type: 'category',
                data: categories,
                axisLabel: {
                    color: COLORS.textMain,
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
                    backgroundColor: COLORS.bgPanel,
                    fillerColor: COLORS.primary500 + '1A', // 10% opacity
                    handleStyle: {
                        color: COLORS.primary500,
                        borderColor: COLORS.primary500,
                        shadowBlur: 5,
                    },
                    textStyle: { color: COLORS.textMuted, fontSize: 10 },
                    start: 0, // percentages
                    end: 100,
                    brushSelect: false,
                    borderRadius: 12,
                },
                {
                    type: 'inside',
                    filterMode: 'weakFilter',
                    zoomOnMouseWheel: 'ctrl',
                    moveOnMouseWheel: true,
                    preventDefaultMouseMove: false,
                },
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
