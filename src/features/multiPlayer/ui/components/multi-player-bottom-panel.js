import { eventBus } from '@/application/event-bus';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import * as icons from '@/ui/icons';
import { toggleDropdown } from '@/ui/services/dropdownService';
import { html, render } from 'lit-html';
import { multiPlayerService } from '../../application/multiPlayerService';
import './event-log.js';
import { virtualTrackDropdownTemplate } from './virtual-track-dropdown.js';

class MultiPlayerBottomPanel extends HTMLElement {
    constructor() {
        super();
        this.unsubscribe = null;
        this.showLog = false;
    }

    connectedCallback() {
        this.render();
        this.unsubscribe = useMultiPlayerStore.subscribe(() => this.render());
    }

    disconnectedCallback() {
        if (this.unsubscribe) this.unsubscribe();
    }

    toggleLog() {
        this.showLog = !this.showLog;
        this.render();
    }

    render() {
        const state = useMultiPlayerStore.getState();
        const {
            players,
            isMutedAll,
            globalAbrEnabled,
            showGlobalHud,
            gridColumns,
            isAutoResetEnabled,
        } = state;

        const playersList = Array.from(players.values());
        const selectedPlayers = playersList.filter((p) => p.selectedForAction);
        const selectedCount = selectedPlayers.length;
        const hasSelection = selectedCount > 0;
        const hasPlayers = players.size > 0;

        const removablePlayers = selectedPlayers.filter((p) => !p.isBasePlayer);
        const hasRemovableSelection = removablePlayers.length > 0;

        const isAllPlaying = selectedPlayers.every(
            (p) => p.state === 'playing' || p.state === 'buffering'
        );

        // --- Actions ---
        const handlePlayPause = () => {
            if (isAllPlaying) {
                multiPlayerService.applyActionToSelected({ type: 'pause' });
            } else {
                multiPlayerService.applyActionToSelected({ type: 'play' });
            }
        };

        const handleSeek = (delta) => {
            multiPlayerService.applyActionToSelected({
                type: 'seekRelative',
                value: delta,
            });
        };

        const handleSelectionToggle = () => {
            if (selectedCount === playersList.length) {
                useMultiPlayerStore.getState().deselectAllStreams();
            } else {
                useMultiPlayerStore.getState().selectAllStreams();
            }
        };

        const handleResetAll = () => {
            eventBus.dispatch('ui:multi-player:reset-all');
        };

        const handleResetSelected = () => {
            eventBus.dispatch('ui:multi-player:reset-selected');
        };

        // --- Quick Settings Dropdown ---
        const quickSettingsTemplate = () => {
            const gridOptions = [
                { label: 'Auto Fit', value: 'auto' },
                { label: '1 Column', value: 1 },
                { label: '2 Columns', value: 2 },
                { label: '3 Columns', value: 3 },
                { label: '4 Columns', value: 4 },
                { label: '5 Columns', value: 5 },
            ];

            const handleGridSelect = (val) => {
                eventBus.dispatch('ui:multi-player:set-grid-columns', {
                    columns: val,
                });
            };

            return html`
                <div
                    class="dropdown-panel bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl w-64 p-3 ring-1 ring-black/50"
                >
                    <!-- Auto Reset Toggle -->
                    <div
                        class="flex items-center justify-between p-2 rounded hover:bg-white/5 mb-2 cursor-pointer"
                        @click=${(e) => {
                            e.stopPropagation();
                            useMultiPlayerStore.getState().toggleAutoReset();
                        }}
                    >
                        <div class="flex flex-col">
                            <span class="text-sm font-bold text-slate-200"
                                >Auto-Reset</span
                            >
                            <span class="text-[10px] text-slate-500"
                                >Restart on error</span
                            >
                        </div>
                        <div
                            class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isAutoResetEnabled
                                ? 'bg-blue-600'
                                : 'bg-slate-600'}"
                        >
                            <span
                                class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isAutoResetEnabled
                                    ? 'translate-x-4.5'
                                    : 'translate-x-0.5'}"
                            ></span>
                        </div>
                    </div>

                    <div class="w-full h-px bg-white/10 mb-2"></div>

                    <!-- Grid Layout -->
                    <div
                        class="px-2 mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500"
                    >
                        Grid Layout
                    </div>
                    <div class="space-y-0.5">
                        ${gridOptions.map(
                            (opt) => html`
                                <button
                                    @click=${() => handleGridSelect(opt.value)}
                                    class="w-full text-left px-2 py-1.5 rounded text-xs font-medium flex items-center justify-between transition-colors ${gridColumns ===
                                    opt.value
                                        ? 'bg-blue-600 text-white'
                                        : 'text-slate-300 hover:bg-white/10'}"
                                >
                                    <span>${opt.label}</span>
                                    ${gridColumns === opt.value
                                        ? html`<span class="scale-75"
                                              >${icons.checkCircle}</span
                                          >`
                                        : ''}
                                </button>
                            `
                        )}
                    </div>
                </div>
            `;
        };

