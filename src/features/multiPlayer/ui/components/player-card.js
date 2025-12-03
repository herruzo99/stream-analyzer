import { eventBus } from '@/application/event-bus';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { EVENTS } from '@/types/events';
import * as icons from '@/ui/icons';
import { formatPlayerTime } from '@/ui/shared/time-format';
import { html, render } from 'lit-html';
import { multiPlayerService } from '../../application/multiPlayerService';
import './metrics-hud.js';

export class PlayerCardComponent extends HTMLElement {
    constructor() {
        super();
        this.streamId = -1;
        this.unsubscribe = null;
        this._handleMouseEnter = this._handleMouseEnter.bind(this);
        this._handleMouseLeave = this._handleMouseLeave.bind(this);
        this._toggleSelection = this._toggleSelection.bind(this);
        this._handleSeek = this._handleSeek.bind(this);
        this._handleSync = this._handleSync.bind(this);
    }

    static get observedAttributes() {
        return ['stream-id'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'stream-id' && oldValue !== newValue) {
            this.streamId = parseInt(newValue, 10);
            this.reconnectStore();
        }
    }

    connectedCallback() {
        this.reconnectStore();
    }

    disconnectedCallback() {
        if (this.unsubscribe) this.unsubscribe();
        // NOTE: We do NOT destroy the player or video element here.
        // This allows the video element to be reparented if the layout changes.
        // Cleanup happens via explicit 'Remove' action or global destroy.
    }

    reconnectStore() {
        if (this.unsubscribe) this.unsubscribe();
        this.unsubscribe = useMultiPlayerStore.subscribe(() => this.render());
        this.render();
    }

    _handleMouseEnter() {
        useMultiPlayerStore.getState().setHoveredStreamId(this.streamId);
    }

    _handleMouseLeave() {
        useMultiPlayerStore.getState().setHoveredStreamId(null);
    }

    _toggleSelection(e) {
        if (
            e.target.closest('button') ||
            e.target.closest('.interactive-slider')
        )
            return;
        useMultiPlayerStore.getState().toggleStreamSelection(this.streamId);
    }

    _handleSeek(e) {
        e.stopPropagation();
        const player = useMultiPlayerStore
            .getState()
            .players.get(this.streamId);
        if (!player) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.min(1, Math.max(0, x / rect.width));

        const { start, end } = player.seekableRange;
        const duration = end - start;
        if (duration > 0) {
            const targetTime = start + percentage * duration;
            multiPlayerService.seek(targetTime, this.streamId);
        }
    }

    _handleSync(e) {
        e.stopPropagation();
        eventBus.dispatch(EVENTS.UI.MP_SYNC_ALL_TO, {
            streamId: this.streamId,
        });
    }

    injectVideoElement(container) {
        // Retrieve the persistent video element from the service
        const videoElement = multiPlayerService.getVideoElement(this.streamId);

        // Only append if it's not already there to avoid unnecessary DOM ops
        if (container.firstElementChild !== videoElement) {
            container.prepend(videoElement);
        }
    }

