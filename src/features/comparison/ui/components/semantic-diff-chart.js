import { useUiStore } from '@/state/uiStore';
import { disposeChart } from '@/ui/shared/charts/chart-renderer';
import { init as initChart } from 'echarts/core';
import { html } from 'lit-html';

// Workbench chart palette: slate tracks, red diffs. Amber/red data hues
// stay reserved for warning/error semantics.
const COLORS = {
    segment: '#94a3b8',
    diff: '#f87171',
    gap: '#f87171',
    bgPanel: '#0b111c',
    borderMain: 'rgba(255,255,255,0.08)',
    textMuted: '#64748b',
    textMain: '#e2e8f0',
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

    // No deep-equal dedup here: calculateSemanticDiff returns a fresh
    // object per renderComparison, and JSON.stringify over large timelines
    // costs more than the occasional redundant setOption. Renders are
    // already gated upstream by the view's watched-key subscription.
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

        const data = this._data || {};
        const trackA = data.trackA || { name: 'A', items: [] };
        const trackB = data.trackB || { name: 'B', items: [] };
        const diffTrack = data.diffTrack || { items: [] };
        const minTime = data.minTime ?? 0;
        const maxTime = data.maxTime ?? 0;
        const categories = [trackB.name, 'difference', trackA.name];

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

            // Color resolution: diffs read red, everything else slate;
            // the difference lane carries the signal, not rainbow tracks.
            const isDiffLane = categoryIndex === 1;
            const color = isDiffLane
                ? COLORS.diff
                : itemMeta.type === 'gap'
                  ? COLORS.gap
                  : COLORS.segment;

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
                        fill: '#e2e8f0',
                        fontSize: 10,
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
                style: { fill: '#ffffff', fillOpacity: 0.03 },
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
                textStyle: { color: COLORS.textMain, fontSize: 12 },
                padding: [10, 12],
                borderRadius: 6,
                formatter: (params) => {
                    const d = params.data?.meta;
                    if (!d) return '';
                    const num = (v) =>
                        typeof v === 'number' && Number.isFinite(v)
                            ? v.toFixed(3)
                            : 'n/a';
                    // Scroll with mouse wheel; hold ctrl to zoom (also via the slider below).
                    let html = `<div style="margin-bottom:4px">${d.label || d.type}</div>`;
                    html += `<div>start: ${num(d.start)}s · end: ${num(d.end)}s · dur: ${num(d.duration)}s</div>`;
                    html += `<div style="opacity:0.6">${d.type}</div>`;
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
                    formatter: (val) =>
                        typeof val === 'number' ? `${val.toFixed(0)}s` : val,
                    margin: 14,
                },
                axisLine: { lineStyle: { color: COLORS.borderMain } },
            },
            yAxis: {
                type: 'category',
                data: categories,
                axisLabel: {
                    color: COLORS.textMuted,
                    fontSize: 11,
                    width: 100,
                    overflow: 'break',
                    lineHeight: 15,
                    margin: 12,
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
                    fillerColor: 'rgba(52,211,153,0.15)',
                    handleStyle: {
                        color: '#34d399',
                        borderColor: '#34d399',
                    },
                    textStyle: { color: COLORS.textMuted, fontSize: 10 },
                    start: 0,
                    end: 100,
                    brushSelect: false,
                    borderRadius: 6,
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
