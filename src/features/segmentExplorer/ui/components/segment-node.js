import * as icons from '@/ui/icons';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { html } from 'lit-html';

// --- Icons ---
const WARNING_ICON = html`<span class="text-amber-400 scale-90"
    >${icons.alertTriangle}</span
>`;
const ERROR_ICON = html`<span
    class="text-red-400 opacity-80 scale-90"
    >${icons.xCircle}</span
>`;
const DOWNLOAD_ICON = html`<span
    class="text-slate-400 opacity-60 scale-90"
    >${icons.download}</span
>`;
const GAP_ICON = html`<span
    class="text-slate-400 opacity-50 scale-75"
    >${icons.eyeOff}</span
>`;
const GONE_ICON = html`<span
    class="text-slate-400 opacity-60 scale-75"
    >${icons.trash}</span
>`;
const STALE_ICON = html`<span
    class="text-amber-400 opacity-50 scale-75"
    >${icons.history}</span
>`;

function getVisualStyle(state, activeThemeId = 'glass') {
    const {
        isLoaded,
        isLoading,
        isError,
        isGone,
        isStale,
        hasParsedData,
        isGap,
        hasDrift,
        isSelected,
        isInspected,
    } = state;

    let style = {
        bg: 'bg-slate-900',
        border: 'border-slate-700',
        text: 'text-slate-400',
        opacity: 'opacity-100',
        indicator: null,
        labelColor: 'text-slate-400',
        statusBarColor: null, // New field for the top bar
        hover: 'hover:border-slate-800',
    };

    const isSolid = activeThemeId === 'pro-compact';

    if (isGap) {
        style.bg = isSolid ? 'bg-slate-800' : 'bg-slate-800';
        style.border = 'border-slate-700 border-dashed';
        style.text = 'text-slate-400';
        style.indicator = GAP_ICON;
        return style;
    }

    if (isGone) {
        style.bg = isSolid ? 'bg-slate-800' : 'bg-slate-800';
        style.border = 'border-slate-700 border-dotted';
        style.text = 'text-slate-400';
        style.opacity = 'opacity-50';
        style.indicator = GONE_ICON;
        style.labelColor = 'text-slate-400 line-through';
        return style;
    }

    if (isError) {
        style.bg = isSolid ? 'bg-slate-800' : 'bg-slate-800';
        style.border = 'border-red-500';
        style.text = 'text-red-400';
        style.indicator = ERROR_ICON;
        style.statusBarColor = 'bg-red-500';
        return style;
    }

    if (isLoading) {
        style.bg = 'bg-slate-700';
        style.border = 'border-blue-500 border-opacity-30';
        style.text = 'text-blue-400';
        style.statusBarColor = 'bg-blue-500 animate-pulse';
        return style;
    }

    if (isLoaded) {
        style.bg = isSolid ? 'bg-slate-800' : 'bg-slate-800 shadow-sm backdrop-blur-sm';
        style.text = 'text-slate-100';
        style.hover = 'hover:border-slate-400';

        if (isStale) {
            style.border = 'border-amber-500';
            style.statusBarColor = 'bg-amber-500';
            style.labelColor = 'text-slate-400';
        } else {
            style.border = isSolid ? 'border-slate-800' : 'border-black/5'; // Minimal border for glass
            style.statusBarColor = 'bg-emerald-500';
            style.labelColor = 'text-slate-100 font-bold';
        }

        if (hasParsedData) {
            // style.indicator = PROCESSED_ICON; // Removed for cleaner look in Mini-Card, or could be a small dot
        }
    } else {
        // Unloaded
        style.bg = isSolid ? 'bg-slate-800' : 'bg-slate-800';
        style.text = 'text-slate-400';

        if (isStale) {
            style.opacity = 'opacity-80';
            style.indicator = STALE_ICON;
            style.border = 'border-slate-700';
        } else {
            // "Empty / Waiting" state
            // Solid: Use Panel color to make it look like an empty slot/card
            // Glass: Use dark transparent black + blur for "frosted" look
            style.bg = isSolid ? 'bg-slate-800' : 'bg-black/20 backdrop-blur-[2px]';

            // Border: Use clearer border color
            style.border = isSolid
                ? 'border-slate-800 border-dashed'
                : 'border-slate-300 border-dashed border-opacity-30';

            style.hover = 'hover:border-blue-500 hover:bg-slate-700 transition-colors duration-200';
            style.opacity = isSolid ? 'opacity-100' : 'opacity-100'; // Full opacity for visibility

            style.indicator = DOWNLOAD_ICON;
            style.labelColor = 'text-slate-400 opacity-70';
        }
    }

    if (isInspected) {
        style.bg = isSolid ? 'bg-slate-800' : 'bg-slate-800';
        style.border = 'border-slate-200';
        style.text = 'text-slate-200';
        style.opacity = 'opacity-100';
    } else if (isSelected) {
        style.bg = 'bg-slate-700';
        style.border = 'border-purple-500';
        style.text = 'text-purple-300';
        style.opacity = 'opacity-100';
        style.statusBarColor = 'bg-purple-500'; // Purple comparison line
    }

    if (hasDrift && isLoaded && !isError && !isGone) {
        style.indicator = WARNING_ICON;
    }

    return style;
}

/**
 * Renders a segment node for the timeline.
 * @param {object} props
 * @param {any} props.segment
 * @param {string} [props.customLabel]
 * @param {number} [props.baselineDuration]
 * @param {boolean} [props.isSelected]
 * @param {boolean} [props.isInspected]
 * @param {number} [props.cacheStatus]
 * @param {boolean} [props.hasParsedData]
 * @param {boolean} [props.isStale]
 * @param {boolean} [props.isNew]
 * @param {(e: Event, segment: any) => void} [props.onClick]
 * @param {string} [props.activeThemeId]
 */
