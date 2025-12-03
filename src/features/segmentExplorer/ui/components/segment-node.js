import * as icons from '@/ui/icons';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { html } from 'lit-html';

// --- Icons ---
const WARNING_ICON = html`<span class="text-yellow-400"
    >${icons.alertTriangle}</span
>`;
const ERROR_ICON = html`<span class="text-red-200 scale-75"
    >${icons.xCircle}</span
>`;
const DOWNLOAD_ICON = html`<span class="text-slate-500 opacity-50 scale-75"
    >${icons.download}</span
>`;
const PROCESSED_ICON = html`<div
    class="w-1 h-1 rounded-full bg-white/50 shadow-sm"
></div>`;
const GAP_ICON = html`<span class="text-slate-500 opacity-50 scale-75"
    >${icons.eyeOff}</span
>`;
const GONE_ICON = html`<span class="text-slate-600 opacity-60 scale-75"
    >${icons.trash}</span
>`;
const STALE_ICON = html`<span class="text-amber-700 opacity-50 scale-75"
    >${icons.history}</span
>`;

function getVisualStyle(state) {
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
        border: 'border-slate-800',
        text: 'text-slate-600',
        opacity: 'opacity-100',
        indicator: null,
        labelColor: 'text-slate-500',
    };

    if (isGap) {
        style.bg = 'bg-slate-950';
        style.border = 'border-slate-800 border-dashed';
        style.text = 'text-slate-700';
        style.indicator = GAP_ICON;
        return style;
    }

    if (isGone) {
        style.bg = 'bg-slate-950';
        style.border = 'border-slate-800 border-dotted';
        style.text = 'text-slate-600';
        style.opacity = 'opacity-50';
        style.indicator = GONE_ICON;
        style.labelColor = 'text-slate-700 line-through';
        return style;
    }

    if (isError) {
        style.bg = 'bg-red-900/40';
        style.border = 'border-red-500/50';
        style.text = 'text-red-300';
        style.indicator = ERROR_ICON;
        style.labelColor = 'text-red-300';
        return style;
    }

    if (isLoading) {
        style.bg = 'bg-blue-900/20';
        style.border = 'border-blue-500/50';
        style.text = 'text-blue-400';
        return style;
    }

    if (isLoaded) {
        if (isStale) {
            style.bg = 'bg-amber-950/40';
            style.border = 'border-amber-900/60';
            style.text = 'text-amber-600';
            style.labelColor = 'text-amber-500/50';
        } else {
            style.bg = 'bg-emerald-950/40';
            style.border = 'border-emerald-900/60';
            style.text = 'text-emerald-400';
            style.labelColor = 'text-emerald-500/50';
        }

        if (hasParsedData) {
            style.border = isStale
                ? 'border-amber-700/60'
                : 'border-emerald-700/60';
            style.indicator = PROCESSED_ICON;
        }
    } else {
        if (isStale) {
            style.bg = 'bg-slate-900/80';
            style.border = 'border-slate-800';
            style.text = 'text-slate-600';
            style.opacity = 'opacity-80';
            style.indicator = STALE_ICON;
            style.labelColor = 'text-slate-600';
        } else {
            style.bg = 'bg-slate-800';
            style.border = 'border-slate-700';
            style.text = 'text-slate-400';
            style.indicator = DOWNLOAD_ICON;
        }
    }

    if (isInspected) {
        style.bg = 'bg-white/10';
        style.border = 'border-white/80';
        style.text = 'text-white';
        style.opacity = 'opacity-100';
    } else if (isSelected) {
        style.bg = 'bg-purple-900/40';
        style.border = 'border-purple-500';
        style.text = 'text-purple-200';
        style.opacity = 'opacity-100';
    }

    if (hasDrift && isLoaded && !isError && !isGone) {
        style.indicator = WARNING_ICON;
    }

    return style;
}

