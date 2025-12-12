import { uiActions } from '@/state/uiStore';
import { disposeChart } from '@/ui/shared/charts/chart-renderer';
import { init as initChart } from 'echarts/core';
import { TRACK_COLORS } from '../utils.js';

class TimelineChart extends HTMLElement {
    constructor() {
        super();
        this._data = null;
        this.chart = null;
        this.resizeObserver = null;
    }

    set data(val) {
        this._data = val;
        this.updateChart();
    }

    connectedCallback() {
        this.style.display = 'block';
        this.style.width = '100%';
        this.style.height = '100%';
        this.style.minHeight = '100px'; // Prevent 0-height collapse

        const container = document.createElement('div');
        container.style.width = '100%';
        container.style.height = '100%';
        this.appendChild(container);

        this.chart = initChart(container);

        // ARCHITECTURAL FIX: Use RAF for resize to debounce and sync with paint
        this.resizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(() => this.chart?.resize());
        });
        this.resizeObserver.observe(container);

        this.chart.on('click', (params) => {
            const data = /** @type {any} */ (params.data);
            if (data && data.raw) {
                uiActions.setTimelineSelectedItem(data.raw);
            }
        });

        // Trigger initial update if data was set before connect
        if (this._data) {
            this.updateChart();
        }
    }

    disconnectedCallback() {
        if (this.resizeObserver) this.resizeObserver.disconnect();
        if (this.chart) disposeChart(this.chart);
    }

    updateChart() {
        if (!this._data || !this.chart) return;

        // ARCHITECTURAL FIX: Removed synchronous resize() call.
        // Calling resize() here during a high-frequency data update (like live playback)
        // can cause a race condition in ECharts' tooltip renderer if the DOM is being thrashed.
        // The ResizeObserver in connectedCallback handles dimension changes sufficienty.

        const { tracks, chartBounds, timeOffset } = this._data;
        const categories = tracks.map((t) => t.label);
        const seriesData = [];

        tracks.forEach((track, trackIndex) => {
            track.items.forEach((item) => {
                const colorConfig =
                    TRACK_COLORS[item.type] || TRACK_COLORS.period;
                let itemStyle = {
                    color: colorConfig.base,
                    borderColor: colorConfig.border,
                    borderWidth: 1,
                    borderRadius: 2,
                    opacity: 0.85,
                };

                if (item.type === 'period') {
                    itemStyle = {
                        color: 'rgba(71, 85, 105, 0.3)',
                        borderColor: 'rgba(148, 163, 184, 0.5)',
                        borderWidth: 1,
                        // @ts-ignore
                        borderType: 'dashed',
                        opacity: 0.5,
                        borderRadius: 0,
                    };
                }

                seriesData.push({
                    value: [trackIndex, item.start, item.end, item.label],
                    itemStyle,
                    raw: item,
                    trackType: track.type,
                    itemType: item.type,
                    // Pass global offset to tooltip formatter if needed
                    globalTimeOffset: timeOffset,
                });
            });
        });

        const renderItem = (params, api) => {
            const categoryIndex = api.value(0);
            const start = api.coord([api.value(1), categoryIndex]);
            const end = api.coord([api.value(2), categoryIndex]);
            const height = 24;

            const width = Math.max(2, end[0] - start[0]);
            const x = start[0];
            const y = start[1] - height / 2;

            const itemData = seriesData[params.dataIndex];

            if (itemData.itemType === 'gap') {
                return {
                    type: 'group',
                    children: [
                        {
                            type: 'rect',
                            shape: { x, y, width, height },
                            style: {
                                fill: 'rgba(239, 68, 68, 0.15)',
                                stroke: '#ef4444',
                                lineWidth: 1,
                                lineDash: [2, 2],
                            },
                        },
                        width > 20
                            ? {
                                  type: 'text',
                                  style: {
                                      text: '!',
                                      x: x + width / 2,
                                      y: y + height / 2,
                                      align: 'center',
                                      verticalAlign: 'middle',
                                      fill: '#ef4444',
                                      fontSize: 10,
                                      fontWeight: 'bold',
                                  },
                              }
                            : null,
                    ].filter(Boolean),
                };
            }

            return {
                type: 'rect',
                shape: { x, y, width, height, r: 3 },
                style: api.style(),
            };
        };

        const option = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'item',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                borderColor: '#334155',
                textStyle: { color: '#f8fafc', fontSize: 11 },
                padding: [6, 10],
                formatter: (params) => {
                    const d = params.data.raw;
                    return `<div class="font-bold text-xs border-b border-slate-600 mb-1 pb-1">${d.label}</div>
                            <div class="text-[10px] text-slate-300">
                                Start: <span class="font-mono text-cyan-400">${d.originalStart.toFixed(2)}s</span><br/>
                                Dur: <span class="font-mono text-emerald-400">${d.duration.toFixed(2)}s</span>
                            </div>`;
                },
            },
            grid: {
                top: 10,
                left: 90,
                right: 20,
                bottom: 30, // Adjusted bottom for scrollbar
            },
            xAxis: {
                type: 'value',
                min: chartBounds.min,
                max: chartBounds.max,
                axisLabel: {
                    color: '#64748b',
                    fontSize: 9,
                    formatter: (val) => `${val.toFixed(0)}s`,
                },
                splitLine: {
                    show: true,
                    lineStyle: { color: '#1e293b', type: 'dashed' },
                },
                axisLine: { lineStyle: { color: '#334155' } },
            },
            yAxis: {
                type: 'category',
                data: categories,
                axisLabel: {
                    color: '#94a3b8',
                    fontSize: 10,
                    fontWeight: '600',
                    margin: 10,
                },
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { show: true, lineStyle: { color: '#1e293b' } },
                inverse: false,
            },
            dataZoom: [
                {
                    type: 'slider',
                    xAxisIndex: 0,
                    filterMode: 'weakFilter',
                    height: 20,
                    bottom: 0,
                    start: 0,
                    end: 100,
                    borderColor: 'transparent',
                    backgroundColor: 'rgba(30, 41, 59, 0.5)',
                    fillerColor: 'rgba(59, 130, 246, 0.2)',
                    handleStyle: { color: '#60a5fa', borderColor: '#60a5fa' },
                    moveHandleStyle: { color: '#60a5fa', opacity: 0.5 },
                    textStyle: { color: '#64748b', fontSize: 9 },
                },
                { type: 'inside', xAxisIndex: 0, filterMode: 'weakFilter' },
            ],
            series: [
                {
                    type: 'custom',
                    renderItem: renderItem,
                    encode: { x: [1, 2], y: 0 },
                    data: seriesData,
                },
            ],
        };

        this.chart.setOption(option, { notMerge: true });
    }
}

customElements.define('timeline-chart', TimelineChart);
