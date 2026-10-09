import * as icons from '@/ui/icons';
import { closeDropdown, toggleDropdown } from '@/ui/services/dropdownService';
import { html } from 'lit-html';

const segmentOption = (seg, isActive, onClick) => html`
    <button
        @click=${onClick}
        class="w-full flex items-center gap-4 p-3 rounded-xl transition-all border group relative overflow-hidden ${isActive
        ? 'bg-[var(--primary-accent)] border-[var(--primary-accent)]/50 text-white shadow-[0_0_20px_var(--primary-accent-glow)]/40'
        : 'bg-transparent border-transparent hover:bg-[var(--bg-glass-B-2)] text-[var(--text-on-B-secondary)] hover:text-[var(--text-on-B-primary)] hover:border-[var(--border-on-B)]/10'}"
    >
        ${isActive
        ? html`<div
                  class="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"
              ></div>`
        : ''}

        <div class="relative z-10 text-left min-w-0 grow">
            <div
                class="text-[10px] font-black uppercase tracking-widest opacity-60 truncate font-mono"
                title="${seg.segment?.uniqueId}"
            >
                ${seg.segment?.uniqueId.split('/').pop()}
            </div>
            <div
                class="text-[11px] font-bold ${isActive
        ? 'text-white/80'
        : 'text-[var(--text-on-B-secondary)] opacity-40'} mt-0.5"
            >
                Size: ${(seg.data?.size / 1024).toFixed(1)} KB
            </div>
        </div>
        ${isActive
        ? html`<span
                  class="relative z-10 ml-2 shrink-0 text-white drop-shadow-lg"
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
            class="dropdown-panel bg-[var(--bg-surface-B-modal)]/95 backdrop-blur-3xl border border-[var(--border-on-B)]/20 rounded-2xl shadow-2xl w-[26rem] p-3 ring-1 ring-black/80 flex flex-col gap-2 max-h-[70vh] overflow-y-auto custom-scrollbar animate-fadeIn"
        >
            <div
                class="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-on-B-secondary)] flex justify-between items-center border-b border-[var(--border-on-B)]/10 mb-2"
            >
                <div class="flex items-center gap-2">
                    <span class="text-[var(--primary-accent)]"
                        >${icons.list}</span
                    >
                    <span>Select ${label} Source</span>
                </div>
                <span
                    class="bg-[var(--bg-glass-B-3)] text-[var(--text-on-B-primary)] px-2 py-1 rounded-md text-[9px] font-black border border-[var(--border-on-B)]/10"
                    >${allSegments.length} BUFFERS</span
                >
            </div>

            <div class="space-y-6">
                ${Object.entries(groupedSegments).map(
        ([streamName, segments]) => html`
                        <div class="space-y-2 px-1">
                            <h5
                                class="px-3 text-[10px] font-black text-[var(--primary-accent)] uppercase tracking-[0.15em] flex items-center gap-3 opacity-90"
                            >
                                <span
                                    class="p-1.5 rounded-lg bg-[var(--primary-accent)]/5 border border-[var(--primary-accent)]/10"
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
                class="flex items-center justify-center h-16 w-full rounded-2xl border-2 border-dashed border-[var(--border-on-A)]/20 text-[var(--text-on-A-secondary)] hover:text-[var(--primary-accent)] hover:border-[var(--primary-accent)]/40 hover:bg-[var(--primary-accent)]/5 transition-all text-[11px] font-black uppercase tracking-[0.2em] gap-3 group relative overflow-hidden"
            >
                <div
                    class="absolute inset-0 bg-gradient-to-br from-[var(--primary-accent)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
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
                class="absolute -top-3 ${centerText ? 'left-1/2 -translate-x-1/2' : 'left-4'} px-2 bg-[var(--bg-surface-A-main)] text-[9px] font-black text-[var(--text-on-A-secondary)] opacity-60 uppercase tracking-[0.2em] border border-[var(--border-on-A)]/20 rounded-md z-10 select-none shadow-sm group-hover:opacity-100 group-hover:text-[var(--primary-accent)] transition-all"
            >
                ${label} Source
            </div>
            <button
                @click=${(e) => toggleDropdown(e.currentTarget, menuContent, e)}
                class="flex items-center gap-5 w-full p-4 rounded-2xl bg-[var(--bg-glass-accent-on-A-1)]/30 hover:bg-[var(--bg-glass-accent-on-A-1)]/50 border border-[var(--border-on-A)]/10 hover:border-[var(--primary-accent)]/30 transition-all duration-500 shadow-xl group-hover:shadow-[0_0_25px_var(--primary-accent-glow)]/10 ${centerText ? 'text-center justify-center' : 'text-left'} relative overflow-hidden backdrop-blur-xl"
            >
                <div
                    class="absolute inset-0 bg-gradient-to-br from-[var(--primary-accent)]/5 to-transparent opacity-50"
                ></div>

                <div class="min-w-0 grow relative z-10 flex flex-col ${centerText ? 'items-center' : 'items-start'}">
                    <div
                        class="text-sm font-black text-[var(--text-on-A-primary)] truncate group-hover:text-[var(--primary-accent)] transition-colors tracking-tight"
                    >
                        ${selectedSegment.stream?.name}
                    </div>
                    <div class="flex items-center gap-2 mt-1">
                        <span
                            class="text-[10px] px-2 py-0.5 rounded-md bg-black/30 text-[var(--text-on-A-secondary)] border border-white/5 font-mono truncate max-w-[200px] opacity-70 group-hover:opacity-100 transition-opacity"
                        >
                            ${selectedSegment.segment?.uniqueId
            .split('/')
            .pop()}
                        </span>
                    </div>
                </div>

                <div
                    class="shrink-0 text-[var(--text-on-A-secondary)] opacity-40 group-hover:opacity-100 group-hover:text-[var(--primary-accent)] transition-all bg-black/20 p-2 rounded-xl border border-white/5 group-hover:border-[var(--primary-accent)]/20 group-hover:rotate-180 duration-500 absolute right-4 top-1/2 -translate-y-1/2"
                >
                    ${icons.chevronDown}
                </div>
            </button>
        </div>
    `;
};
