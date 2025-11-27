import { useUiStore } from '@/state/uiStore';
import { disposeChart } from '@/ui/shared/charts/chart-renderer';
import { init as initChart } from 'echarts/core';
import { shallow } from 'zustand/vanilla/shallow';

const Y_AXIS_CATEGORIES = ['Segments', 'Periods', 'Events', 'Ad Breaks', 'ABR'];
const Y_AXIS_ORDER = {
    segment: 0,
    period: 1,
    event: 2,
    ad: 3,
    abr: 4,
};
const ITEM_COLORS = {
    period_even: '#3b82f6',
    period_odd: '#1d4ed8',
    ad: '#a855f7',
    event: '#f59e0b',
    segment_even: '#475569',
    segment_odd: '#334155',
    abr: '#10b981',
    overlap: 'rgba(234, 179, 8, 0.7)',
};

function normalizeAndFilterEntities({
    entities,
    isLive,
    liveEdge,
    dvrWindow,
    initialTimeOffset,
    totalVodDuration,
}) {
    const timeOffset = initialTimeOffset || 0;
    let totalDuration = totalVodDuration;

    if (!totalDuration || totalDuration <= 0) {
        if (entities.length > 0) {
            const maxEnd = Math.max(...entities.map((e) => e.end));
            totalDuration = Math.max(0, maxEnd - timeOffset);
        } else {
            totalDuration = 100;
        }
    }

    const normalizedEntities = entities.map((entity) => ({
        ...entity,
        start: Math.max(0, entity.start - timeOffset),
        end: Math.max(0, entity.end - timeOffset),
    }));

    return { normalizedEntities, timeOffset, totalDuration };
}