        // --- Styles ---
        const iconBtn = (active = false, danger = false) => `
            flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 
            ${
                active
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 ring-1 ring-blue-400/50'
                    : danger
                      ? 'text-red-400 hover:bg-red-900/20 hover:text-red-200'
                      : 'text-slate-400 hover:text-white hover:bg-white/10 active:scale-95'
            }
            disabled:opacity-30 disabled:cursor-not-allowed shrink-0
        `;

        const playBtn = `
            flex items-center justify-center w-14 h-14 rounded-full bg-white text-black 
            hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10 
            disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 shrink-0
        `;

        const controlGroup =
            'flex items-center gap-1 bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-full p-1.5 shadow-sm shrink-0';

        const pillBtn = (active = false) => `
            flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap
            ${
                active
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-transparent text-slate-400 hover:text-white hover:bg-white/5'
            }
            disabled:opacity-30 disabled:cursor-not-allowed
        `;

        // --- Selection UI ---
        const selectionUI = html`
            <div class="${controlGroup} px-1">
                <button
                    @click=${handleSelectionToggle}
                    class="flex items-center gap-3 px-3 py-1.5 rounded-full hover:bg-white/5 transition-colors group"
                    title="${selectedCount === playersList.length
                        ? 'Deselect All'
                        : 'Select All'}"
                >
                    <div
                        class="w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedCount >
                        0
                            ? 'bg-blue-500 border-blue-500 text-white'
                            : 'border-slate-500 group-hover:border-slate-300'}"
                    >
                        ${selectedCount > 0 &&
                        selectedCount < playersList.length
                            ? html`<div
                                  class="w-2 h-0.5 bg-white rounded-full"
                              ></div>`
                            : ''}
                        ${selectedCount === playersList.length
                            ? icons.checkCircle
                            : ''}
                    </div>
                    <span
                        class="text-xs font-bold text-slate-300 tracking-wide uppercase whitespace-nowrap"
                    >
                        ${selectedCount}
                        <span class="text-slate-500 font-semibold normal-case"
                            >Selected</span
                        >
                    </span>
                </button>
            </div>
        `;

        // --- Transport UI ---
        const transportUI = html`
            <div class="flex items-center gap-4 shrink-0">
                <div class="${controlGroup}">
                    <button
                        class="${iconBtn()}"
                        @click=${() => handleSeek(-10)}
                        ?disabled=${!hasSelection}
                        title="Rewind 10s"
                    >
                        ${icons.frameBackward}
                    </button>
                    <button
                        class="${iconBtn()}"
                        @click=${() => handleSeek(30)}
                        ?disabled=${!hasSelection}
                        title="Forward 30s"
                    >
                        ${icons.frameForward}
                    </button>
                </div>
                <button
                    class="${playBtn}"
                    @click=${handlePlayPause}
                    ?disabled=${!hasSelection}
                    title="Play/Pause"
                >
                    <div class="scale-125">
                        ${isAllPlaying ? icons.pause : icons.play}
                    </div>
                </button>
                <div class="${controlGroup}">
                    <button
                        class="${iconBtn(isMutedAll)}"
                        @click=${() =>
                            isMutedAll
                                ? eventBus.dispatch(
                                      'ui:multi-player:unmute-all'
                                  )
                                : eventBus.dispatch('ui:multi-player:mute-all')}
                        title="${isMutedAll ? 'Unmute All' : 'Mute All'}"
                    >
                        ${isMutedAll ? icons.volumeOff : icons.volumeUp}
                    </button>
                </div>
            </div>
        `;

        // --- Log Drawer ---
        const logDrawer = this.showLog
            ? html`
                  <div
                      class="absolute bottom-full left-4 right-4 h-64 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-t-xl shadow-2xl z-40 overflow-hidden animate-slideInUp flex flex-col"
                  >
                      <div
                          class="flex items-center justify-between px-4 py-2 border-b border-slate-700/50 bg-slate-900/50"
                      >
                          <span
                              class="text-xs font-bold text-slate-400 uppercase tracking-widest"
                              >Session Event Log</span
                          >
                          <button
                              @click=${() => this.toggleLog()}
                              class="text-slate-500 hover:text-white transition-colors"
                          >
                              ${icons.chevronDown}
                          </button>
                      </div>
                      <div class="grow overflow-hidden">
                          <event-log-component></event-log-component>
                      </div>
                  </div>
              `
            : '';

