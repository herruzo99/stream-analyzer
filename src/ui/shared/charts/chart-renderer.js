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
import { formatBitrate } from '@/ui/shared/format';

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

    let tooltipContent = '';
    const { seriesName, value, name, componentType, data, seriesType } =
        chartEvent;

    // --- ENHANCED TOOLTIP LOGIC ---
    if (data && data.segment) {
        // Timeline Chart Tooltip
        const { segment } = data;
        const {
            type,
            number,
            duration,
            startTime,
            endTime,
            isPartial,
            resolvedUrl,
            encryptionInfo,
            flags,
        } = segment;

        let flagHtml = '';
        if (flags && flags.length > 0) {
            flagHtml = `<p class="mt-1"><b>Flags:</b> ${flags.join(', ')}</p>`;
        }

        let encryptionHtml = '';
        if (encryptionInfo && encryptionInfo.method !== 'NONE') {
            encryptionHtml = `<p class="mt-1"><b>Encryption:</b> ${encryptionInfo.method}</p>`;
        }

        const urlFilename = resolvedUrl
            ? resolvedUrl.split('/').pop().split('?')[0]
            : 'N/A';

        tooltipContent = `
            <div class="text-left">
                <p class="font-bold text-slate-100">${
                    isPartial ? 'Partial Segment' : type
                } #${number}</p>
                <p class="text-xs text-slate-400 mt-1 font-mono">${urlFilename}</p>
                <hr class="border-slate-600 my-2">
                <p><b>Time:</b> ${startTime.toFixed(3)}s - ${endTime.toFixed(
                    3
                )}s</p>
                <p><b>Duration:</b> ${duration.toFixed(3)}s</p>
                ${flagHtml}
                ${encryptionHtml}
            </div>`;
    } else if (data && data.trackInfo) {
        // ABR Ladder Chart Tooltip
        const { trackInfo } = data;
        tooltipContent = `
            <div class="text-left">
                <p class="font-bold text-slate-100">${seriesName}</p>
                <hr class="border-slate-600 my-2">
                <p><b>Bitrate:</b> ${formatBitrate(trackInfo.bandwidth)}</p>
                <p><b>Resolution:</b> ${trackInfo.width}x${trackInfo.height}</p>
            </div>`;
    }
    // --- END ENHANCED TOOLTIP LOGIC ---

    if (tooltipContent) {
        tooltipProxyEl.setAttribute(
            'data-tooltip-html-b64',
            btoa(tooltipContent)
        );
        tooltipProxyEl.removeAttribute('data-tooltip');
        tooltipProxyEl.removeAttribute('data-iso');

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

    if (container.clientWidth === 0 || container.clientHeight === 0) {
        requestAnimationFrame(() => renderChart(container, options, onClick));
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

    // --- PERFORMANCE FIX: Use intelligent merging instead of full redraw ---
    // The default behavior (`notMerge: false`) allows ECharts to perform an
    // efficient diff and only update the parts of the chart that have changed,
    // which is critical for performance with frequent data updates.
    chart.setOption(options, { notMerge: false });
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