export const renderSegmentNode = ({
    segment,
    seqNumber,
    baselineDuration,
    isSelected,
    isInspected,
    cacheStatus,
    hasParsedData,
    isStale,
    isNew,
    onClick,
}) => {
    // Empty placeholder for missing segments
    if (!segment) {
        return html`
            <div
                class="w-full h-full rounded bg-slate-900/30 border border-slate-800/30 flex items-center justify-center opacity-30 select-none shrink-0"
                title="Missing Sequence #${seqNumber}"
            >
                <span class="text-[8px] text-slate-600 font-mono">·</span>
            </div>
        `;
    }

    const duration = segment.duration / segment.timescale;
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

    const style = getVisualStyle(state);

    const flashClass = isNew ? 'flash-new-segment' : '';
    const pulseClass = state.isLoading ? 'animate-pulse' : '';

    // Changed: w-full h-full instead of fixed dimensions to fill the absolute container
    const containerClass = `
        relative w-full h-full rounded border transition-all duration-100 cursor-pointer overflow-hidden select-none
        ${style.bg} ${style.border} ${style.text} ${style.opacity} ${flashClass} ${pulseClass} ${tooltipTriggerClasses}
    `;

    let statusLabel = 'Not Loaded';
    let statusColor = 'text-slate-400';

    if (state.isLoading) {
        statusLabel = 'Loading...';
        statusColor = 'text-blue-400';
    } else if (state.isGone) {
        statusLabel =
            cacheStatus === 0 ? 'Gone (CORS/Net)' : `Gone (${cacheStatus})`;
        statusColor = 'text-slate-500 line-through';
    } else if (state.isError) {
        statusLabel =
            cacheStatus === 0 ? 'Network Error' : `Error ${cacheStatus}`;
        statusColor = 'text-red-400';
    } else if (state.isLoaded) {
        statusLabel = isStale ? 'Stale (Loaded)' : 'Fresh';
        statusColor = isStale ? 'text-amber-400' : 'text-emerald-400';
    } else if (isStale) {
        statusLabel = 'Stale (Unloaded)';
        statusColor = 'text-amber-600';
    }

    const tooltipData = `
        <div class="text-xs font-mono min-w-[180px]">
            <div class="flex justify-between items-center border-b border-white/10 pb-1 mb-2">
                <span class="font-bold text-white">Segment #${segment.number}</span>
                <div class="flex gap-2">
                     ${hasParsedData ? '<span class="text-[9px] bg-emerald-900/50 text-emerald-400 px-1 rounded border border-emerald-800">PARSED</span>' : ''}
                     <span class="text-[10px] uppercase font-bold tracking-wider ${statusColor}">${statusLabel}</span>
                </div>
            </div>
            <div class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-slate-300">
                <span class="text-slate-500">Time:</span> <span>${(segment.time / segment.timescale).toFixed(2)}s</span>
                <span class="text-slate-500">Dur:</span> <span>${duration.toFixed(2)}s</span>
                ${cacheStatus ? `<span class="text-slate-500">HTTP:</span> <span class="font-mono ${state.isError ? 'text-red-400' : state.isGone ? 'text-slate-500' : 'text-emerald-400'}">${cacheStatus}</span>` : ''}
            </div>
            ${segment.startTimeUTC ? `<div class="mt-2 pt-1 border-t border-slate-700 text-[10px] text-slate-500">UTC: ${new Date(segment.startTimeUTC).toLocaleTimeString()}</div>` : ''}
            ${isStale ? `<div class="mt-1 text-[9px] text-amber-500 italic">Outside DVR Window</div>` : ''}
        </div>
    `;

    return html`
        <div
            class="${containerClass}"
            @click=${(e) => onClick(e, segment)}
            data-tooltip-html-b64=${btoa(tooltipData)}
        >
            <div
                class="flex flex-col items-center justify-center h-full py-0.5 pointer-events-none overflow-hidden"
            >
                <div
                    class="h-2.5 flex items-center justify-center mb-0.5 scale-75"
                >
                    ${style.indicator}
                </div>
                <span
                    class="text-[9px] font-mono font-bold leading-none tracking-tighter truncate w-full text-center ${style.labelColor ||
                    style.text}"
                >
                    ${segment.number % 1000}
                </span>
            </div>
        </div>
    `;
};
