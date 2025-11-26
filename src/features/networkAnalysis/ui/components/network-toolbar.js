import { html } from 'lit-html';
import { useNetworkStore, networkActions } from '@/state/networkStore';
import { useAnalysisStore } from '@/state/analysisStore';
import { generateHar, downloadHar } from '../../domain/har-generator';
import * as icons from '@/ui/icons';

const filterPill = (activeType, type, label, count) => {
    const isActive = activeType === type;
    const classes = isActive
        ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20 border-blue-500'
        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200';

    return html`
        <button
            @click=${() => networkActions.setFilters({ type })}
            class="px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-2 ${classes}"
        >
            ${label}
            ${count !== undefined
                ? html`<span
                      class="opacity-60 text-[10px] bg-black/20 px-1.5 rounded-full"
                      >${count}</span
                  >`
                : ''}
        </button>
    `;
};

export const networkToolbarTemplate = () => {
    const { filters, events, visibleStreamIds } = useNetworkStore.getState();
    const { streams } = useAnalysisStore.getState();

    // Filter Logic: Initialize with all keys to satisfy TS inference
    /** @type {Record<string, number>} */
    const initialCounts = {
        all: 0,
        manifest: 0,
        video: 0,
        audio: 0,
        text: 0,
        init: 0,
        key: 0,
        license: 0,
        other: 0,
    };

    const counts = events.reduce((acc, e) => {
        acc.all++;
        const type = e.resourceType || 'other';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, initialCounts);

    const handleExportHar = () => {
        const har = generateHar(events, streams);
        downloadHar(har, `stream-analyzer-${Date.now()}.har`);
    };

    return html`
        <div class="flex flex-col gap-4 pb-4 border-b border-slate-800">
            <!-- Row 1: Controls & Search -->
            <div class="flex items-center justify-between gap-4">
                <div class="relative grow max-w-md">
                    <div
                        class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500"
                    >
                        ${icons.search}
                    </div>
                    <input
                        type="text"
                        placeholder="Filter URLs..."
                        class="w-full bg-slate-900 text-slate-200 text-sm rounded-lg border border-slate-700 pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        .value=${filters.search || ''}
                        @input=${(e) =>
                            networkActions.setFilters({
                                search: e.target.value,
                            })}
                    />
                </div>

                <div class="flex items-center gap-2">
                    <button
                        @click=${handleExportHar}
                        class="px-3 py-2 text-xs font-bold rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-2"
                        title="Export HAR"
                    >
                        ${icons.download} HAR
                    </button>
                    <button
                        @click=${() => networkActions.clearEvents()}
                        class="px-3 py-2 text-xs font-bold rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-red-400 hover:bg-red-900/20 transition-colors flex items-center gap-2"
                        title="Clear Log"
                    >
                        ${icons.xCircle} Clear
                    </button>
                </div>
            </div>

            <!-- Row 2: Type Filters -->
            <div
                class="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1"
            >
                ${filterPill(filters.type, 'all', 'All', counts.all)}
                ${filterPill(
                    filters.type,
                    'manifest',
                    'Manifests',
                    counts.manifest
                )}
                ${filterPill(filters.type, 'video', 'Video', counts.video)}
                ${filterPill(filters.type, 'audio', 'Audio', counts.audio)}
                ${filterPill(filters.type, 'text', 'Subs', counts.text)}
                ${filterPill(filters.type, 'init', 'Init', counts.init)}
                ${filterPill(
                    filters.type,
                    'license',
                    'DRM',
                    (counts.key || 0) + (counts.license || 0)
                )}
                ${filterPill(filters.type, 'other', 'Other', counts.other)}
            </div>
        </div>
    `;
};
