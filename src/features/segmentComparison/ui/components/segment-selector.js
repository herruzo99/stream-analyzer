import * as icons from '@/ui/icons';
import { closeDropdown, toggleDropdown } from '@/ui/services/dropdownService';
import { html } from 'lit-html';

const segmentOption = (seg, isActive, onClick) => html`
    <button
        @click=${onClick}
        class="w-full flex items-center gap-4 p-3 rounded-md transition-all border group relative overflow-hidden ${isActive ? 'bg-emerald-500/10 border-emerald-400/25 text-white /40' : 'bg-transparent border-transparent hover:bg-white/10 text-slate-400 hover:text-slate-100 hover:border-white/10'}"
    >
        ${isActive
        ? html`<div
                  class="absolute inset-0 from-white/10 to-transparent"
              ></div>`
        : ''}

        <div class="relative z-10 text-left min-w-0 grow">
            <div
                class="text-[10px] font-bold opacity-60 truncate font-mono"
                title="${seg.segment?.uniqueId}"
            >
                ${seg.segment?.uniqueId.split('/').pop()}
            </div>
            <div
                class="text-[11px] font-bold ${isActive ? 'text-white/80' : 'text-slate-400 opacity-40'} mt-0.5"
            >
                Size: ${(seg.data?.size / 1024).toFixed(1)} KB
            </div>
        </div>
        ${isActive
        ? html`<span
                  class="relative z-10 ml-2 shrink-0 text-white drop-"
                  >${icons.checkCircle}</span
              >`
        : ''}
    </button>
`;

export const segmentSelectorTemplate = (
    selectedSegment,
    allSegments,
    onSelect,
    label,
    centerText = false
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
            class="dropdown-panel bg-white/5 border border-white/10 rounded-md w-[26rem] p-3 ring-1 flex flex-col gap-2 max-h-[70vh] overflow-y-auto custom-scrollbar"
        >
            <div
                class="px-4 py-3 text-[10px] font-bold text-slate-400 flex justify-between items-center border-b border-white/10 mb-2"
            >
                <div class="flex items-center gap-2">
                    <span class="text-emerald-200"
                        >${icons.list}</span
                    >
                    <span>Select ${label} Source</span>
                </div>
                <span
                    class="bg-white/5 text-slate-100 px-2 py-1 rounded-md text-[9px] font-bold border border-white/10"
                    >${allSegments.length} BUFFERS</span
                >
            </div>

            <div class="space-y-6">
                ${Object.entries(groupedSegments).map(
        ([streamName, segments]) => html`
                        <div class="space-y-2 px-1">
                            <h5
                                class="px-3 text-[10px] font-bold text-emerald-200 flex items-center gap-3 opacity-90"
                            >
                                <span
                                    class="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-400/25"
                                    >${icons.server}</span
                                >
                                ${streamName}
                            </h5>
                            <div class="grid grid-cols-1 gap-1">
                                ${segments.map((seg) =>
            segmentOption(
                seg,
                selectedSegment &&
                seg.segment.uniqueId ===
                selectedSegment.segment
                    .uniqueId,
                () => {
                    onSelect(seg);
                    closeDropdown();
                }
            )
        )}
                            </div>
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
                class="flex items-center justify-center h-16 w-full rounded-md border-2 border-dashed border-white/10 text-slate-400 hover:text-emerald-200 hover:border-emerald-400/50 hover:bg-emerald-500/10 transition-all text-[11px] font-bold gap-3 group relative overflow-hidden"
            >
                <div
                    class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                ></div>
                <span
                    class="group-hover:scale-125 group-hover:rotate-90 transition-all duration-500 relative z-10"
                    >${icons.plusCircle}</span
                >
                <span class="relative z-10">Select ${label} Source</span>
            </button>
        `;

    return html`
        <div class="relative group w-full">
            <div
                class="absolute -top-3 ${centerText ? 'left-1/2 -translate-x-1/2' : 'left-4'} px-2 bg-white/5 text-[9px] font-bold text-slate-400 opacity-60 border border-white/10 rounded-md z-10 select-none group-hover:opacity-100 group-hover:text-emerald-200 transition-all"
            >
                ${label} Source
            </div>
            <button
                @click=${(e) => toggleDropdown(e.currentTarget, menuContent, e)}
                class="flex items-center gap-5 w-full p-4 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-400/50 transition-all duration-500 group- ${centerText ? 'text-center justify-center' : 'text-left'} relative overflow-hidden"
            >
                <div
                    class="absolute inset-0 opacity-50"
                ></div>

                <div class="min-w-0 grow relative z-10 flex flex-col ${centerText ? 'items-center' : 'items-start'}">
                    <div
                        class="text-sm font-bold text-slate-200 truncate group-hover:text-emerald-200 transition-colors"
                    >
                        ${selectedSegment.stream?.name}
                    </div>
                    <div class="flex items-center gap-2 mt-1">
                        <span
                            class="text-[10px] px-2 py-0.5 rounded-md bg-black/30 text-slate-400 border border-white/5 font-mono truncate max-w-[200px] opacity-70 group-hover:opacity-100 transition-opacity"
                        >
                            ${selectedSegment.segment?.uniqueId
            .split('/')
            .pop()}
                        </span>
                    </div>
                </div>

                <div
                    class="shrink-0 text-slate-400 opacity-40 group-hover:opacity-100 group-hover:text-emerald-200 transition-all bg-black/20 p-2 rounded-md border border-white/5 group-hover:border-emerald-400/50 group-hover:rotate-180 duration-500 absolute right-4 top-1/2 -translate-y-1/2"
                >
                    ${icons.chevronDown}
                </div>
            </button>
        </div>
    `;
};