function createTimelineChartOptions({
    normalizedEntities,
    totalDuration,
    zoomStart,
    zoomEnd,
    isLive,
    liveEdge,
    dvrStart,
    suggestedLivePoint,
    playheadTime,
    timeOffset,
}) {
    if (!normalizedEntities || normalizedEntities.length === 0) {
        return { options: {} };
    }

    let periodIndex = 0;
    let segmentIndex = 0;

    const data = normalizedEntities.map((entity) => {
        let itemColor;
        let itemBorderColor = 'transparent';
        let itemBorderWidth = 1;

        if (entity.type === 'period') {
            itemColor =
                periodIndex % 2 === 0
                    ? ITEM_COLORS.period_even
                    : ITEM_COLORS.period_odd;
            itemBorderColor = '#93c5fd';
            periodIndex++;
        } else if (entity.type === 'segment') {
            itemColor =
                segmentIndex % 2 === 0
                    ? ITEM_COLORS.segment_even
                    : ITEM_COLORS.segment_odd;
            segmentIndex++;
        } else {
            itemColor = ITEM_COLORS[entity.type] || '#64748b';
        }

        return {
            id: entity.id || `${entity.type}-${entity.start}-${entity.end}`,
            name: entity.label,
            value: [
                Y_AXIS_ORDER[entity.type],
                entity.start,
                entity.end,
                entity.label,
            ],
            itemStyle: {
                color: itemColor,
                borderColor: itemBorderColor,
                borderWidth: itemBorderWidth,
                opacity: 0.8,
                borderRadius: 2,
            },
            originalEntity: entity,
            timeOffset: timeOffset,
        };
    });

    const markLines = [];
    if (isLive && liveEdge !== null) {
        const liveEdgePos = liveEdge - timeOffset;
        if (liveEdgePos >= 0) {
            markLines.push({
                name: 'Live Edge',
                xAxis: liveEdgePos,
                lineStyle: { color: '#ef4444', width: 2, type: 'solid' },
                label: {
                    position: 'end',
                    formatter: 'LIVE',
                    color: '#fff',
                    backgroundColor: '#ef4444',
                    padding: [2, 4],
                    borderRadius: 2,
                    fontWeight: 'bold',
                },
            });
        }
    }

    function renderItem(params, api) {
        const dataItem = data[params.dataIndex];
        if (!dataItem) return;
        const categoryIndex = api.value(0);
        const start = api.coord([api.value(1), categoryIndex]);
        const end = api.coord([api.value(2), categoryIndex]);
        if (!start || !end) return;
        const height = api.size([0, 1])[1] * 0.6;
        const coordSys = params.coordSys;
        const rectShape = {
            x: start[0],
            y: start[1] - height / 2,
            width: end[0] - start[0],
            height: height,
        };
        if (
            rectShape.x > coordSys.x + coordSys.width ||
            rectShape.x + rectShape.width < coordSys.x
        ) {
            return;
        }
        rectShape.x = Math.max(rectShape.x, coordSys.x);
        rectShape.width =
            Math.min(end[0], coordSys.x + coordSys.width) - rectShape.x;
        if (rectShape.width <= 0) return;

        const { timelineHoveredItem, timelineSelectedItem } =
            useUiStore.getState();
        const activeItem = timelineSelectedItem || timelineHoveredItem;
        const currentEntity = dataItem.originalEntity;
        const itemStyleDef = dataItem.itemStyle;
        const style = {
            fill: itemStyleDef.color,
            stroke: itemStyleDef.borderColor || 'transparent',
            lineWidth: itemStyleDef.borderWidth || 0,
            opacity: itemStyleDef.opacity || 1,
        };
        if (currentEntity && activeItem && currentEntity.id === activeItem.id) {
            style.stroke = '#facc15';
            style.lineWidth = 2;
            style.opacity = 1;
            style.shadowBlur = 10;
            style.shadowColor = 'rgba(250, 204, 21, 0.5)';
        }
        return {
            type: 'rect',
            transition: ['shape', 'style'],
            shape: rectShape,
            style: style,
            z2: 1,
        };
    }

    return {
        options: {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'item',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                borderColor: '#334155',
                textStyle: { color: '#f8fafc' },
                formatter: (params) => {
                    const p = Array.isArray(params) ? params[0] : params;
                    if (!p || !p.data || typeof p.data !== 'object') return '';
                    const entity = p.data.originalEntity;
                    let tooltipHtml = `<div class="font-bold text-sm mb-1 border-b border-slate-600 pb-1">${entity.label}</div>`;
                    const chartStart = p.value[1];
                    const chartEnd = p.value[2];
                    const duration = chartEnd - chartStart;
                    const offset = p.data.timeOffset || 0;
                    const displayStart = chartStart + offset;
                    const displayEnd = chartEnd + offset;

                    tooltipHtml += `<div class="text-xs text-slate-300">Start: ${displayStart.toFixed(3)}s<br/>End: ${displayEnd.toFixed(3)}s<br/>Dur: ${duration.toFixed(3)}s</div>`;
                    return tooltipHtml;
                },
            },
            dataZoom: [
                {
                    type: 'slider',
                    filterMode: 'weakFilter',
                    start: zoomStart,
                    end: zoomEnd,
                },
                { type: 'inside', filterMode: 'weakFilter' },
            ],
            grid: { left: 100, right: 30, top: 30, bottom: 50 },
            xAxis: {
                min: 0,
                max: Math.ceil(totalDuration / 30) * 30,
                type: 'value',
                splitLine: { lineStyle: { color: '#334155', type: 'dashed' } },
            },
            yAxis: {
                type: 'category',
                data: Y_AXIS_CATEGORIES,
                splitLine: { show: true, lineStyle: { color: '#334155' } },
            },
            series: [
                {
                    id: 'timeline-series',
                    type: 'custom',
                    renderItem: renderItem,
                    encode: { x: [1, 2], y: 0 },
                    data: data,
                    clip: true,
                    animation: false,
                    markLine: {
                        symbol: ['none', 'none'],
                        animation: false,
                        silent: true,
                        data: markLines,
                    },
                },
            ],
        },
    };
}

class MasterTimelineChart extends HTMLElement {
    constructor() {
        super();
        this._entities = [];
        this._isLive = false;
        this._liveEdge = null;
        this._dvrWindow = null;
        this._suggestedLivePoint = null;
        this._playheadTime = null;
        this._initialTimeOffset = 0;
        this._totalVodDuration = 0;

        this.unsubscribe = null;
        this.chartContainer = document.createElement('div');
        this.chartContainer.style.width = '100%';
        this.chartContainer.style.height = '100%';
        this.chart = null;
        this.zoomStart = 0;
        this.zoomEnd = 100;

        this._updateScheduled = false;
    }

