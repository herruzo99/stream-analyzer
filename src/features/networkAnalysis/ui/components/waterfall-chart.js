import { html } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map.js';
import { useNetworkStore, networkActions } from '@/state/networkStore';
import { formatBitrate } from '@/ui/shared/format';

const getStatusColor = (status) => {
    if (status >= 500) return 'text-red-400';
    if (status >= 400) return 'text-yellow-400';
    if (status >= 300) return 'text-blue-400';
    return 'text-green-400';
};

const resourceTypeClasses = {
    manifest: 'border-purple-500',
    video: 'border-blue-500',
    audio: 'border-cyan-500',
    text: 'border-green-500',
    init: 'border-yellow-500',
    key: 'border-orange-500',
    license: 'border-red-500',
    other: 'border-gray-500',
};

const timingBar = (breakdown, totalDuration) => {
    if (!breakdown || totalDuration === 0) {
        return html`<div class="w-full h-full bg-gray-600 rounded"></div>`;
    }

    const segments = [
        { name: 'DNS', duration: breakdown.dns, class: 'bg-teal-500' },
        { name: 'TCP', duration: breakdown.tcp, class: 'bg-orange-500' },
        { name: 'TLS', duration: breakdown.tls, class: 'bg-purple-500' },
        { name: 'TTFB', duration: breakdown.ttfb, class: 'bg-green-500' },
        {
            name: 'Download',
            duration: breakdown.download,
            class: 'bg-blue-500',
        },
    ];

    return html`
        ${segments.map((segment) => {
            if (segment.duration <= 0) return '';
            const width = (segment.duration / totalDuration) * 100;
            return html` <div
                class="${segment.class}"
                style="width: ${width}%"
                title="${segment.name}: ${segment.duration.toFixed(2)} ms"
            ></div>`;
        })}
    `;
};

const renderDownloadRatio = (ratio) => {
    if (ratio === null) return '';
    const color = ratio >= 1 ? 'text-green-400' : 'text-yellow-400';
    return html`<span
        class="${color}"
        title="Download Ratio (Media Duration / Download Duration)"
        >${ratio.toFixed(2)}x</span
    >`;
};

const rowTemplate = (event, timelineStart, timelineDuration) => {
    const { selectedEventId } = useNetworkStore.getState();
    const isActive = event.id === selectedEventId;

    const rowClasses = {
        grid: true,
        'grid-cols-[minmax(200px,25%)_1fr_120px]': true, // Corrected grid layout
        'items-center': true,
        'gap-x-4': true,
        'text-xs': true,
        'border-b': true,
        'border-gray-700/50': true,
        'cursor-pointer': true,
        'hover:bg-gray-700/50': true,
        'bg-blue-900/30': isActive,
    };

    const left =
        timelineDuration > 0
            ? ((event.timing.startTime - timelineStart) / timelineDuration) *
              100
            : 0;
    const width =
        timelineDuration > 0
            ? (event.timing.duration / timelineDuration) * 100
            : 0;

    return html`
        <div
            class=${classMap(rowClasses)}
            @click=${() => networkActions.setSelectedEventId(event.id)}
        >
            <div
                class="p-2 flex items-center gap-2 truncate border-l-4 ${resourceTypeClasses[
                    event.resourceType
                ]}"
            >
                <span class="font-bold ${getStatusColor(event.response.status)}"
                    >${event.response.status}</span
                >
                <span
                    class="font-mono text-gray-300 truncate"
                    title=${event.url}
                    >${new URL(event.url).pathname.split('/').pop() ||
                    event.url}</span
                >
            </div>
            <div class="p-2 relative h-6">
                <div
                    class="absolute h-full bg-gray-600/30 rounded"
                    style="left: ${left}%; width: ${Math.max(0.1, width)}%;"
                >
                    <div
                        class="w-full h-full flex items-center rounded overflow-hidden"
                    >
                        ${timingBar(
                            event.timing.breakdown,
                            event.timing.duration
                        )}
                    </div>
                </div>
            </div>
            <div class="p-2 font-mono flex items-center justify-end gap-4">
                <span>${renderDownloadRatio(event.downloadRatio)}</span>
                <span class="text-gray-400"
                    >${event.timing.duration.toFixed(0)} ms</span
                >
            </div>
        </div>
    `;
};

export const waterfallChartTemplate = (events, timeline) => {
    if (events.length === 0) {
        return html`<div
            class="h-48 bg-gray-800 rounded-lg flex items-center justify-center text-gray-500"
        >
            No network requests to display.
        </div>`;
    }

    const { start: timelineStart, duration: timelineDuration } = timeline;

    return html`
        <div
            class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden"
        >
            <!-- Header -->
            <div
                class="grid grid-cols-[minmax(200px,25%)_1fr_120px] items-center gap-x-4 text-xs font-bold text-gray-400 bg-gray-900/50 border-b border-gray-700"
            >
                <div class="p-2">Request</div>
                <div class="p-2">Waterfall</div>
                <div class="p-2 text-right">Duration</div>
            </div>
            <!-- Body -->
            <div class="max-h-[60vh] overflow-y-auto">
                ${events.map((event) =>
                    rowTemplate(event, timelineStart, timelineDuration)
                )}
            </div>
        </div>
    `;
};
