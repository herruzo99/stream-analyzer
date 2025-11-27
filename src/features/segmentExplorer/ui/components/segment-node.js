import * as icons from '@/ui/icons';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { html } from 'lit-html';

const formatDuration = (d) =>
    d < 1 ? `${(d * 1000).toFixed(0)}ms` : `${d.toFixed(2)}s`;

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

/**
 * Determines the visual style configuration based on the segment's state.
 * @param {object} state - The normalized state of the segment.
 * @returns {object} Tailwind class strings and icons.
 */
function getVisualStyle(state) {
    const {
        isLoaded,
        isLoading,
        isError,
        isStale,
        hasParsedData,
        isGap,
        hasDrift,
        isSelected,
        isInspected,
    } = state;

    // Default: Not Loaded (Future/Ghost)
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

    if (isError) {
        style.bg = 'bg-red-900/40'; // More visible background for error
        style.border = 'border-red-500/50';
        style.text = 'text-red-300';
        style.indicator = ERROR_ICON;
        style.labelColor = 'text-red-300'; // Explicitly color the label
        return style;
    }

    if (isLoading) {
        style.bg = 'bg-blue-900/20';
        style.border = 'border-blue-500/50';
        style.text = 'text-blue-400';
        // Loading animation handled in main template
        return style;
    }

    if (isLoaded) {
        if (isStale) {
            // Stale Loaded
            style.bg = 'bg-amber-950/40';
            style.border = 'border-amber-900/60';
            style.text = 'text-amber-600';
            style.labelColor = 'text-amber-500/50';
        } else {
            // Fresh Loaded
            style.bg = 'bg-emerald-950/40';
            style.border = 'border-emerald-900/60';
            style.text = 'text-emerald-400';
            style.labelColor = 'text-emerald-500/50';
        }

        // Visual cues for parsed state
        if (hasParsedData) {
            // Strengthen border if parsed
            style.border = isStale
                ? 'border-amber-700/60'
                : 'border-emerald-700/60';
            style.indicator = PROCESSED_ICON;
        }
    } else {
        // Not Loaded
        if (isStale) {
            // Stale Not Loaded (Ghost of the past)
            style.bg = 'bg-slate-900/50';
            style.border = 'border-slate-800';
            style.text = 'text-slate-700';
            style.opacity = 'opacity-60';
        } else {
            // Fresh Not Loaded (Available to download)
            style.bg = 'bg-slate-800';
            style.border = 'border-slate-700';
            style.text = 'text-slate-400';
            style.indicator = DOWNLOAD_ICON;
        }
    }

    // Overrides for Interaction
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

    // Drift warning takes precedence as an additional indicator (unless error)
    if (hasDrift && isLoaded && !isError) {
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
    // --- Empty Slot (Missing sequence in timeline) ---
    if (!segment) {
        return html`
            <div
                class="w-10 h-12 m-0.5 rounded bg-slate-900/30 border border-slate-800/30 flex items-center justify-center opacity-30 select-none"
                title="Missing Sequence #${seqNumber}"
            >
                <span class="text-[8px] text-slate-600 font-mono">·</span>
            </div>
        `;
    }

    // --- State Determination ---
    const duration = segment.duration / segment.timescale;
    const diff = Math.abs(duration - baselineDuration);
    const percentDiff = baselineDuration > 0 ? diff / baselineDuration : 0;
    const hasDrift = percentDiff > 0.1;

    // Logic Update: Treat status 0 (network error) and >= 400 as errors
    const isError =
        cacheStatus === 0 || (cacheStatus !== null && cacheStatus >= 400);

    const state = {
        isLoaded: cacheStatus === 200,
        isLoading: cacheStatus === -1,
        isError,
        isStale,
        hasParsedData,
        isGap: segment.gap,
        hasDrift,
        isSelected,
        isInspected,
    };

    const style = getVisualStyle(state);

    // --- Animation & Interaction Classes ---
    const flashClass = isNew ? 'flash-new-segment' : '';
    const pulseClass = state.isLoading ? 'animate-pulse' : '';

    const containerClass = `
        relative w-10 h-12 m-0.5 rounded border transition-all duration-100 cursor-pointer overflow-hidden select-none
        ${style.bg} ${style.border} ${style.text} ${style.opacity} ${flashClass} ${pulseClass} ${tooltipTriggerClasses}
    `;

    // --- Tooltip Generation ---
    let statusLabel = 'Not Loaded';
    let statusColor = 'text-slate-400';

    if (state.isLoading) {
        statusLabel = 'Loading...';
        statusColor = 'text-blue-400';
    } else if (state.isError) {
        statusLabel =
            cacheStatus === 0 ? 'Network Error' : `Error ${cacheStatus}`;
        statusColor = 'text-red-400';
    } else if (state.isLoaded) {
        statusLabel = isStale ? 'Stale' : 'Fresh';
        statusColor = isStale ? 'text-amber-400' : 'text-emerald-400';
    }

    // Build detailed tooltip
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
                <span class="text-slate-500">Time:</span> <span>${formatDuration(segment.time / segment.timescale)}</span>
                <span class="text-slate-500">Dur:</span> <span>${formatDuration(duration)}</span>
                ${cacheStatus ? `<span class="text-slate-500">HTTP:</span> <span class="font-mono ${state.isError ? 'text-red-400' : 'text-emerald-400'}">${cacheStatus}</span>` : ''}
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
                class="flex flex-col items-center justify-center h-full py-1 pointer-events-none"
            >
                <!-- Top Indicator (Warning/Download/Parsed) -->
                <div class="h-3 flex items-center justify-center mb-0.5">
                    ${style.indicator}
                </div>

                <!-- Sequence Number -->
                <span
                    class="text-[9px] font-mono font-bold leading-none tracking-tighter ${style.labelColor ||
                    style.text}"
                >
                    #${segment.number % 1000}
                </span>
            </div>
        </div>
    `;
};
