import { html } from 'lit-html';
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

const formatSize = (bytes) => {
    if (bytes === null || bytes === undefined) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(2)} KB`;
};

const rowTemplate = (event, timelineStart, timelineDuration) => {
    const { selectedEventId } = useNetworkStore.getState();
    const isActive = event.id === selectedEventId;

    const cellBaseClasses =
        'p-2 text-xs border-b border-gray-700/50 group-hover:bg-gray-700/50 whitespace-nowrap';
    const activeCellClasses = isActive ? 'bg-blue-900/30' : '';

    return html`
        <div
            class="group contents"
            @click=${() => networkActions.setSelectedEventId(event.id)}
        >
            <div
                class="${cellBaseClasses} ${activeCellClasses} flex items-center gap-2 truncate border-l-4 ${resourceTypeClasses[
                    event.resourceType
                ]} min-w-0"
            >
                <span
                    class="font-mono text-gray-300 truncate"
                    title=${event.url}
                    >${new URL(event.url).pathname.split('/').pop() ||
                    event.url}</span
                >
            </div>
            <div
                class="${cellBaseClasses} ${activeCellClasses} font-mono ${getStatusColor(
                    event.response.status
                )}"
            >
                ${event.response.status}
            </div>
            <div class="${cellBaseClasses} ${activeCellClasses} truncate">
                ${event.resourceType}
            </div>
            <div
                class="${cellBaseClasses} ${activeCellClasses} font-mono text-right truncate"
            >
                ${formatSize(event.size)}
            </div>
            <div
                class="${cellBaseClasses} ${activeCellClasses} font-mono text-right truncate"
            >
                ${formatBitrate(event.throughput)}
            </div>
            <div
                class="${cellBaseClasses} ${activeCellClasses} font-mono text-right"
            >
                ${event.timing.duration.toFixed(0)}ms
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
        <style>
            .grid-waterfall {
                display: grid;
                grid-template-columns: minmax(
                        200px,
                        1fr
                    ) 60px 80px 80px 100px 80px;
            }
        </style>
        <div
            class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden"
        >
            <div class="max-h-[60vh] overflow-y-auto">
                <div class="grid-waterfall sticky top-0 z-10">
                    <!-- Header -->
                    <div
                        class="p-2 text-xs font-bold text-gray-400 bg-gray-900 border-b border-gray-700 whitespace-nowrap"
                    >
                        Name
                    </div>
                    <div
                        class="p-2 text-xs font-bold text-gray-400 bg-gray-900 border-b border-gray-700 whitespace-nowrap"
                    >
                        Status
                    </div>
                    <div
                        class="p-2 text-xs font-bold text-gray-400 bg-gray-900 border-b border-gray-700 whitespace-nowrap"
                    >
                        Type
                    </div>
                    <div
                        class="p-2 text-xs font-bold text-gray-400 bg-gray-900 border-b border-gray-700 text-right whitespace-nowrap"
                    >
                        Size
                    </div>
                    <div
                        class="p-2 text-xs font-bold text-gray-400 bg-gray-900 border-b border-gray-700 text-right whitespace-nowrap"
                    >
                        Throughput
                    </div>
                    <div
                        class="p-2 text-xs font-bold text-gray-400 bg-gray-900 border-b border-gray-700 text-right whitespace-nowrap"
                    >
                        Time
                    </div>
                    <!-- Rows -->
                    ${events.map((event) =>
                        rowTemplate(event, timelineStart, timelineDuration)
                    )}
                </div>
            </div>
        </div>
    `;
};
