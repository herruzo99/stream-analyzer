import * as icons from '@/ui/icons';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { html } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map.js';

/**
 * Safely encodes a UTF-8 string to Base64.
 * Standard btoa() throws on Unicode characters.
 */
const safeBtoa = (str) => {
    return btoa(
        encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) =>
            String.fromCharCode(parseInt(p1, 16))
        )
    );
};

/**
 * Renders a single, compact metric for the timeline with rich tooltips.
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
            !metric.value ||
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
        activeItem &&
        metric.relatesTo &&
        metric.relatesTo.includes(activeItem.type);

    // --- Rich Tooltip Construction ---
    const tooltipHtml = `
        <div class="text-left min-w-[220px]">
            <div class="font-bold text-white text-sm mb-1 border-b border-slate-600 pb-1 flex items-center gap-2">
                ${metric.name}
            </div>
            <div class="text-xs text-slate-300 leading-relaxed mb-2">
                ${metric.description || metric.purpose || 'No description available.'}
            </div>
            ${
                metric.warning
                    ? `<div class="mb-2 p-2 bg-yellow-900/30 rounded border border-yellow-700/50 flex gap-2 items-start">
                        <span class="text-yellow-400 text-[10px]">⚠️</span>
                        <p class="text-xs text-yellow-200">${metric.warning.text}</p>
                       </div>`
                    : ''
            }
            ${
                metric.technical
                    ? `<div class="text-[10px] font-mono text-blue-200 bg-blue-900/20 p-1.5 rounded border border-blue-500/20 break-all">
                       ${metric.technical}
                   </div>`
                    : `<div class="text-[10px] font-mono text-slate-500 mt-1">
                       ${metric.tech || 'Standard'}: ${metric.tag || 'N/A'}
                   </div>`
            }
        </div>
    `;
    const b64Tooltip = safeBtoa(tooltipHtml);

    const cardClasses = {
        'bg-slate-800/50': true,
        'p-3': true,
        'rounded-lg': true,
        border: true,
        'transition-all': true,
        'duration-200': true,
        'border-slate-700': !isHighlighted,
        'border-amber-500': isHighlighted && !selectedItem, // Hover highlight
        'ring-2': isHighlighted && !!selectedItem, // Select highlight
        'ring-amber-400': isHighlighted && !!selectedItem,
        [tooltipTriggerClasses]: true,
        'hover:bg-slate-800': true,
    };

    const warningIcon = metric.warning
        ? html`<span class="text-yellow-400 ml-1 shrink-0 scale-75"
              >${icons.alertTriangle}</span
          >`
        : '';

    return html`
        <div class=${classMap(cardClasses)} data-tooltip-html-b64=${b64Tooltip}>
            <div class="flex justify-between items-start gap-3 min-w-0">
                <div class="flex flex-col min-w-0">
                    <h5
                        class="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 mb-0.5"
                    >
                        <span class="truncate" title=${metric.name}
                            >${metric.name}</span
                        >
                        ${warningIcon}
                    </h5>
                    <span
                        class="${classMap(valueClasses)} truncate"
                        title=${metric.value}
                    >
                        ${metric.value}<span
                            class="text-xs text-slate-600 ml-0.5 font-sans font-normal"
                            >${metric.unit}</span
                        >
                    </span>
                </div>
                <div class="text-slate-600 opacity-50 scale-90">
                    ${icons[metric.icon] || icons.activity}
                </div>
            </div>
        </div>
    `;
};
