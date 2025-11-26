import { html } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map.js';
import { analysisActions } from '@/state/analysisStore';
import * as icons from '@/ui/icons';

const updateItemTemplate = (update, isActive, streamId) => {
    const { id, sequenceNumber, timestamp, changes, meta } = update;

    const containerClass = classMap({
        'relative pl-5 py-3 pr-3 border-l-[3px] cursor-pointer transition-all hover:bg-slate-800/40 group': true,
        'border-blue-500 bg-blue-900/5': isActive,
        'border-slate-700/50': !isActive,
    });

    // Larger badges
    const badgeClass =
        'text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-medium';

    return html`
        <div
            class="${containerClass}"
            @click=${() =>
                analysisActions.setActiveManifestUpdate(streamId, id)}
        >
            <!-- Timeline Marker -->
            <div
                class="absolute left-[-5px] top-4 w-2 h-2 rounded-full ${isActive
                    ? 'bg-blue-400 ring-4 ring-blue-500/20'
                    : 'bg-slate-600 group-hover:bg-slate-500'} transition-all"
            ></div>

            <!-- Header -->
            <div class="flex justify-between items-baseline mb-1.5">
                <div class="flex items-center gap-2">
                    <span
                        class="font-mono text-sm font-bold ${isActive
                            ? 'text-blue-400'
                            : 'text-slate-200'}"
                        >#${sequenceNumber}</span
                    >
                    ${meta.label
                        ? html`<span class="${badgeClass}">${meta.label}</span>`
                        : ''}
                </div>
                <span
                    class="text-xs font-mono text-slate-500 whitespace-nowrap ml-2"
                    >${timestamp}</span
                >
            </div>

            <!-- Changes Summary -->
            <div
                class="flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium opacity-80"
            >
                ${changes.additions > 0
                    ? html`<span class="text-emerald-400/90"
                          >+${changes.additions} lines</span
                      >`
                    : ''}
                ${changes.removals > 0
                    ? html`<span class="text-red-400/90"
                          >-${changes.removals} lines</span
                      >`
                    : ''}
                ${changes.modifications > 0
                    ? html`<span class="text-amber-400/90"
                          >~${changes.modifications} mods</span
                      >`
                    : ''}
                ${changes.additions === 0 &&
                changes.removals === 0 &&
                changes.modifications === 0
                    ? html`<span class="text-slate-600 italic"
                          >No Content Changes</span
                      >`
                    : ''}
            </div>
        </div>
    `;
};

export const updateFeedTemplate = (updates, activeUpdateId, streamId) => {
    return html`
        <div
            class="flex flex-col h-full bg-slate-900 border-r border-slate-800 w-full shrink-0"
        >
            <div
                class="p-4 border-b border-slate-800 bg-slate-900/95 backdrop-blur z-10 text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center"
            >
                <span>Update History</span>
                <span
                    class="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full"
                    >${updates.length}</span
                >
            </div>
            <div class="grow overflow-y-auto custom-scrollbar relative">
                ${updates.map((u) =>
                    updateItemTemplate(u, u.id === activeUpdateId, streamId)
                )}
                ${updates.length === 0
                    ? html`
                          <div
                              class="flex flex-col items-center justify-center h-48 text-slate-500 italic text-sm gap-2"
                          >
                              <div class="p-3 rounded-full bg-slate-800/50">
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
