import {
    getInstanceByDom,
    init as initChart,
    use as useEchartsModules,
} from 'echarts/core';
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

// --- ARCHITECTURAL FIX: ECharts Tree-Shaking ---
// ECharts is a tree-shakable library. We must explicitly import and register
// the components and renderers we intend to use. This single registration
// will apply to all charts created via this utility.
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
let tooltipProxyEl = null;

function createTooltipProxy() {
    if (!tooltipProxyEl) {
        tooltipProxyEl = document.createElement('div');
        tooltipProxyEl.style.position = 'fixed';
        tooltipProxyEl.style.pointerEvents = 'none';
        tooltipProxyEl.style.visibility = 'hidden';
        document.body.appendChild(tooltipProxyEl);
    }
}

function showCustomTooltip(chartEvent, chartContainer) {
    if (!tooltipProxyEl) createTooltipProxy();
    if (!chartEvent.componentType || chartEvent.componentType === 'markLine')
        return;

    let tooltipContent = '';
    const { seriesName, value, name, componentType, data } = chartEvent;

    // Custom formatter logic based on chart type
    if (seriesName === 'Buffered' && Array.isArray(value)) {
        const [_, start, end, dur] = value;
        tooltipContent = `<b>Buffered Range</b><br/>Start: ${start.toFixed(
            2
        )}s<br/>End: ${end.toFixed(2)}s<br/>Duration: ${dur.toFixed(2)}s`;
    } else if (componentType === 'markArea') {
        tooltipContent = `<b>${data.name}</b><br/>Range: ${data.xAxis[0].toFixed(
            2
        )}s - ${data.xAxis[1].toFixed(2)}s`;
    }

    if (tooltipContent) {
        tooltipProxyEl.setAttribute('data-tooltip', tooltipContent);
        tooltipProxyEl.setAttribute('data-iso', ''); // Clear ISO ref for chart tooltips

        // Position the proxy element at the mouse cursor
        tooltipProxyEl.style.left = `${chartEvent.event.event.clientX}px`;
        tooltipProxyEl.style.top = `${chartEvent.event.event.clientY}px`;

        // Dispatch a synthetic mouseover event that our global listener will catch
        const mouseOverEvent = new MouseEvent('mouseover', { bubbles: true });
        tooltipProxyEl.dispatchEvent(mouseOverEvent);
    }
}

function hideCustomTooltip() {
    if (tooltipProxyEl) {
        const mouseOutEvent = new MouseEvent('mouseout', { bubbles: true });
        tooltipProxyEl.dispatchEvent(mouseOutEvent);
    }
}

/**
 * Renders or updates an ECharts chart in a given container.
 * @param {HTMLElement} container - The DOM element to render the chart into.
 * @param {object} options - The ECharts option object.
 * @param {Function} [onClick] - An optional callback to handle clicks on the chart's grid.
 */
export function renderChart(container, options, onClick) {
    if (!container) return;

    let chart = chartInstances.get(container);

    if (!chart) {
        chart = initChart(container);
        chartInstances.set(container, chart);

        const resizeObserver = new ResizeObserver(() => {
            chart.resize();
        });
        resizeObserver.observe(container);
        resizeObservers.set(container, resizeObserver);

        // Integrate custom tooltip system
        chart.on('mouseover', (params) => showCustomTooltip(params, container));
        chart.on('mouseout', hideCustomTooltip);

        if (onClick) {
            chart.getZr().on('click', (params) => {
                const pointInGrid = chart.convertFromPixel('grid', [
                    params.offsetX,
                    params.offsetY,
                ]);
                if (pointInGrid) {
                    onClick(pointInGrid[0]);
                }
            });
        }
    }

    chart.setOption(options, { notMerge: true });
}

/**
 * Disposes of a chart instance and cleans up resources.
 * @param {HTMLElement | echarts.ECharts} chartOrContainer - The container or the chart instance to dispose.
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