    render() {
        const { players, focusedStreamId, layoutMode, showGlobalHud } =
            useMultiPlayerStore.getState();
        const player = players.get(this.streamId);

        if (!player) {
            this.innerHTML = '';
            return;
        }

        // Ensure service has player instance
        if (!multiPlayerService.players.has(this.streamId)) {
            multiPlayerService.createAndLoadPlayer(player);
        }

        const isSelected = player.selectedForAction;
        const isFocused = focusedStreamId === this.streamId;
        const isRemovable = !player.isBasePlayer;

        let borderClasses = 'border-slate-700 hover:border-slate-500';
        if (isFocused && layoutMode === 'focus') {
            borderClasses =
                'border-purple-500 ring-1 ring-purple-500/50 shadow-lg shadow-purple-900/20';
        } else if (isSelected) {
            borderClasses = 'border-blue-500 shadow-lg shadow-blue-900/20';
        }

        // ARCHITECTURAL FIX: Use aspect-video (16:9) instead of h-full.
        // This prevents the card from stretching vertically to fill the grid row in '1fr' scenarios.
        const containerClass = `group relative flex flex-col overflow-hidden rounded-xl bg-slate-950 border-2 transition-all duration-150 w-full aspect-video ${borderClasses}`;

        const progressPercent = (player.normalizedPlayheadTime || 0) * 100;

        // Buffer visualization logic using the persistent video element
        let bufferPercent = 0;
        const persistentVideoEl = multiPlayerService.videoElements.get(
            this.streamId
        );

        if (persistentVideoEl && persistentVideoEl.duration > 0) {
            const end = persistentVideoEl.buffered.length
                ? persistentVideoEl.buffered.end(
                      persistentVideoEl.buffered.length - 1
                  )
                : 0;
            const start = player.seekableRange.start;
            const duration = player.seekableRange.end - start;
            if (duration > 0) {
                bufferPercent = Math.min(
                    100,
                    Math.max(0, ((end - start) / duration) * 100)
                );
            }
        }

        const currentTimeLabel = formatPlayerTime(player.stats.playheadTime);

        const handleMaximize = (e) => {
            e.stopPropagation();
            if (layoutMode === 'focus' && isFocused) {
                eventBus.dispatch('ui:multi-player:set-layout', {
                    mode: 'grid',
                });
            } else {
                eventBus.dispatch('ui:multi-player:set-focus', {
                    streamId: this.streamId,
                });
            }
        };

        const template = html`
            <div
                class="${containerClass}"
                @mouseenter=${this._handleMouseEnter}
                @mouseleave=${this._handleMouseLeave}
                @click=${this._toggleSelection}
            >
                <!-- Selection Checkbox -->
                <div class="absolute top-3 left-3 z-30 pointer-events-none">
                    <div
                        class="w-5 h-5 rounded border ${isSelected
                            ? 'bg-blue-600 border-blue-500'
                            : 'bg-black/50 border-white/30'} flex items-center justify-center shadow-sm transition-colors"
                    >
                        ${isSelected ? icons.checkCircle : ''}
                    </div>
                </div>

                <!-- Header Controls -->
                <div
                    class="absolute top-3 right-3 z-30 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                >
                    <button
                        @click=${(e) => {
                            e.stopPropagation();
                            eventBus.dispatch(EVENTS.UI.MP_DUPLICATE_STREAM, {
                                streamId: this.streamId,
                            });
                        }}
                        class="p-1.5 bg-black/60 hover:bg-slate-700 text-white rounded backdrop-blur border border-white/10 transition-colors"
                        title="Clone Player"
                    >
                        ${icons.copy}
                    </button>
                    <button
                        @click=${handleMaximize}
                        class="p-1.5 bg-black/60 hover:bg-slate-700 text-white rounded backdrop-blur border border-white/10 transition-colors"
                        title="${isFocused && layoutMode === 'focus'
                            ? 'Exit Focus View'
                            : 'Focus View'}"
                    >
                        ${isFocused && layoutMode === 'focus'
                            ? icons.minimize
                            : icons.maximize}
                    </button>

                    <button
                        @click=${(e) => {
                            e.stopPropagation();
                            if (isRemovable) {
                                multiPlayerService.removePlayer(this.streamId);
                            }
                        }}
                        ?disabled=${!isRemovable}
                        class="p-1.5 bg-black/60 text-white rounded backdrop-blur border border-white/10 transition-colors ${isRemovable
                            ? 'hover:bg-red-900/80 cursor-pointer'
                            : 'opacity-30 cursor-not-allowed'}"
                        title="${isRemovable
                            ? 'Close'
                            : 'Base player cannot be removed'}"
                    >
                        ${icons.xCircle}
                    </button>
                </div>

                <!-- Stream Name -->
                <div class="absolute top-3 left-10 z-20 pointer-events-none">
                    <span
                        class="text-xs font-bold text-white bg-black/40 backdrop-blur px-2 py-0.5 rounded text-shadow shadow-sm"
                    >
                        ${player.streamName}
                    </span>
                </div>

                <!-- Video Portal Area -->
                <div
                    class="relative grow min-h-0 bg-black flex items-center justify-center group/video cursor-pointer"
                    id="video-portal-${this.streamId}"
                >
                    <!-- Video Element Injected Here by JS -->

                    ${showGlobalHud && player.isHudVisible
                        ? html`<metrics-hud .data=${player}></metrics-hud>`
                        : ''}
                    ${player.state === 'paused' || player.state === 'idle'
                        ? html`
                              <div
                                  class="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none"
                              >
                                  <div
                                      class="p-3 bg-black/40 rounded-full backdrop-blur-sm border border-white/10 shadow-xl"
                                  >
                                      ${icons.play}
                                  </div>
                              </div>
                          `
                        : ''}
                </div>

                <!-- Transport Bar -->
                <div
                    class="h-9 bg-slate-900 border-t border-slate-800 flex items-center px-3 gap-3 shrink-0 select-none z-20 relative"
                    @click=${(e) => e.stopPropagation()}
                >
                    <button
                        @click=${() =>
                            multiPlayerService.togglePlay(this.streamId)}
                        class="text-slate-300 hover:text-white transition-colors"
                    >
                        ${player.state === 'playing' ||
                        player.state === 'buffering'
                            ? icons.pause
                            : icons.play}
                    </button>

                    <div
                        class="grow h-full flex items-center interactive-slider cursor-pointer group/slider"
                        @click=${this._handleSeek}
                    >
                        <div
                            class="relative w-full h-1.5 bg-slate-700 rounded-full overflow-hidden"
                        >
                            <div
                                class="absolute top-0 left-0 bottom-0 bg-slate-600/40"
                                style="width: ${bufferPercent}%"
                            ></div>
                            <div
                                class="absolute top-0 left-0 bottom-0 bg-blue-500 transition-all duration-100"
                                style="width: ${progressPercent}%"
                            ></div>
                        </div>
                    </div>

                    <div
                        class="text-[10px] font-mono text-slate-400 min-w-[60px] text-right"
                    >
                        ${currentTimeLabel}
                    </div>

                    <div class="flex items-center gap-1">
                        <button
                            @click=${this._handleSync}
                            class="text-slate-500 hover:text-blue-400 transition-colors p-1 rounded hover:bg-white/5"
                            title="Sync all players to this stream"
                        >
                            ${icons.syncMaster}
                        </button>

                        <button
                            @click=${() => {
                                if (persistentVideoEl) {
                                    persistentVideoEl.muted =
                                        !persistentVideoEl.muted;
                                    // Force update to reflect mute state icon
                                    this.render();
                                }
                            }}
                            class="${persistentVideoEl?.muted
                                ? 'text-red-400'
                                : 'text-slate-400 hover:text-white'} transition-colors p-1 rounded hover:bg-white/5"
                        >
                            ${persistentVideoEl?.muted
                                ? icons.volumeOff
                                : icons.volumeUp}
                        </button>
                    </div>
                </div>
            </div>
        `;

        render(template, this);

        // Post-render: Inject the video element into the correct slot
        const videoContainer = this.querySelector(
            `#video-portal-${this.streamId}`
        );
        if (videoContainer) {
            this.injectVideoElement(videoContainer);
        }
    }
}

customElements.define('player-card-component', PlayerCardComponent);
