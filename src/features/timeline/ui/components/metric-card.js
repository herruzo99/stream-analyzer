import { html } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map.js';
import * as icons from '@/ui/icons';

/**
 * Renders a single, compact metric for the timeline.
 * @param {object} metric
 * @param {import('@/types').TimedEntity | null} hoveredItem
 * @param {import('@/types').TimedEntity | null} selectedItem
 * @returns {import('lit-html').TemplateResult}
 */
export const metricCardTemplate = (metric, hoveredItem, selectedItem) => {
    const valueStr = metric.value?.toString() || '';
    const isValueNA =
        typeof metric.value !== 'number' &&
        (metric.value === 'N/A' ||
            valueStr.startsWith('N/A') ||
            valueStr.endsWith('only') ||
            valueStr.startsWith('See '));

    const valueClasses = {
        'text-lg font-bold font-mono shrink-0': true,
        'text-cyan-400': !isValueNA,
        'text-slate-500': isValueNA,
    };

    const activeItem = selectedItem || hoveredItem;
    const isHighlighted =
        activeItem && metric.relatesTo.includes(activeItem.type);

    const tooltipHtml = `
        <div class="text-left max-w-xs">
            <p class="font-bold text-slate-100">${metric.name}</p>
            <p class="text-xs text-slate-400 mt-1">${metric.purpose}</p>
            ${metric.warning ? `<div class="mt-2 p-2 bg-yellow-900/30 rounded-md border border-yellow-700/50"><p class="text-xs text-yellow-300">${metric.warning.text}</p></div>` : ''}
            <hr class="border-slate-600 my-2">
            <p class="text-xs text-slate-500 font-mono">${metric.tech}: ${metric.tag}</p>
        </div>
    `;
    const b64Tooltip = btoa(tooltipHtml);

    const cardClasses = {
        'bg-slate-800/50': true,
        'p-2': true, // Reduced padding for compactness
        'rounded-lg': true,
        border: true,
        'transition-all': true,
        'duration-200': true,
        'border-slate-700': !isHighlighted,
        'border-amber-500': isHighlighted && !selectedItem, // Hover highlight
        'ring-2': isHighlighted && !!selectedItem, // Select highlight
        'ring-amber-400': isHighlighted && !!selectedItem,
        'cursor-help': true,
    };

    const warningIcon = metric.warning
        ? html`<span class="text-yellow-400 ml-1 shrink-0"
              >${icons.alertTriangle}</span
          >`
        : '';

    return html`
        <div class=${classMap(cardClasses)} data-tooltip-html-b64=${b64Tooltip}>
            <div class="flex justify-between items-center gap-4 min-w-0">
                <h5
                    class="font-semibold text-slate-200 flex items-center min-w-0"
                >
                    <span class="truncate" title=${metric.name}
                        >${metric.name}</span
                    >
                    ${warningIcon}
                </h5>
                <span
                    class="${classMap(valueClasses)} truncate"
                    title=${metric.value}
                    >${metric.value}</span
                >
            </div>
        </div>
    `;
};
