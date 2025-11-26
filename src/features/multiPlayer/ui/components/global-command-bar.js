import { html, render } from 'lit-html';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { eventBus } from '@/application/event-bus';
import { toggleDropdown, closeDropdown } from '@/ui/services/dropdownService';
import * as icons from '@/ui/icons';

const gridOptionsTemplate = (currentColumns) => {
    const options = [
        { label: 'Auto Fit', value: 'auto' },
        { label: '1 Column', value: 1 },
        { label: '2 Columns', value: 2 },
        { label: '3 Columns', value: 3 },
        { label: '4 Columns', value: 4 },
        { label: '5 Columns', value: 5 },
    ];

    const handleSelect = (val) => {
        eventBus.dispatch('ui:multi-player:set-grid-columns', { columns: val });
        closeDropdown();
    };

    return html`
        <div
            class="dropdown-panel bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl w-48 p-1 ring-1 ring-black/50"
        >
            ${options.map(
                (opt) => html`
                    <button
                        @click=${() => handleSelect(opt.value)}
                        class="w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between transition-colors ${currentColumns ===
                        opt.value
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'}"
                    >
                        <span>${opt.label}</span>
                        ${currentColumns === opt.value
                            ? html`<span>${icons.checkCircle}</span>`
                            : ''}
                    </button>
                `
            )}
        </div>
    `;
};

class GlobalCommandBar extends HTMLElement {
    constructor() {
        super();
        this.unsubscribe = null;
    }

    connectedCallback() {
        this.render();
        this.unsubscribe = useMultiPlayerStore.subscribe(() => this.render());
    }

    disconnectedCallback() {
        if (this.unsubscribe) this.unsubscribe();
    }

    render() {
        const { layoutMode, players, isMutedAll, showGlobalHud, gridColumns } =
            useMultiPlayerStore.getState();
        const count = players.size;
        const playersList = Array.from(players.values());
        const failedCount = playersList.filter(
            (p) => p.state === 'error'
        ).length;

        const btnClass =
            'p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-all active:scale-95';
        const activeBtnClass =
            'p-2 rounded-lg bg-blue-600 border border-blue-500 text-white shadow-lg shadow-blue-900/50 transition-all';

        const separator = html`<div class="w-px h-8 bg-slate-800 mx-2"></div>`;

        const template = html`
            <div
                class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 bg-slate-900/90 backdrop-blur-lg border border-slate-700/50 rounded-2xl shadow-2xl ring-1 ring-black/50 animate-slideInUp"
            >
                <!-- Layout Controls -->
                <div class="flex gap-1">
                    <button
                        class="${layoutMode === 'grid'
                            ? activeBtnClass
                            : btnClass}"
                        @click=${() =>
                            eventBus.dispatch('ui:multi-player:set-layout', {
                                mode: 'grid',
                            })}
                        title="Grid Layout"
                    >
                        ${icons.grid}
                    </button>

                    ${layoutMode === 'grid'
                        ? html`
                              <button
                                  class="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-all flex items-center gap-1 min-w-[40px] justify-center active:scale-95"
                                  @click=${(e) =>
                                      toggleDropdown(
                                          e.currentTarget,
                                          () =>
                                              gridOptionsTemplate(gridColumns),
                                          e
                                      )}
                                  title="Grid Columns"
                              >
                                  <span
                                      class="text-[10px] font-bold w-4 text-center"
                                      >${gridColumns === 'auto'
                                          ? 'A'
                                          : gridColumns}</span
                                  >
                                  <span class="scale-75 opacity-50"
                                      >${icons.chevronDown}</span
                                  >
                              </button>
                          `
                        : ''}

                    <button
                        class="${layoutMode === 'focus'
                            ? activeBtnClass
                            : btnClass}"
                        @click=${() => {
                            // Default focus to first if none
                            const firstId = players.keys().next().value;
                            if (firstId !== undefined)
                                eventBus.dispatch('ui:multi-player:set-focus', {
                                    streamId: firstId,
                                });
                        }}
                        title="Focus Layout"
                    >
                        ${icons.layout}
                    </button>
                </div>

                ${separator}

                <!-- Global Transport -->
                <div class="flex gap-1">
                    <button
                        class="${btnClass}"
                        @click=${() =>
                            eventBus.dispatch('ui:multi-player:play-all')}
                        title="Play All"
                    >
                        ${icons.play}
                    </button>
                    <button
                        class="${btnClass}"
                        @click=${() =>
                            eventBus.dispatch('ui:multi-player:pause-all')}
                        title="Pause All"
                    >
                        ${icons.pause}
                    </button>
                    <button
                        class="${isMutedAll ? activeBtnClass : btnClass}"
                        @click=${() =>
                            isMutedAll
                                ? eventBus.dispatch(
                                      'ui:multi-player:unmute-all'
                                  )
                                : eventBus.dispatch('ui:multi-player:mute-all')}
                        title="Toggle Global Mute"
                    >
                        ${isMutedAll ? icons.volumeOff : icons.volumeUp}
                    </button>

                    <!-- Reset Actions -->
                    <button
                        class="${btnClass} text-slate-400 hover:text-slate-200"
                        @click=${() =>
                            eventBus.dispatch('ui:multi-player:reset-all')}
                        title="Reset All Players"
                    >
                        ${icons.sync}
                    </button>

                    ${failedCount > 0
                        ? html`
                              <button
                                  class="p-2 rounded-lg bg-red-900/30 border border-red-800 text-red-400 hover:bg-red-900/50 hover:text-red-200 transition-all active:scale-95 flex items-center gap-1 px-3"
                                  @click=${() =>
                                      eventBus.dispatch(
                                          'ui:multi-player:reset-failed'
                                      )}
                                  title="Reset ${failedCount} Failed Streams"
                              >
                                  ${icons.alertTriangle}
                                  <span class="text-[10px] font-bold"
                                      >Reset Failed (${failedCount})</span
                                  >
                              </button>
                          `
                        : ''}
                </div>

                ${separator}

                <!-- View Options -->
                <div class="flex gap-1">
                    <button
                        class="${showGlobalHud ? activeBtnClass : btnClass}"
                        @click=${() =>
                            eventBus.dispatch(
                                'ui:multi-player:toggle-global-hud'
                            )}
                        title="Toggle Stats Overlay"
                    >
                        ${icons.activity}
                    </button>
                </div>

                <!-- Info Badge -->
                <div
                    class="ml-2 px-3 py-1 bg-black/40 rounded-full border border-white/5 text-xs font-mono text-slate-500 select-none"
                >
                    ${count} Active
                </div>
            </div>
        `;

        render(template, this);
    }
}

customElements.define('global-command-bar', GlobalCommandBar);
