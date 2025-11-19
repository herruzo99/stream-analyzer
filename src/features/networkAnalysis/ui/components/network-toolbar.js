import { html } from 'lit-html';
import { useNetworkStore, networkActions } from '@/state/networkStore';
import { useAnalysisStore } from '@/state/analysisStore';
import { connectedTabBar } from '@/ui/components/tabs';
import {
    generateHar,
    downloadHar,
} from '../../domain/har-generator';
import * as icons from '@/ui/icons';

const streamFilterChecklistTemplate = (allStreams, visibleStreamIds) => {
    if (allStreams.length <= 1) return '';

    const handleSelectAll = () => {
        const allIds = allStreams.map((s) => s.id);
        networkActions.setVisibleStreamIds(allIds);
    };
    const handleDeselectAll = () => {
        networkActions.setVisibleStreamIds([]);
    };
    const isAllSelected = allStreams.every((s) => visibleStreamIds.has(s.id));

    return html`
        <div
            class="p-3 border-t border-b border-slate-700 bg-slate-800/30 flex items-center gap-4"
        >
            <span class="font-semibold text-sm text-slate-300 shrink-0"
                >Streams:</span
            >
            <div class="flex items-center gap-x-4 gap-y-2 flex-wrap grow">
                ${allStreams.map(
        (stream) => html`
                        <label
                            class="flex items-center gap-2 cursor-pointer text-sm text-slate-200"
                        >
                            <input
                                type="checkbox"
                                .checked=${visibleStreamIds.has(stream.id)}
                                @change=${() =>
                networkActions.toggleVisibleStreamId(
                    stream.id
                )}
                                class="h-4 w-4 rounded bg-slate-600 border-slate-500 text-blue-500 focus:ring-blue-600"
                            />
                            <span>${stream.name}</span>
                        </label>
                    `
    )}
            </div>
            <div class="shrink-0 flex items-center gap-2">
                <button
                    @click=${isAllSelected
            ? handleDeselectAll
            : handleSelectAll}
                    class="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                >
                    ${isAllSelected ? 'Deselect All' : 'Select All'}
                </button>
            </div>
        </div>
    `;
};

export const networkToolbarTemplate = () => {
    const { filters, visibleStreamIds } = useNetworkStore.getState();
    const { streams } = useAnalysisStore.getState();
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

    const handleExportHar = () => {
        const { events } = useNetworkStore.getState();
        const har = generateHar(events, streams);
        downloadHar(har, `stream-analyzer-${Date.now()}.har`);
    };

    return html`
        <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between flex-wrap gap-4">
                ${connectedTabBar(tabs, activeFilter, (type) =>
        networkActions.setFilters({ type })
    )}

                <div class="flex items-center gap-4">
                    <button
                        @click=${handleExportHar}
                        class="px-3 py-1.5 text-sm font-semibold rounded-md transition-colors bg-blue-800 hover:bg-blue-700 text-blue-200 flex items-center gap-2"
                    >
                        ${icons.download} Export HAR
                    </button>
                    <button
                        @click=${() => networkActions.clearEvents()}
                        class="px-3 py-1.5 text-sm font-semibold rounded-md transition-colors bg-red-800 hover:bg-red-700 text-red-200 flex items-center gap-2"
                    >
                        ${icons.xCircle} Clear Log
                    </button>
                </div>
            </div>
            ${streamFilterChecklistTemplate(streams, visibleStreamIds)}
        </div>
    `;
};
