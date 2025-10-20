import { html } from 'lit-html';
import { useNetworkStore, networkActions } from '@/state/networkStore';

const filterButton = (label, type) => {
    const { filters } = useNetworkStore.getState();
    const isActive = filters.type === type;
    const activeClasses = 'bg-blue-600 text-white';
    const inactiveClasses = 'bg-gray-700 hover:bg-gray-600 text-gray-300';

    return html`
        <button
            @click=${() => networkActions.setFilters({ type })}
            class="px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${isActive
                ? activeClasses
                : inactiveClasses}"
        >
            ${label}
        </button>
    `;
};

export const networkToolbarTemplate = () => {
    return html`
        <div class="flex items-center gap-2 mb-4 p-2 bg-gray-900/50 rounded-lg">
            ${filterButton('All', 'all')}
            ${filterButton('Manifest', 'manifest')}
            ${filterButton('Video', 'video')} ${filterButton('Audio', 'audio')}
            ${filterButton('Text', 'text')}
            ${filterButton('Key/License', 'key')}
            ${filterButton('Other', 'other')}
            <div class="grow"></div>
            <button
                @click=${() => networkActions.clearEvents()}
                class="px-3 py-1.5 text-sm font-semibold rounded-md transition-colors bg-red-800 hover:bg-red-700 text-red-200"
            >
                Clear Log
            </button>
        </div>
    `;
};
