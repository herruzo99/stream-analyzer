import { useAnalysisStore } from '@/state/analysisStore';
import { networkActions, useNetworkStore } from '@/state/networkStore';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';
import { downloadHar, generateHar } from '../../domain/har-generator';

const filterPill = (activeType, type, label, count) => {
    const isActive = activeType === type;
    const classes = isActive
        ? 'bg-emerald-500/10 text-white   border-emerald-400/25'
        : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-slate-200';

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
    const { filters, events } = useNetworkStore.getState();
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
        <div class="flex flex-col gap-4">
            <!-- Row 1: Controls & Search -->
            <div class="flex items-center justify-between gap-4">
                <div class="relative grow max-w-md">
                    <div
                        class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"
                    >
                        ${icons.search}
                    </div>
                    <input
                        type="text"
                        placeholder="Filter URLs..."
                        class="w-full bg-white/5 text-slate-100 text-sm rounded-md border border-white/10 pl-10 pr-4 py-2 focus:ring-2 focus:ring-emerald-400/25 focus:border-transparent"
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
                        class="px-3 py-2 text-xs font-bold rounded-md bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors flex items-center gap-2"
                        title="Export HAR"
                    >
                        ${icons.download} HAR
                    </button>
                    <button
                        @click=${() => networkActions.clearEvents()}
                        class="px-3 py-2 text-xs font-bold rounded-md bg-white/5 border border-white/10 text-slate-400 hover:text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-2"
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
