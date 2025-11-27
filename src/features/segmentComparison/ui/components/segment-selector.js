import * as icons from '@/ui/icons';
import { closeDropdown, toggleDropdown } from '@/ui/services/dropdownService';
import { html } from 'lit-html';

const segmentOption = (seg, isActive, onClick) => html`
    <button
        @click=${onClick}
        class="w-full flex items-center gap-3 p-2.5 rounded-lg transition-all border group ${isActive
            ? 'bg-blue-600 border-blue-500 text-white shadow-md'
            : 'bg-transparent border-transparent hover:bg-white/5 text-slate-400 hover:text-slate-200'}"
    >
        <div class="text-left min-w-0 grow">
            <div
                class="text-[10px] font-mono opacity-60 truncate"
                title="${seg.segment?.uniqueId}"
            >
                ${seg.segment?.uniqueId.split('/').pop()}
            </div>
            <div class="text-xs text-slate-500">
                Size: ${(seg.data?.size / 1024).toFixed(1)} KB
            </div>
        </div>
        ${isActive
            ? html`<span class="ml-2 shrink-0 text-white"
                  >${icons.checkCircle}</span
              >`
            : ''}
    </button>
`;

export const segmentSelectorTemplate = (
    selectedSegment,
    allSegments,
    onSelect,
    label
) => {
    // Group segments by Stream Name
    const groupedSegments = allSegments.reduce((acc, seg) => {
        const streamName = seg.stream?.name || 'Unknown Stream';
        if (!acc[streamName]) acc[streamName] = [];
        acc[streamName].push(seg);
        return acc;
    }, {});

    const menuContent = () => html`
        <div
            class="dropdown-panel bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl w-96 p-2 ring-1 ring-black/50 flex flex-col gap-1 max-h-[60vh] overflow-y-auto custom-scrollbar"
        >
            <div
                class="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 flex justify-between items-center border-b border-white/5 mb-1"
            >
                <span>Select ${label} Source</span>
                <span
                    class="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded text-[9px]"
                    >${allSegments.length} Loaded</span
                >
            </div>

            <div class="space-y-4">
                ${Object.entries(groupedSegments).map(
                    ([streamName, segments]) => html`
                        <div class="space-y-1">
                            <h5
                                class="px-2 text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2"
                            >
                                ${icons.server} ${streamName}
                            </h5>
                            ${segments.map((seg) =>
                                segmentOption(
                                    seg,
                                    selectedSegment &&
                                        seg.segment.uniqueId ===
                                            selectedSegment.segment.uniqueId,
                                    () => {
                                        onSelect(seg);
                                        closeDropdown();
                                    }
                                )
                            )}
                        </div>
                    `
                )}
            </div>
        </div>
    `;

    if (!selectedSegment)
        return html`
            <button
                @click=${(e) => toggleDropdown(e.currentTarget, menuContent, e)}
                class="flex items-center justify-center h-14 w-full rounded-xl border-2 border-dashed border-slate-700 text-slate-500 hover:text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-xs font-bold uppercase tracking-wider gap-2 group"
            >
                <span class="group-hover:scale-110 transition-transform"
                    >${icons.plusCircle}</span
                >
                Select ${label} Source
            </button>
        `;

    return html`
        <div class="relative group w-full">
            <div
                class="absolute -top-2.5 left-3 px-1.5 bg-slate-900/50 backdrop-blur-sm text-[9px] font-bold text-slate-500 uppercase tracking-wider border border-slate-700/50 rounded z-10 select-none"
            >
                ${label} Source
            </div>
            <button
                @click=${(e) => toggleDropdown(e.currentTarget, menuContent, e)}
                class="flex items-center gap-4 w-full p-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 transition-all shadow-sm group-hover:shadow-md text-left"
            >
                <div class="min-w-0 grow">
                    <div
                        class="text-sm font-bold text-slate-200 truncate group-hover:text-white transition-colors"
                    >
                        ${selectedSegment.stream?.name}
                    </div>
                    <div class="flex items-center gap-2 mt-0.5">
                        <span
                            class="text-[10px] px-1.5 py-0.5 rounded bg-slate-900/50 text-slate-400 border border-slate-700/50 font-mono truncate max-w-[180px]"
                        >
                            ${selectedSegment.segment?.uniqueId
                                .split('/')
                                .pop()}
                        </span>
                    </div>
                </div>

                <div
                    class="shrink-0 text-slate-500 group-hover:text-white transition-colors bg-slate-900/50 p-1.5 rounded-md border border-slate-700/50 group-hover:border-slate-600"
                >
                    ${icons.chevronDown}
                </div>
            </button>
        </div>
    `;
};