    set entities(val) {
        if (!shallow(this._entities, val)) {
            this._entities = val;
            this.scheduleRender();
        }
    }
    get entities() {
        return this._entities;
    }
    set isLive(val) {
        if (this._isLive !== val) {
            this._isLive = val;
            this.scheduleRender();
        }
    }
    get isLive() {
        return this._isLive;
    }
    set liveEdge(val) {
        if (this._liveEdge !== val) {
            this._liveEdge = val;
            this.scheduleRender();
        }
    }
    get liveEdge() {
        return this._liveEdge;
    }
    set dvrWindow(val) {
        if (this._dvrWindow !== val) {
            this._dvrWindow = val;
            this.scheduleRender();
        }
    }
    get dvrWindow() {
        return this._dvrWindow;
    }
    set suggestedLivePoint(val) {
        if (this._suggestedLivePoint !== val) {
            this._suggestedLivePoint = val;
            this.scheduleRender();
        }
    }
    get suggestedLivePoint() {
        return this._suggestedLivePoint;
    }
    set playheadTime(val) {
        if (this._playheadTime !== val) {
            this._playheadTime = val;
            this.scheduleRender();
        }
    }
    get playheadTime() {
        return this._playheadTime;
    }
    set initialTimeOffset(val) {
        if (this._initialTimeOffset !== val) {
            this._initialTimeOffset = val;
            this.scheduleRender();
        }
    }
    get initialTimeOffset() {
        return this._initialTimeOffset;
    }
    set totalVodDuration(val) {
        if (this._totalVodDuration !== val) {
            this._totalVodDuration = val;
            this.scheduleRender();
        }
    }
    get totalVodDuration() {
        return this._totalVodDuration;
    }

    connectedCallback() {
        this.appendChild(this.chartContainer);
        this.chart = initChart(this.chartContainer);
        this.resizeObserver = new ResizeObserver(() => {
            if (this.chart) requestAnimationFrame(() => this.chart.resize());
        });
        this.resizeObserver.observe(this.chartContainer);

        this.chart.on('datazoom', (params) => {
            const eventParams = /** @type {any} */ (params);
            if (eventParams.batch) {
                this.zoomStart = eventParams.batch[0].start;
                this.zoomEnd = eventParams.batch[0].end;
            } else {
                this.zoomStart = eventParams.start;
                this.zoomEnd = eventParams.end;
            }
        });

        this.unsubscribe = useUiStore.subscribe(
            ({ timelineHoveredItem, timelineSelectedItem }, prev) => {
                if (
                    timelineHoveredItem !== prev.timelineHoveredItem ||
                    timelineSelectedItem !== prev.timelineSelectedItem
                ) {
                    this.scheduleRender();
                }
            }
        );
        this.scheduleRender();
    }

    disconnectedCallback() {
        if (this.unsubscribe) this.unsubscribe();
        this.resizeObserver.disconnect();
        if (this.chart) disposeChart(this.chart);
        this.chart = null;
    }

    scheduleRender() {
        if (this._updateScheduled) return;
        this._updateScheduled = true;
        requestAnimationFrame(() => {
            this.renderData();
            this._updateScheduled = false;
        });
    }

    renderData() {
        if (!this.chart) return;

        const { normalizedEntities, timeOffset, totalDuration } =
            normalizeAndFilterEntities({
                entities: this._entities,
                isLive: this._isLive,
                liveEdge: this._liveEdge,
                dvrWindow: this._dvrWindow,
                initialTimeOffset: this._initialTimeOffset,
                totalVodDuration: this._totalVodDuration,
            });

        const hasData =
            normalizedEntities &&
            (normalizedEntities.length > 0 ||
                (this._isLive && this._liveEdge > 0));

        if (hasData) {
            const { options } = createTimelineChartOptions({
                normalizedEntities,
                totalDuration,
                zoomStart: this.zoomStart,
                zoomEnd: this.zoomEnd,
                isLive: this._isLive,
                liveEdge: this._liveEdge,
                dvrStart: this._isLive
                    ? this._liveEdge - this._dvrWindow
                    : null,
                suggestedLivePoint: this._suggestedLivePoint,
                playheadTime: this._playheadTime,
                timeOffset: timeOffset,
            });

            this.chart.setOption(options, {
                replaceMerge: ['series', 'xAxis', 'markLine'],
                lazyUpdate: true,
            });
        } else {
            this.chart.clear();
        }
    }
}

customElements.define('master-timeline-chart', MasterTimelineChart);
