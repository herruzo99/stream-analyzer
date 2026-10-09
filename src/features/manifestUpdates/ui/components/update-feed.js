import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const updateItemTemplate = (update, isActive, onSelect) => {
    const { sequenceNumber, timestamp, changes, meta } = update;

    const activeClasses =
        'border-blue-500 bg-slate-700';
    const inactiveClasses = 'border-transparent hover:bg-slate-800';

    const containerClass = `relative pl-5 py-3 pr-3 border-l-[3px] cursor-pointer transition-all group ${isActive ? activeClasses : inactiveClasses}`;

    const markerClass = `absolute left-[-4.5px] top-4 w-2 h-2 rounded-full transition-all ${isActive ? 'bg-blue-500 ring-4 ring-blue-500/20' : 'bg-slate-300 group-hover:bg-slate-200'}`;

    const headerTextClass = `font-mono text-sm font-bold ${isActive ? 'text-blue-400' : 'text-slate-100'}`;

    // Larger badges
    const badgeClass =
        'text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-800 font-medium';

    return html`
        <div class="${containerClass}" @click=${() => onSelect(update.id)}>
            <!-- Timeline Marker -->
            <div class="${markerClass}"></div>

            <!-- Header -->
            <div class="flex justify-between items-baseline mb-1.5">
                <div class="flex items-center gap-2">
                    <span class="${headerTextClass}">#${sequenceNumber}</span>
                    ${meta.label
            ? html`<span class="${badgeClass}">${meta.label}</span>`
            : ''}
                </div>
                <span
                    class="text-xs font-mono text-slate-400 whitespace-nowrap ml-2"
                    >${timestamp}</span
                >
            </div>

            <!-- Changes Summary -->
            <!-- prettier-ignore -->
            <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium opacity-80">
                ${changes.additions > 0
            ? html`<span class="text-emerald-400"
                      >+${changes.additions} lines</span
                  >`
            : ''}
                ${changes.removals > 0
            ? html`<span class="text-red-400"
                      >-${changes.removals} lines</span
                  >`
            : ''}
                ${changes.modifications > 0
            ? html`<span class="text-amber-400"
                      >~${changes.modifications} mods</span
                  >`
            : ''}
                ${changes.additions === 0 &&
            changes.removals === 0 &&
            changes.modifications === 0
            ? html`<span class="text-slate-400 italic"
                      >No Content Changes</span
                  >`
            : ''}
            </div>
        </div>
    `;
};

export const updateFeedTemplate = (
    updates,
    activeUpdateId,
    streamId,
    onSelect
) => {
    return html`
        <div class="flex flex-col h-full w-full">
            <div
                class="px-4 py-3 border-b border-slate-800 bg-slate-800 backdrop-blur z-10 text-xs font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center"
            >
                <span>Update History</span>
                <span
                    class="bg-slate-800 text-slate-100 px-2 py-0.5 rounded-full"
                    >${updates.length}</span
                >
            </div>
            <div class="grow overflow-y-auto custom-scrollbar relative">
                ${updates.map((u) =>
        updateItemTemplate(u, u.id === activeUpdateId, onSelect)
    )}
                ${updates.length === 0
            ? html`
                          <div
                              class="flex flex-col items-center justify-center h-48 text-slate-400 italic text-sm gap-2"
                          >
                              <div
                                  class="p-3 rounded-full bg-slate-800"
                              >
                                  ${icons.history}
                              </div>
                              <p>Waiting for updates...</p>
                          </div>
                      `
            : ''}
            </div>
        </div>
    `;
};
