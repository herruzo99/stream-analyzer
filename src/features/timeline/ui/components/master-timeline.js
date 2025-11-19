
import { init as initChart } from 'echarts/core';
import { disposeChart } from '@/ui/shared/charts/chart-renderer';
import { useUiStore, uiActions } from '@/state/uiStore';
import { shallow } from 'zustand/vanilla/shallow';
import { formatBitrate } from '@/ui/shared/format';

const Y_AXIS_CATEGORIES = ['Segments', 'Periods', 'Events', 'Ad Breaks', 'ABR'];
const Y_AXIS_ORDER = {
    segment: 0,
    period: 1,
    event: 2,
    ad: 3,
    abr: 4,
};
const ITEM_COLORS = {
    period_even: '#3b82f6', // blue-500
    period_odd: '#1d4ed8', // blue-700
    ad: '#a855f7', // purple-500
    event: '#f59e0b', // amber-500
    segment_even: '#475569', // slate-600
    segment_odd: '#334155', // slate-700
    abr: '#10b981', // emerald-500
    overlap: 'rgba(234, 179, 8, 0.7)', // yellow-500 with opacity
};

/**
 * Encapsulated normalization logic. Takes absolute-timed entities and stream context,
 * and returns a zero-based timeline model ready for rendering.
 * @param {object} params
 * @returns {{normalizedEntities: object[], timeOffset: number, totalDuration: number, overlapInfo: Map<string, any>}}
 */
function normalizeAndFilterEntities({
    entities,
    isLive,
    liveEdge,
    dvrWindow,
    initialTimeOffset,
    totalVodDuration,
}) {
    const timeOffset = initialTimeOffset || 0;

    // Use the calculated duration passed from the ViewModel.
    let totalDuration = totalVodDuration;

    // Fail-safe: If 0 or invalid, assume the max end of any entity is the duration
    if (!totalDuration || totalDuration <= 0) {
        if (entities.length > 0) {
            const maxEnd = Math.max(...entities.map((e) => e.end));
            totalDuration = Math.max(0, maxEnd - timeOffset);
        } else {
            totalDuration = 100; // Default fallback
        }
    }

    const overlapInfo = new Map();

    const normalizedEntities = entities.map((entity) => ({
        ...entity,
        start: Math.max(0, entity.start - timeOffset), // Clamp to 0
        end: Math.max(0, entity.end - timeOffset),
    }));

    return { normalizedEntities, timeOffset, totalDuration, overlapInfo };
}

