import { networkActions } from '@/state/networkStore';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const TYPE_COLORS = {
    manifest: {
        text: 'text-purple-400',
        bg: 'bg-purple-500',
        border: 'border-purple-500/30',
    },
    video: {
        text: 'text-blue-400',
        bg: 'bg-blue-500',
        border: 'border-blue-500/30',
    },
    audio: {
        text: 'text-violet-400',
        bg: 'bg-violet-500',
        border: 'border-violet-500/30',
    },
    text: {
        text: 'text-emerald-400',
        bg: 'bg-emerald-500',
        border: 'border-emerald-500/30',
    },
    init: {
        text: 'text-yellow-400',
        bg: 'bg-yellow-500',
        border: 'border-yellow-500/30',
    },
    key: {
        text: 'text-orange-400',
        bg: 'bg-orange-500',
        border: 'border-orange-500/30',
    },
    license: {
        text: 'text-red-400',
        bg: 'bg-red-500',
        border: 'border-red-500/30',
    },
    other: {
        text: 'text-slate-400',
        bg: 'bg-slate-500',
        border: 'border-slate-500/30',
    },
};

const formatSize = (bytes) => {
    if (bytes === null || bytes === undefined) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getStatusIcon = (status, auditStatus) => {
    if (status >= 400)
        return html`<span class="text-red-500 font-bold flex items-center gap-1"
            >${icons.xCircle} ${status}</span
        >`;

    if (auditStatus === 'error')
        return html`<span
            class="text-red-400 font-bold flex items-center gap-1"
            title="Critical Header Issue"
            >${icons.alertTriangle} ${status}</span
        >`;
    if (auditStatus === 'warn')
        return html`<span
            class="text-amber-400 font-bold flex items-center gap-1"
            title="Header Warning"
            >${icons.info} ${status}</span
        >`;

    return html`<span class="text-slate-400">${status}</span>`;
};

export const waterfallRowTemplate = (event, isSelected) => {
    const colors = TYPE_COLORS[event.resourceType] || TYPE_COLORS.other;

    const rowClasses = isSelected
        ? 'bg-blue-900/40 border-l-2 border-blue-500'
        : 'hover:bg-white/[0.02] border-l-2 border-transparent';

    const fileName = new URL(event.url).pathname.split('/').pop() || event.url;
    const timeLabel = `${event.timing.duration.toFixed(0)}ms`;

    return html`
        <div
            class="group flex items-center text-xs border-b border-slate-800/50 h-8 cursor-pointer transition-colors ${rowClasses}"
            @click=${() => networkActions.setSelectedEventId(event.id)}
        >
            <!-- Name Column -->
            <div
                class="w-[250px] px-3 flex items-center gap-2 shrink-0 border-r border-slate-800/50 overflow-hidden"
            >
                <span class="${colors.text} shrink-0 scale-75"
                    >${icons.fileText}</span
                >
                <span
                    class="truncate font-medium text-slate-300"
                    title="${event.url}"
                    >${fileName}</span
                >
            </div>

            <!-- Status Column -->
            <div
                class="w-[60px] px-2 shrink-0 border-r border-slate-800/50 flex items-center justify-center"
            >
                ${getStatusIcon(event.response.status, event.auditStatus)}
            </div>

            <!-- Type Column -->
            <div
                class="w-[80px] px-2 shrink-0 border-r border-slate-800/50 flex items-center justify-center"
            >
                <span
                    class="${colors.text} bg-${colors.text.split(
                        '-'
                    )[1]}-950/30 px-1.5 py-0.5 rounded text-[10px] border ${colors.border}"
                >
                    ${event.resourceType}
                </span>
            </div>

            <!-- Size Column -->
            <div
                class="w-[80px] px-2 shrink-0 border-r border-slate-800/50 text-right text-slate-400 font-mono"
            >
                ${formatSize(event.size)}
            </div>

            <!-- Time Column (Waterfall) -->
            <div
                class="grow relative px-2 h-full flex items-center overflow-hidden"
            >
                <div
                    class="absolute h-3 rounded-sm flex overflow-hidden"
                    style="left: ${event.visuals.left}; width: ${event.visuals
                        .width}; min-width: 2px;"
                >
                    <!-- TTFB (Waiting) -->
                    <div
                        class="h-full ${colors.bg}"
                        style="width: ${event.visuals.ttfbWidth}; opacity: 0.3;"
                    ></div>

                    <!-- Download -->
                    <div
                        class="h-full ${colors.bg}"
                        style="width: ${event.visuals
                            .downloadWidth}; opacity: 0.9;"
                    ></div>
                </div>

                <!-- Time Label (Floating right of bar if space permits, otherwise hide) -->
                <span
                    class="absolute text-[10px] text-slate-500 ml-1 pointer-events-none"
                    style="left: calc(${event.visuals.left} + ${event.visuals
                        .width});"
                >
                    ${timeLabel}
                </span>
            </div>
        </div>
    `;
};
