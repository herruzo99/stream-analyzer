import { html, render } from 'lit-html';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { multiPlayerService } from '../../application/multiPlayerService';
import { eventBus } from '@/application/event-bus';
import { toggleDropdown, closeDropdown } from '@/ui/services/dropdownService';
import { virtualTrackDropdownTemplate } from './virtual-track-dropdown';
import { formatBitrate } from '@/ui/shared/format';
import * as icons from '@/ui/icons';

class MultiPlayerBottomPanel extends HTMLElement {
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
        const state = useMultiPlayerStore.getState();
        const {
            players,
            focusedStreamId,
            isMutedAll,
            globalAbrEnabled,
            showGlobalHud,
            layoutMode,
            gridColumns,
        } = state;

        const focusedPlayer =
            focusedStreamId !== null ? players.get(focusedStreamId) : null;
        const playersList = Array.from(players.values());

        const selectedPlayers = playersList.filter((p) => p.selectedForAction);
        const selectedCount = selectedPlayers.length;
        const hasSelection = selectedCount > 0;
        const hasPlayers = players.size > 0;

        // Filter for destructive actions
        const removablePlayers = selectedPlayers.filter(
            (p) => !p.isBasePlayer
        );
        const hasRemovableSelection = removablePlayers.length > 0;

        // --- Aggregate States ---
        const isAllPaused = selectedPlayers.every(
            (p) =>
                p.state === 'paused' ||
                p.state === 'idle' ||
                p.state === 'ended'
        );
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

        // --- Grid Options Dropdown ---
        const gridOptionsTemplate = () => {
            const options = [
                { label: 'Auto Fit', value: 'auto' },
                { label: '1 Column', value: 1 },
                { label: '2 Columns', value: 2 },
                { label: '3 Columns', value: 3 },
                { label: '4 Columns', value: 4 },
                { label: '5 Columns', value: 5 },
            ];

            const handleSelect = (val) => {
                eventBus.dispatch('ui:multi-player:set-grid-columns', {
                    columns: val,
                });
                closeDropdown();
            };

            return html`
                <div
                    class="dropdown-panel bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl w-40 p-1 ring-1 ring-black/50"
                >
                    <div
                        class="px-3 py-2 border-b border-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1"
                    >
                        Grid Layout
                    </div>
                    ${options.map(
                        (opt) => html`
                            <button
                                @click=${() => handleSelect(opt.value)}
                                class="w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between transition-colors ${gridColumns ===
                                opt.value
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'}"
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
            disabled:opacity-30 disabled:cursor-not-allowed
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

        // --- 1. Selection Indicator (Left) ---
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

        // --- 2. Transport Controls (Center) ---
        const transportUI = html`
            <div class="flex items-center gap-4">
                <!-- Seek / Time -->
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

                <!-- Main Playback -->
                <button
                    class="${playBtn}"
                    @click=${handlePlayPause}
                    ?disabled=${!hasSelection}
                    title="Play/Pause Selected"
                >
                    <div class="scale-125">
                        ${isAllPlaying ? icons.pause : icons.play}
                    </div>
                </button>

                <!-- Audio -->
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

        // --- 3. Right Panel (Config & Operations) ---
        const configUI = html`
            <div class="flex items-center gap-3">
                <!-- Grid Layout Control (Only show in Grid Mode) -->
                ${layoutMode === 'grid'
                    ? html`
                          <div class="${controlGroup}">
                              <button
                                  @click=${(e) =>
                                      toggleDropdown(
                                          e.currentTarget,
                                          gridOptionsTemplate,
                                          e
                                      )}
                                  class="${pillBtn(gridColumns !== 'auto')}"
                                  title="Configure Grid Columns"
                              >
                                  ${icons.grid}
                                  ${gridColumns === 'auto'
                                      ? 'Auto Fit'
                                      : `${gridColumns} Cols`}
                              </button>
                          </div>
                      `
                    : ''}

                <div class="w-px h-8 bg-slate-800 mx-1"></div>

                <!-- ABR / Quality -->
                <div class="${controlGroup}">
                    <button
                        @click=${() =>
                            multiPlayerService.applyConfigToSelected({
                                abrEnabled: true,
                            })}
                        ?disabled=${!hasSelection}
                        class="${pillBtn(globalAbrEnabled)}"
                        title="Enable Auto ABR for Selected"
                    >
                        Auto
                    </button>
                    <div class="w-px h-4 bg-slate-700"></div>
                    <button
                        @click=${(e) => {
                            if (!hasSelection) return;
                            toggleDropdown(
                                e.currentTarget,
                                () => virtualTrackDropdownTemplate(),
                                e
                            );
                        }}
                        ?disabled=${!hasSelection}
                        class="${pillBtn(!globalAbrEnabled)}"
                        title="Set Manual Quality"
                    >
                        Quality ${icons.chevronDown}
                    </button>
                </div>

                <!-- HUD Toggle -->
                <button
                    class="${iconBtn(showGlobalHud)}"
                    @click=${() =>
                        eventBus.dispatch('ui:multi-player:toggle-global-hud')}
                    title="Toggle Telemetry Overlay"
                >
                    ${icons.activity}
                </button>

                <!-- Reset All Button -->
                <button
                    class="${iconBtn(false)}"
                    @click=${handleResetAll}
                    ?disabled=${!hasPlayers}
                    title="Reset All Players"
                >
                    ${icons.sync}
                </button>

                <!-- Destructive Actions -->
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
                              title="Clone Selected Players"
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
                                  title="Remove Selected Players"
                              >
                                  ${icons.xCircle}
                              </button>
                          </div>
                      `
                    : ''}
            </div>
        `;

        // Contextual info for focused player (Hidden in Focus Mode)
        let contextInfo = html``;
        if (focusedPlayer && layoutMode !== 'focus') {
            const videoTrack = focusedPlayer.activeVideoTrack;
            const res = videoTrack ? `${videoTrack.height}p` : 'Auto';
            contextInfo = html`
                <div
                    class="hidden 2xl:flex flex-col items-end mr-4 border-r border-slate-800 pr-4 min-w-[120px]"
                >
                    <span
                        class="text-[10px] font-bold text-slate-500 uppercase tracking-wider"
                        >Focused</span
                    >
                    <div class="flex items-center gap-2 max-w-full">
                        <span
                            class="text-xs font-bold text-white truncate"
                            >${focusedPlayer.streamName}</span
                        >
                        <span
                            class="text-[10px] font-mono text-blue-400 bg-blue-900/20 px-1.5 rounded"
                            >${res}</span
                        >
                    </div>
                </div>
            `;
        }

        // ARCHITECTURAL CHANGE: Use CSS Grid for reliable 3-column layout without overlap
        const template = html`
            <div
                class="relative shrink-0 h-24 bg-slate-950 border-t border-slate-800/50 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] z-50 grid grid-cols-[1fr_auto_1fr] items-center px-6 animate-slideInUp backdrop-blur-md w-full gap-4"
            >
                <!-- Left (Start) -->
                <div class="flex items-center justify-start min-w-0">
                    ${selectionUI}
                </div>

                <!-- Center (Middle) -->
                <div class="flex items-center justify-center">
                    ${transportUI}
                </div>

                <!-- Right (End) -->
                <div class="flex items-center justify-end min-w-0">
                    ${contextInfo} ${configUI}
                </div>
            </div>
        `;

        render(template, this);
    }
}

customElements.define('multi-player-bottom-panel', MultiPlayerBottomPanel);