/**
 * Creates the ECharts options object for the master timeline.
 * @returns {object} The ECharts options.
 */
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
            // Explicit ID for data item stability
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
            timeOffset: timeOffset, // Pass offset to tooltip
        };
    });

    const markLines = [];
    if (isLive) {
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

        if (dvrStart !== null) {
            const dvrStartPos = dvrStart - timeOffset;
            if (dvrStartPos >= 0) {
                markLines.push({
                    name: 'DVR Start',
                    xAxis: dvrStartPos,
                    lineStyle: { color: '#6b7280', type: 'dashed' },
                    label: { position: 'start', formatter: 'DVR Window' },
                });
            }
        }
        if (suggestedLivePoint !== null) {
            markLines.push({
                name: 'Suggested Live',
                xAxis: suggestedLivePoint - timeOffset,
                lineStyle: { color: '#3b82f6', type: 'dashed' },
                label: { show: false },
                symbol: ['none', 'circle'],
            });
        }
    }
    if (playheadTime !== null) {
        const playheadPos = playheadTime - timeOffset;
        if (playheadPos >= 0) {
            markLines.push({
                name: 'Playhead',
                xAxis: playheadPos,
                lineStyle: { color: '#facc15', width: 2 },
                label: { show: false },
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
            style.stroke = '#facc15'; // yellow-400
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

    const options = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(15, 23, 42, 0.95)', // slate-900
            borderColor: '#334155', // slate-700
            textStyle: { color: '#f8fafc' }, // slate-50
            formatter: (params) => {
                const p = Array.isArray(params) ? params[0] : params;

                if (!p || !p.data || typeof p.data !== 'object') {
                    return '';
                }

                if (p.data && p.data.originalEntity) {
                    const entity = p.data.originalEntity;
                    let tooltipHtml = `<div class="font-bold text-sm mb-1 border-b border-slate-600 pb-1">${entity.label}</div>`;

                    // FIX: Use normalized chart values to calculate duration, avoiding mix of absolute/relative
                    const chartStart = p.value[1];
                    const chartEnd = p.value[2];
                    const duration = chartEnd - chartStart;

                    // To display the "real" timestamp (e.g., 22:20:00), we add the offset back
                    const offset = p.data.timeOffset || 0;
                    const displayStart = chartStart + offset;
                    const displayEnd = chartEnd + offset;

                    const formatTime = (t) => {
                        // Heuristic: If > ~1 year in seconds, treat as Epoch
                        if (t > 30000000) {
                            try {
                                // Just show the time part of ISO string
                                return new Date(t * 1000)
                                    .toISOString()
                                    .split('T')[1]
                                    .replace('Z', '');
                            } catch (_e) {
                                return t.toFixed(3);
                            }
                        }
                        return `${t.toFixed(3)}s`;
                    };

                    if (entity.type === 'abr') {
                        tooltipHtml += `<div class="text-xs text-slate-300 space-y-1">
                                            <div><span class="text-slate-400">Time:</span> <span class="font-mono text-cyan-400">${formatTime(displayStart)}</span></div>
                                            <div><span class="text-slate-400">To:</span> <span class="font-mono text-yellow-400">${entity.data.newHeight}p</span> @ ${formatBitrate(entity.data.newBandwidth)}</div>
                                        </div>`;
                    } else {
                        tooltipHtml += `<div class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-slate-300">
                                            <span class="text-slate-400">Start:</span> <span class="font-mono text-cyan-400">${formatTime(displayStart)}</span>
                                            <span class="text-slate-400">End:</span> <span class="font-mono text-cyan-400">${formatTime(displayEnd)}</span>
                                            <span class="text-slate-400">Duration:</span> <span class="font-mono text-emerald-400">${duration.toFixed(3)}s</span>
                                        </div>`;
                    }

                    return tooltipHtml;
                }
                return '';
            },
        },
        dataZoom: [
            {
                type: 'slider',
                filterMode: 'weakFilter',
                showDataShadow: false,
                top: 'auto',
                bottom: 10,
                height: 24,
                showDetail: false,
                borderColor: 'transparent',
                backgroundColor: 'rgba(30, 41, 59, 0.5)',
                fillerColor: 'rgba(59, 130, 246, 0.3)',
                handleIcon: 'path://M8,0 L8,40 M24,0 L24,40',
                handleSize: '100%',
                handleStyle: {
                    color: '#60a5fa',
                    borderWidth: 0,
                },
                textStyle: { color: '#94a3b8' },
                start: zoomStart,
                end: zoomEnd,
            },
            {
                type: 'inside',
                filterMode: 'weakFilter',
                zoomOnMouseWheel: true,
                moveOnMouseWheel: true,
            },
        ],
        grid: { left: 100, right: 30, top: 30, bottom: 50 },
        xAxis: {
            min: 0,
            max: Math.ceil(totalDuration / 30) * 30,
            type: 'value',
            name: 'Timeline (Relative)',
            nameLocation: 'end',
            nameGap: 10,
            nameTextStyle: { color: '#94a3b8', fontSize: 10 },
            axisLine: { lineStyle: { color: '#475569' } },
            axisLabel: { color: '#94a3b8', fontSize: 10 },
            splitLine: { lineStyle: { color: '#334155', type: 'dashed' } },
        },
        yAxis: {
            type: 'category',
            data: Y_AXIS_CATEGORIES,
            axisLine: { lineStyle: { color: '#475569' } },
            axisLabel: { color: '#e2e8f0', fontWeight: 'bold', fontSize: 11 },
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
                dimensions: ['category', 'start', 'end', 'label'],
                markLine: {
                    symbol: ['none', 'none'],
                    animation: false,
                    silent: true,
                    data: markLines,
                },
            },
        ],
    };

    return { options };
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

        // Bind methods
        this._onChartMouseOver = this._onChartMouseOver.bind(this);
        this._onChartMouseOut = this._onChartMouseOut.bind(this);
        this._onChartClick = this._onChartClick.bind(this);
        this._onDataZoom = this._onDataZoom.bind(this);
    }

    set entities(val) {
        if (!shallow(this._entities, val)) {
            this._entities = val;
            this.renderData();
        }
    }
    get entities() {
        return this._entities;
    }
    set isLive(val) {
        if (this._isLive !== val) {
            this._isLive = val;
            this.renderData();
        }
    }
    get isLive() {
        return this._isLive;
    }
    set liveEdge(val) {
        if (this._liveEdge !== val) {
            this._liveEdge = val;
            this.renderData();
        }
    }
    get liveEdge() {
        return this._liveEdge;
    }
    set dvrWindow(val) {
        if (this._dvrWindow !== val) {
            this._dvrWindow = val;
            this.renderData();
        }
    }
    get dvrWindow() {
        return this._dvrWindow;
    }
    set suggestedLivePoint(val) {
        if (this._suggestedLivePoint !== val) {
            this._suggestedLivePoint = val;
            this.renderData();
        }
    }
    get suggestedLivePoint() {
        return this._suggestedLivePoint;
    }
    set playheadTime(val) {
        if (this._playheadTime !== val) {
            this._playheadTime = val;
            this.renderData();
        }
    }
    get playheadTime() {
        return this._playheadTime;
    }
    set initialTimeOffset(val) {
        if (this._initialTimeOffset !== val) {
            this._initialTimeOffset = val;
            this.renderData();
        }
    }
    get initialTimeOffset() {
        return this._initialTimeOffset;
    }
    set totalVodDuration(val) {
        if (this._totalVodDuration !== val) {
            this._totalVodDuration = val;
            this.renderData();
        }
    }
    get totalVodDuration() {
        return this._totalVodDuration;
    }

    connectedCallback() {
        this.appendChild(this.chartContainer);
        this.chart = initChart(this.chartContainer);
        this.resizeObserver = new ResizeObserver(() => this.chart?.resize());
        this.resizeObserver.observe(this.chartContainer);

        this.chart.on('datazoom', this._onDataZoom);
        this.chart.on('mouseover', this._onChartMouseOver);
        this.chart.on('mouseout', this._onChartMouseOut);
        this.chart.on('click', this._onChartClick);

        this.unsubscribe = useUiStore.subscribe(
            (
                { timelineHoveredItem, timelineSelectedItem },
                {
                    timelineHoveredItem: prevHover,
                    timelineSelectedItem: prevSelect,
                }
            ) => {
                if (
                    timelineHoveredItem !== prevHover ||
                    timelineSelectedItem !== prevSelect
                ) {
                    this.renderData();
                }
            }
        );
        this.renderData();
    }

    disconnectedCallback() {
        if (this.unsubscribe) this.unsubscribe();
        this.resizeObserver.disconnect();
        if (this.chart) {
            this.chart.off('datazoom', this._onDataZoom);
            this.chart.off('mouseover', this._onChartMouseOver);
            this.chart.off('mouseout', this._onChartMouseOut);
            this.chart.off('click', this._onChartClick);
            disposeChart(this.chart);
        }
        this.chart = null;
    }

    _onDataZoom(params) {
        const eventParams = params;
        if (eventParams.batch) {
            this.zoomStart = eventParams.batch[0].start;
            this.zoomEnd = eventParams.batch[0].end;
        } else {
            this.zoomStart = eventParams.start;
            this.zoomEnd = eventParams.end;
        }
    }

    _onChartMouseOver(params) {
        if (
            params.data &&
            typeof params.data === 'object' &&
            'originalEntity' in params.data
        ) {
            uiActions.setTimelineHoveredItem(params.data.originalEntity);
        }
    }

    _onChartMouseOut() {
        uiActions.setTimelineHoveredItem(null);
    }

    _onChartClick(params) {
        if (
            params.data &&
            typeof params.data === 'object' &&
            'originalEntity' in params.data
        ) {
            const { originalEntity } = params.data;
            if (
                originalEntity &&
                typeof originalEntity === 'object' &&
                'id' in originalEntity
            ) {
                const currentSelection =
                    useUiStore.getState().timelineSelectedItem;
                if (
                    currentSelection &&
                    currentSelection.id === originalEntity.id
                ) {
                    uiActions.setTimelineSelectedItem(null);
                } else {
                    uiActions.setTimelineSelectedItem(originalEntity);
                }
            }
        }
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
                lazyUpdate: false,
            });
        } else {
            this.chart.clear();
            this.chart.setOption({
                title: {
                    text: 'No timeline data available to display.',
                    subtext: this._isLive
                        ? 'Waiting for live segments...'
                        : 'Check stream analysis results.',
                    left: 'center',
                    top: 'center',
                    textStyle: { color: '#94a3b8', fontSize: 16 },
                    subtextStyle: { color: '#64748b', fontSize: 12 },
                },
            });
        }
    }

    render() {
        /* No-op */
    }
}

customElements.define('master-timeline-chart', MasterTimelineChart);
