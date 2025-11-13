import { html } from 'lit-html';
import { analysisActions } from '@/state/analysisStore';
import { toggleDropdown, closeDropdown } from '@/ui/services/dropdownService';
import * as icons from '@/ui/icons';

const getBadge = (text, colorClasses) => html`
    <span class="text-xs font-semibold px-2 py-1 rounded-full ${colorClasses}"
        >${text}</span
    >
`;

const renderStreamContextCard = (stream, activeStreamId) => {
    const isActive = stream.id === activeStreamId;
    const activeClasses = 'bg-blue-800 border-blue-600 ring-2 ring-blue-500';
    const baseClasses =
        'bg-gray-900/50 p-3 rounded-lg border border-gray-700 cursor-pointer transition-all duration-150 ease-in-out flex flex-col items-start';
    const hoverClasses =
        'hover:bg-gray-700 hover:border-gray-500 hover:scale-[1.03]';

    const protocolBadge =
        stream.protocol === 'dash'
            ? getBadge('DASH', 'bg-blue-800 text-blue-200')
            : getBadge('HLS', 'bg-purple-800 text-purple-200');

    const typeBadge =
        stream.manifest?.type === 'dynamic'
            ? getBadge('LIVE', 'bg-red-800 text-red-200')
            : getBadge('VOD', 'bg-green-800 text-green-200');

    const path = stream.originalUrl
        ? new URL(stream.originalUrl).pathname
        : stream.name;

    return html`
        <div
            class="${baseClasses} ${hoverClasses} ${isActive
                ? activeClasses
                : ''}"
            data-stream-id="${stream.id}"
        >
            <span
                class="font-semibold text-gray-200 truncate w-full"
                title="${stream.name}"
                >${stream.name}</span
            >
            <span
                class="text-xs text-gray-400 font-mono truncate w-full mt-1"
                title="${path}"
                >${path}</span
            >
            <div class="shrink-0 flex flex-wrap items-center gap-2 mt-2">
                ${protocolBadge} ${typeBadge}
            </div>
        </div>
    `;
};

const getActiveStreamLabel = (streams, activeStreamId) => {
    const activeStream = streams.find((s) => s.id === activeStreamId);
    if (!activeStream) return 'Select Stream...';
    return activeStream.name;
};

export const streamContextSwitcherTemplate = (streams, activeStreamId) => {
    if (streams.length <= 1) {
        return html``;
    }

    const handleSelect = (e) => {
        const item = e.target.closest('[data-stream-id]');
        if (!item) return;

        const streamId = parseInt(item.dataset.streamId, 10);
        analysisActions.setActiveStreamId(streamId);
        closeDropdown();
    };

    const panelTemplate = () => html`
        <div
            class="dropdown-panel bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-[60vh] w-full min-w-[20rem] max-w-5xl overflow-y-auto"
            @click=${handleSelect}
        >
            <div class="p-3">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    ${streams.map((stream) =>
                        renderStreamContextCard(stream, activeStreamId)
                    )}
                </div>
            </div>
        </div>
    `;

    return html`
        <div
            class="space-y-2 border-t border-slate-700/50 pt-3 relative w-full overflow-hidden"
        >
            <button
                @click=${(e) =>
                    toggleDropdown(e.currentTarget, panelTemplate, e)}
                class="bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-md p-2 w-full text-left flex items-center justify-between transition-colors"
            >
                <span class="truncate min-w-0"
                    >${getActiveStreamLabel(streams, activeStreamId)}</span
                >
                <span class="text-gray-400 shrink-0">${icons.chevronDown}</span>
            </button>
        </div>
    `;
};