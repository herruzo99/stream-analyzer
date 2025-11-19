import { init as initChart, use as useEchartsModules } from 'echarts/core';
import { LineChart, BarChart, CustomChart } from 'echarts/charts';
import {
    GridComponent,
    TooltipComponent,
    LegendComponent,
    DataZoomComponent,
    MarkLineComponent,
    MarkAreaComponent,
    TitleComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { formatBitrate } from '@/ui/shared/format';

useEchartsModules([
    CanvasRenderer,
    LineChart,
    BarChart,
    CustomChart,
    GridComponent,
    TooltipComponent,
    LegendComponent,
    DataZoomComponent,
    MarkLineComponent,
    MarkAreaComponent,
    TitleComponent,
]);

const chartInstances = new Map();
const resizeObservers = new Map();

/**
 * A default, rich-text tooltip formatter that can be used by any chart.
 * It inspects the hovered data point for known structures and formats them.
 * @param {any} params - The ECharts formatter params.
 * @returns {string} The formatted HTML for the tooltip.
 */
const defaultTooltipFormatter = (params) => {
    const p = Array.isArray(params) ? params[0] : params;

    if (!p || !p.data || typeof p.data !== 'object') {
        return '';
    }

    // Timeline Chart Tooltip Logic
    if (p.data.originalEntity) {
        const entity = p.data.originalEntity;
        const absoluteStart =
            entity.data?.start !== undefined ? entity.data.start : entity.start;
        const absoluteEnd =
            entity.data?.end !== undefined ? entity.data.end : entity.end;

        let content = `<b>${entity.label}</b>`;
        if (entity.type === 'abr') {
            content += `<br/><b>Time:</b> ${absoluteStart.toFixed(3)}s`;
            content += `<br/><b>To:</b> ${entity.data.newHeight}p @ ${formatBitrate(entity.data.newBandwidth)}`;
        } else {
            const duration = absoluteEnd - absoluteStart;
            content += `<br/><b>Time:</b> ${absoluteStart.toFixed(3)}s - ${absoluteEnd.toFixed(3)}s`;
            content += `<br/><b>Duration:</b> ${duration.toFixed(3)}s`;
        }
        return content;
    }

    // ABR Ladder Chart Tooltip Logic
    if (p.data.trackInfo) {
        const { trackInfo } = p.data;
        let content = `<b>${p.seriesName}</b>`;
        content += `<br/><b>Bitrate:</b> ${formatBitrate(trackInfo.bandwidth)}`;
        content += `<br/><b>Resolution:</b> ${trackInfo.width}x${trackInfo.height}`;
        return content;
    }

    // Default fallback for simple charts (like throughput)
    const time = p.axisValueLabel;
    const value = p.value[1];
    let formattedValue = '';
    if (
        p.seriesName.toLowerCase().includes('bitrate') ||
        p.seriesName.toLowerCase().includes('throughput')
    ) {
        formattedValue = formatBitrate(value);
    } else if (p.seriesName.toLowerCase().includes('buffer')) {
        formattedValue = `${value.toFixed(2)}s`;
    } else {
        formattedValue = typeof value === 'number' ? value.toFixed(2) : value;
    }

    return `<b>${p.seriesName}</b><br/>Time: ${time}<br/>Value: ${formattedValue}`;
};

/**
 * Renders or updates an ECharts chart in a given container.
 * @param {HTMLElement} container - The DOM element to render the chart into.
 * @param {object} options - The ECharts option object.
 * @param {object} [eventHandlers] - Optional map of event handlers.
 * @param {(params: any) => void} [eventHandlers.onClick] - Click handler for chart series items.
 * @param {(params: any) => void} [eventHandlers.onMouseOver] - Mouseover handler.
 * @param {() => void} [eventHandlers.onMouseOut] - Mouseout handler.
 */
export function renderChart(container, options, eventHandlers = {}) {
    if (!container) return;

    if (container.clientWidth === 0 || container.clientHeight === 0) {
        requestAnimationFrame(() =>
            renderChart(container, options, eventHandlers)
        );
        return;
    }

    let chart = chartInstances.get(container);

    if (!chart) {
        chart = initChart(container);
        chartInstances.set(container, chart);

        const resizeObserver = new ResizeObserver(() => {
            chart.resize();
        });
        resizeObserver.observe(container);
        resizeObservers.set(container, resizeObserver);
    }

    chart.off('click');
    chart.off('mouseover');
    chart.off('mouseout');

    if (eventHandlers.onClick) {
        chart.on('click', eventHandlers.onClick);
    }
    if (eventHandlers.onMouseOver) {
        chart.on('mouseover', eventHandlers.onMouseOver);
    }
    if (eventHandlers.onMouseOut) {
        chart.on('mouseout', eventHandlers.onMouseOut);
    }

    // --- ARCHITECTURAL FIX: Use native ECharts rich text tooltip ---
    const finalOptions = {
        ...options,
        tooltip: {
            ...options.tooltip,
            trigger: options.tooltip?.trigger || 'axis',
            formatter: options.tooltip?.formatter || defaultTooltipFormatter,
            confine: true, // Keep tooltip within chart bounds
            backgroundColor: 'rgba(30, 41, 59, 0.9)', // slate-800
            borderColor: '#4b5563', // slate-600
            textStyle: { color: '#e5e7eb' }, // slate-200
        },
    };
    // --- END FIX ---

    chart.setOption(finalOptions, { notMerge: false, lazyUpdate: true });
}

/**
 * Disposes of a chart instance and cleans up resources.
 * @param {HTMLElement | import('echarts/core').ECharts} chartOrContainer - The container or the chart instance to dispose.
 */
export function disposeChart(chartOrContainer) {
    if (!chartOrContainer) return;

    const isContainer = chartOrContainer instanceof HTMLElement;
    const container = isContainer
        ? chartOrContainer
        : chartOrContainer.getDom();
    const chart = isContainer
        ? chartInstances.get(container)
        : chartOrContainer;

    if (chart) {
        chart.dispose();
        if (isContainer) {
            chartInstances.delete(container);
        }
    }

    if (isContainer) {
        const observer = resizeObservers.get(container);
        if (observer) {
            observer.disconnect();
            resizeObservers.delete(container);
        }
    }
}
