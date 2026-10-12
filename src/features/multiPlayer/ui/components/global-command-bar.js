import { eventBus } from '@/application/event-bus';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import * as icons from '@/ui/icons';
import { closeDropdown, toggleDropdown } from '@/ui/services/dropdownService';
import { html, render } from 'lit-html';

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
            class="dropdown-panel bg-white/5 border border-white/10 rounded-md w-48 p-1 ring-1"
        >
            ${options.map(
                (opt) => html`
                    <button
                        @click=${() => handleSelect(opt.value)}
                        class="w-full text-left px-3 py-2 rounded-md text-xs font-bold flex items-center justify-between transition-colors ${currentColumns === opt.value ? 'bg-emerald-500/10 text-white' : 'text-slate-100 hover:bg-white/10 hover:text-white'}"
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

const settingsDropdownTemplate = (currentDelay) => {
    const handleDelayChange = (e) => {
        const val = parseInt(e.target.value, 10);
        useMultiPlayerStore.getState().setGlobalRetryDelay(val);
    };

    return html`
        <div
            class="dropdown-panel bg-white/5 border border-white/10 rounded-md w-64 p-4 ring-1"
        >
            <h4
                class="text-xs font-bold text-slate-400 r mb-3"
            >
                Global Settings
            </h4>

            <div class="space-y-3">
                <div>
                    <label
                        class="text-xs font-bold text-slate-100 block mb-1"
                        >Auto-reset on failure</label
                    >
                    <div
                        class="flex items-center justify-between bg-white/5 p-2 rounded border border-white/10"
                    >
                        <span
                            class="text-[10px] text-slate-400"
                            >Automatically restart failed streams</span
                        >
                        <button
                            @click=${() =>
                                useMultiPlayerStore
                                    .getState()
                                    .toggleAutoReset()}
                            role="switch"
                            aria-checked="${useMultiPlayerStore.getState()
                                .isAutoResetEnabled}"
                            class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${useMultiPlayerStore.getState() .isAutoResetEnabled ? 'bg-emerald-500/10' : 'bg-white/5'}"
                        >
                            <span
                                class="inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${useMultiPlayerStore.getState() .isAutoResetEnabled ? 'translate-x-5' : 'translate-x-1'}"
                            ></span>
                        </button>
                    </div>
                </div>

                <div>
                    <label
                        for="global-retry-select"
                        class="text-xs font-bold text-slate-100 block mb-1"
                        >Retry Strategy</label
                    >
                    <p
                        class="text-[10px] text-slate-400 mb-2"
                    >
                        Default restart delay for all players
                    </p>

                    <div class="relative">
                        <select
                            id="global-retry-select"
                            @change=${handleDelayChange}
                            ?disabled=${!useMultiPlayerStore.getState()
                                .isAutoResetEnabled}
                            class="w-full bg-white/5 text-slate-100 text-xs rounded border border-white/10 px-2 py-1.5 outline-none focus:border-emerald-400/25 appearance-none disabled:opacity-50"
                        >
                            <option
                                value="2000"
                                ?selected=${currentDelay === 2000}
                            >
                                Standard (2s)
                            </option>
                            <option
                                value="1000"
                                ?selected=${currentDelay === 1000}
                            >
                                Fast (1s)
                            </option>
                            <option
                                value="500"
                                ?selected=${currentDelay === 500}
                            >
                                Intensive (0.5s)
                            </option>
                            <option
                                value="250"
                                ?selected=${currentDelay === 250}
                            >
                                Extreme (0.25s)
                            </option>
                        </select>
                        <div
                            class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400"
                        >
                            ${icons.chevronDown
                                ? html`<span class="w-3 h-3"
                                      >${icons.chevronDown}</span
                                  >`
                                : html`<svg
                                      class="fill-current h-3 w-3"
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 20 20"
                                  >
                                      <path
                                          d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"
                                      />
                                  </svg>`}
                        </div>
                    </div>
                </div>
            </div>
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
        const {
            layoutMode,
            players,
            isMutedAll,
            showGlobalHud,
            gridColumns,
            globalRetryDelayMs,
        } = useMultiPlayerStore.getState();
        const count = players.size;
        const playersList = Array.from(players.values());
        const failedCount = playersList.filter(
            (p) => p.state === 'error'
        ).length;

        const btnClass =
            'p-2 rounded-md bg-white/5 border border-white/10 text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-all active:scale-95';
        const activeBtnClass =
            'p-2 rounded-md bg-emerald-500/10 border border-emerald-400/25 text-white   transition-all';

        const separator = html`<div
            class="w-px h-8 bg-white/5 mx-2"
        ></div>`;

        const template = html`
            <div
                class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 bg-white/5 border border-white/10 rounded-md ring-1 animate-slideInUp"
            >
                <!-- Layout Controls -->
                <div class="flex gap-1">
                    <button
                        class="${layoutMode === 'grid' ? activeBtnClass : btnClass}"
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
                                  class="p-2 rounded-md bg-white/5 border border-white/10 text-slate-100 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1 min-w-[40px] justify-center active:scale-95"
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
                        class="${layoutMode === 'focus' ? activeBtnClass : btnClass}"
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
                        class="${btnClass} text-slate-400 hover:text-slate-100"
                        @click=${() =>
                            eventBus.dispatch('ui:multi-player:reset-all')}
                        title="Reset All Players"
                    >
                        ${icons.sync}
                    </button>

                    ${failedCount > 0
                        ? html`
                              <button
                                  class="p-2 rounded-md bg-red-500/30 border border-red-500 text-red-400 hover:bg-red-500/50 hover:text-white transition-all active:scale-95 flex items-center gap-1 px-3"
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

                ${separator}

                <!-- Settings -->
                <div class="flex gap-1">
                    <button
                        class="${btnClass}"
                        @click=${(e) =>
                            toggleDropdown(
                                e.currentTarget,
                                () =>
                                    settingsDropdownTemplate(
                                        globalRetryDelayMs
                                    ),
                                e
                            )}
                        title="Global Settings"
                    >
                        ${icons.settings}
                    </button>
                </div>

                <!-- Info Badge -->
                <div
                    class="ml-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 text-xs font-mono text-slate-400 select-none"
                >
                    ${count} Active
                </div>
            </div>
        `;

        render(template, this);
    }
}

customElements.define('global-command-bar', GlobalCommandBar);