        // --- Config UI ---
        const configUI = html`
            <div class="flex items-center gap-3 shrink-0">
                <button
                    class="${iconBtn(this.showLog)}"
                    @click=${() => this.toggleLog()}
                    title="Toggle Event Log"
                >
                    ${icons.terminal}
                </button>
                <div class="w-px h-8 bg-slate-800 mx-1"></div>

                <div class="${controlGroup}">
                    <button
                        @click=${(e) =>
                            toggleDropdown(
                                e.currentTarget,
                                quickSettingsTemplate,
                                e
                            )}
                        class="${pillBtn(false)}"
                        title="Settings"
                    >
                        ${icons.settings} Settings
                    </button>
                </div>

                <div class="w-px h-8 bg-slate-800 mx-1"></div>

                <div class="${controlGroup}">
                    <button
                        @click=${() =>
                            multiPlayerService.applyConfigToSelected({
                                abrEnabled: true,
                            })}
                        ?disabled=${!hasSelection}
                        class="${pillBtn(globalAbrEnabled)}"
                        title="Enable Auto ABR"
                    >
                        Auto
                    </button>
                    <div class="w-px h-4 bg-slate-700"></div>
                    <button
                        @click=${(e) =>
                            hasSelection &&
                            toggleDropdown(
                                e.currentTarget,
                                () => virtualTrackDropdownTemplate(),
                                e
                            )}
                        ?disabled=${!hasSelection}
                        class="${pillBtn(!globalAbrEnabled)}"
                        title="Manual Quality"
                    >
                        Quality ${icons.chevronDown}
                    </button>
                </div>

                <div class="w-px h-8 bg-slate-800 mx-1"></div>

                <div class="${controlGroup}">
                    <button
                        @click=${handleResetAll}
                        ?disabled=${!hasPlayers}
                        class="${pillBtn(false)}"
                        title="Reset All Players"
                    >
                        ${icons.sync} All
                    </button>
                    <div class="w-px h-4 bg-slate-700"></div>
                    <button
                        @click=${handleResetSelected}
                        ?disabled=${!hasSelection}
                        class="${pillBtn(false)}"
                        title="Reset Selected Players"
                    >
                        Selected
                    </button>
                </div>

                <button
                    class="${iconBtn(showGlobalHud)}"
                    @click=${() =>
                        eventBus.dispatch('ui:multi-player:toggle-global-hud')}
                    title="Toggle HUD"
                >
                    ${icons.activity}
                </button>

                ${hasSelection
                    ? html`
                          <div class="w-px h-8 bg-slate-800 mx-1"></div>
                          <button
                              class="${iconBtn(false)}"
                              @click=${() =>
                                  selectedPlayers.forEach((p) =>
                                      multiPlayerService.duplicateStream(
                                          p.streamId
                                      )
                                  )}
                              title="Clone"
                          >
                              ${icons.copy}
                          </button>
                          <div
                              class="${controlGroup} border-red-900/30 bg-red-900/10 ml-1"
                          >
                              <button
                                  class="${iconBtn(false, true)}"
                                  @click=${() =>
                                      removablePlayers.forEach((p) =>
                                          multiPlayerService.removePlayer(
                                              p.streamId
                                          )
                                      )}
                                  ?disabled=${!hasRemovableSelection}
                                  title="Remove"
                              >
                                  ${icons.xCircle}
                              </button>
                          </div>
                      `
                    : ''}
            </div>
        `;

        const template = html`
            <div class="relative w-full">
                ${logDrawer}
                <div
                    class="relative shrink-0 h-24 bg-slate-900 border-t border-slate-800/50 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] z-50 flex items-center justify-between px-6 animate-slideInUp backdrop-blur-md w-full gap-6"
                >
                    <div class="shrink-0">${selectionUI}</div>

                    <!-- Combined Transport & Config Area -->
                    <div
                        class="flex items-center gap-6 overflow-x-auto scrollbar-hide justify-end grow py-2"
                    >
                        ${transportUI}
                        <div
                            class="w-px h-10 bg-slate-800 shrink-0 hidden md:block"
                        ></div>
                        ${configUI}
                    </div>
                </div>
            </div>
        `;

        render(template, this);
    }
}

customElements.define('multi-player-bottom-panel', MultiPlayerBottomPanel);
