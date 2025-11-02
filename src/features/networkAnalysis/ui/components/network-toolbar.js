import { html } from 'lit-html';
import { useNetworkStore, networkActions } from '@/state/networkStore';
import { connectedTabBar } from '@/ui/components/tabs';

export const networkToolbarTemplate = () => {
    const { filters } = useNetworkStore.getState();
    const activeFilter = filters.type;

    const tabs = [
        { key: 'all', label: 'All' },
        { key: 'manifest', label: 'Manifest' },
        { key: 'video', label: 'Video' },
        { key: 'audio', label: 'Audio' },
        { key: 'text', label: 'Text' },
        { key: 'key', label: 'Key/License' },
        { key: 'other', label: 'Other' },
    ];

    return html`
        <div class="flex items-center justify-between mb-6 flex-wrap gap-4">
            ${connectedTabBar(tabs, activeFilter, (type) =>
                networkActions.setFilters({ type })
            )}
            <button
                @click=${() => networkActions.clearEvents()}
                class="px-3 py-1.5 text-sm font-semibold rounded-md transition-colors bg-red-800 hover:bg-red-700 text-red-200"
            >
                Clear Log
            </button>
        </div>
    `;
};