export const renderSegmentNode = ({
    segment,
    customLabel = null,
    baselineDuration = 0,
    isSelected = false,
    isInspected = false,
    cacheStatus = null,
    hasParsedData = false,
    isStale = false,
    isNew = false,
    onClick = null,
    activeThemeId = 'glass',
}) => {
    // Empty placeholder for missing segments
    if (!segment) {
        return html`
            <div
                class="w-full h-full rounded bg-transparent border border-slate-700 border-dotted flex items-center justify-center opacity-20 select-none shrink-0"
                title="Missing"
            >
            </div>
        `;
    }

    const duration = segment.timescale
        ? segment.duration / segment.timescale
        : 0;
    // Only check drift if baseline is provided
    const hasDrift =
        baselineDuration > 0 && Math.abs(duration - baselineDuration) > 0.1;

    const isGone =
        isStale &&
        (cacheStatus === 404 || cacheStatus === 410 || cacheStatus === 0);

    const isError =
        (cacheStatus === 0 || (cacheStatus !== null && cacheStatus >= 400)) &&
        !isGone;

    const state = {
        isLoaded: cacheStatus === 200,
        isLoading: cacheStatus === -1,
        isError,
        isGone,
        isStale,
        hasParsedData,
        isGap: segment.gap,
        hasDrift,
        isSelected,
        isInspected,
    };

    const style = getVisualStyle(state, activeThemeId);

    // Special Init/Sidx Overrides
    if (customLabel === 'INIT') {
        if (state.isLoaded) {
            style.statusBarColor = 'bg-purple-500';
            style.labelColor = 'text-purple-300 font-bold';
        }
    } else if (customLabel === 'IDX') {
        if (state.isLoaded) {
            style.statusBarColor = 'bg-teal-500';
        }
    }

    const flashClass = isNew ? 'flash-new-segment' : '';
    const pulseClass = state.isLoading ? 'animate-pulse' : '';

    const containerClass = `
        relative w-full h-full rounded flex flex-col overflow-hidden select-none box-border transition-all duration-100
        ${style.bg} ${style.border} ${style.text} ${style.opacity} ${style.hover} ${flashClass} ${pulseClass} ${tooltipTriggerClasses}
    `;

    const labelText = customLabel || segment.number.toString();

    // Tooltip generation logic
    let statusLabel = 'Not Loaded';
    let statusColor = 'text-slate-400';

    if (state.isLoading) {
        statusLabel = 'Loading...';
        statusColor = 'text-blue-400';
    } else if (state.isGone) {
        statusLabel =
            cacheStatus === 0 ? 'Gone (CORS/Net)' : `Gone (${cacheStatus})`;
        statusColor = 'text-slate-400 line-through';
    } else if (state.isError) {
        statusLabel =
            cacheStatus === 0 ? 'Network Error' : `Error ${cacheStatus}`;
        statusColor = 'text-red-400';
    } else if (state.isLoaded) {
        statusLabel = isStale ? 'Stale (Loaded)' : 'Fresh';
        statusColor = isStale
            ? 'text-amber-400'
            : 'text-emerald-400';
    } else if (isStale) {
        statusLabel = 'Stale (Unloaded)';
        statusColor = 'text-amber-400';
    }

    const tooltipData = `
        <div class="text-xs font-mono min-w-[180px]">
            <div class="flex justify-between items-center border-b border-slate-800 pb-1 mb-2">
                <span class="font-bold text-slate-200">${customLabel || `Segment #${segment.number}`
        }</span>
                 <div class="flex gap-2">
                     ${hasParsedData ? '<span class="text-[9px] bg-emerald-500 bg-opacity-10 text-emerald-400 px-1 rounded border border-emerald-500 border-opacity-30">PARSED</span>' : ''}
                     <span class="text-[10px] uppercase font-bold tracking-wider ${statusColor}">${statusLabel}</span>
                </div>
            </div>
            <div class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-slate-200">
                ${!customLabel ? `<span class="text-slate-400">Time:</span> <span>${(segment.time / (segment.timescale || 1)).toFixed(2)}s</span>` : ''}
                 ${duration > 0 ? `<span class="text-slate-400">Dur:</span> <span>${duration.toFixed(2)}s</span>` : ''}
            </div>
        </div>
    `;

    // --- MINI-CARD RENDER ---
    return html`
        <div
            class="${containerClass}"
            @click=${(e) => onClick && onClick(e, segment)}
            data-tooltip-html-b64=${btoa(tooltipData)}
        >
            <!-- Status Bar (Top) -->
            ${style.statusBarColor
            ? html`<div class="h-[2px] w-full shrink-0 ${style.statusBarColor}"></div>`
            : html`<div class="h-[2px] w-full shrink-0 bg-transparent"></div>`
        }

            <!-- Card Body -->
            <div class="grow relative flex flex-col p-0.5 min-w-0">
                <!-- Label (Top Left) -->
                <span class="text-[9px] font-mono leading-none z-10 truncate ${style.labelColor}">
                    ${labelText}
                </span>

                <!-- Action / State Icon (Bottom Right / Center) -->
                <!-- If Unloaded/Actionable, center it. If loaded, put indicator in corner or hidden -->
                <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                     ${state.isLoaded ? '' : style.indicator}
                </div>

                 <!-- Error/Warning Indicator (Corner) -->
                 ${(state.isError || hasDrift)
            ? html`<div class="absolute bottom-0 right-0 p-0.5">${style.indicator}</div>`
            : ''
        }
            </div>
        </div>
    `;
};
