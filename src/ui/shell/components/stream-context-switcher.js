import { html } from 'lit-html';
import { analysisActions } from '@/state/analysisStore';
import { toggleDropdown, closeDropdown } from '@/ui/services/dropdownService';

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

    return html`
        <div
            class="${baseClasses} ${hoverClasses} ${isActive
                ? activeClasses
                : ''}"
            data-stream-id="${stream.id}"
        >
            <span
                class="font-semibold text-gray-200 truncate"
                title="${stream.name}"
                >${stream.name}</span
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

    const panelTemplate = html`
        <div
            class="dropdown-panel bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-[60vh] w-full min-w-[20rem] overflow-y-auto"
            @click=${handleSelect}
        >
            <div class="p-3">
                <div
                    class="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2"
                >
                    ${streams.map((stream) =>
                        renderStreamContextCard(stream, activeStreamId)
                    )}
                </div>
            </div>
        </div>
    `;

    return html`
        <div class="relative w-full sm:w-auto">
            <button
                @click=${(e) => toggleDropdown(e.currentTarget, panelTemplate)}
                class="bg-gray-800/50 hover:bg-gray-700/50 text-white rounded-md border border-gray-600/50 p-2 w-full min-w-[200px] text-left flex items-center justify-between transition-colors"
            >
                <span class="truncate"
                    >${getActiveStreamLabel(streams, activeStreamId)}</span
                >
                <svg
                    class="w-5 h-5 ml-2 text-gray-400 shrink-0"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path
                        fill-rule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clip-rule="evenodd"
                    />
                </svg>
            </button>
        </div>
    `;
};
