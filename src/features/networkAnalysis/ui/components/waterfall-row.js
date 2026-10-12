import { networkActions } from '@/state/networkStore';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';

// Per-resource hex colors (ported: was CSS var names --chart-1..8 with no
// definitions; hex keeps the same categorical palette, theme-free).
const getResourceColor = (type) => {
    switch (type) {
        case 'manifest':
            return '#3b82f6';
        case 'video':
            return '#10b981';
        case 'audio':
            return '#f59e0b';
        case 'text':
            return '#a855f7';
        case 'init':
            return '#64748b';
        case 'key':
            return '#f43f5e';
        case 'license':
            return '#06b6d4';
        default:
            return '#6b7280';
    }
};

const formatSize = (bytes) => {
    if (bytes === null || bytes === undefined) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getStatusIcon = (status, auditStatus) => {
    if (status >= 400)
        return html`<span
            class="text-red-400 font-bold flex items-center gap-1"
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

    return html`<span class="text-slate-400"
        >${status}</span
    >`;
};

export const waterfallRowTemplate = (event, isSelected) => {
    const colorVar = getResourceColor(event.resourceType);

    const rowClasses = isSelected
        ? 'bg-[#3b82f6] border-l-2 border-emerald-400/25'
        : 'hover:bg-white/10 border-l-2 border-transparent';

    const fileName = new URL(event.url).pathname.split('/').pop() || event.url;
    const timeLabel = `${event.timing.duration.toFixed(0)}ms`;

    // Visual bar segments
    const {
        redirectWidth,
        dnsWidth,
        tcpWidth,
        tlsWidth,
        ttfbWidth,
        downloadWidth,
        width,
        left,
    } = event.visuals;

    return html`
        <div
            class="group flex items-center text-xs border-b border-white/10 h-8 cursor-pointer transition-colors ${rowClasses}"
            @click=${() => networkActions.setSelectedEventId(event.id)}
        >
            <!-- Name Column -->
            <div
                class="w-[250px] px-3 flex items-center gap-2 shrink-0 border-r border-white/10 overflow-hidden"
            >
                <span class="shrink-0 scale-75" style="color: ${colorVar}"
                    >${icons.fileText}</span
                >
                <span
                    class="truncate font-medium text-slate-200"
                    title="${event.url}"
                    >${fileName}</span
                >
            </div>

            <!-- Status Column -->
            <div
                class="w-[60px] px-2 shrink-0 border-r border-white/10 flex items-center justify-center"
            >
                ${getStatusIcon(event.response.status, event.auditStatus)}
            </div>

            <!-- Type Column -->
            <div
                class="w-[80px] px-2 shrink-0 border-r border-white/10 flex items-center justify-center"
            >
                <span
                    class="px-1.5 py-0.5 rounded text-[10px] border"
                    style="
                        background-color: color-mix(in srgb, ${colorVar}, transparent 90%);
                        color: ${colorVar};
                        border-color: color-mix(in srgb, ${colorVar}, transparent 70%);
                    "
                >
                    ${event.resourceType}
                </span>
            </div>

            <!-- Size Column -->
            <div
                class="w-[80px] px-2 shrink-0 border-r border-white/10 text-right text-slate-400 font-mono"
            >
                ${formatSize(event.size)}
            </div>

            <!-- Time Column (Waterfall) -->
            <div
                class="grow relative px-2 h-full flex items-center overflow-hidden"
            >
                <div
                    class="absolute h-3 rounded-sm flex overflow-hidden"
                    style="left: ${left}; width: ${width}; min-width: 2px;"
                >
                    <!-- Redirect (Yellow -> Warning) -->
                    <div
                        class="h-full bg-amber-500"
                        style="width: ${redirectWidth}"
                        title="Redirect"
                    ></div>

                    <!-- DNS (Cyan -> Chart 9) -->
                    <div
                        class="h-full bg-cyan-500"
                        style="width: ${dnsWidth}"
                        title="DNS Lookup"
                    ></div>

                    <!-- TCP (Orange -> Chart 10) -->
                    <div
                        class="h-full bg-orange-500"
                        style="width: ${tcpWidth}"
                        title="TCP Connect"
                    ></div>

                    <!-- TLS (Pink -> Secondary Accent) -->
                    <div
                        class="h-full bg-white/5"
                        style="width: ${tlsWidth}"
                        title="TLS Handshake"
                    ></div>

                    <!-- TTFB (Purple -> Primary Accent) -->
                    <div
                        class="h-full bg-emerald-500/10 opacity-80"
                        style="width: ${ttfbWidth}"
                        title="Waiting (TTFB)"
                    ></div>

                    <!-- Download (Type Color) -->
                    <div
                        class="h-full"
                        style="width: ${downloadWidth}; opacity: 0.9; background-color: ${colorVar}"
                        title="Content Download"
                    ></div>
                </div>

                <!-- Time Label -->
                <span
                    class="absolute text-[10px] text-slate-400 ml-1 pointer-events-none"
                    style="left: calc(${left} + ${width});"
                >
                    ${timeLabel}
                </span>
            </div>
        </div>
    `;
};
