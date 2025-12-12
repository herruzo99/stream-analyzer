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
        // Ignore clicks on interactive elements
        if (e.target.closest('button') || e.target.closest('.interactive-slider'))
            return;
        useMultiPlayerStore.getState().toggleStreamSelection(this.streamId);
    }

    _handleSeek(e) {
        e.stopPropagation();
        const player = useMultiPlayerStore.getState().players.get(this.streamId);
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
        const videoElement = multiPlayerService.getVideoElement(this.streamId);
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

        if (!multiPlayerService.players.has(this.streamId)) {
            multiPlayerService.createAndLoadPlayer(player);
        }

        const isSelected = player.selectedForAction;
        const isFocused = focusedStreamId === this.streamId;
        const isRemovable = !player.isBasePlayer;

        // Container styling - using aspect-video to maintain shape without fixed height
        let borderClasses = 'border-slate-800 hover:border-slate-600';
        if (isFocused && layoutMode === 'focus') {
            borderClasses = 'border-purple-500 ring-1 ring-purple-500/50 shadow-2xl';
        } else if (isSelected) {
            borderClasses = 'border-blue-500 shadow-xl shadow-blue-900/20';
        }

        const containerClass = `group relative flex flex-col overflow-hidden rounded-xl bg-black border-2 transition-all duration-200 w-full aspect-video ${borderClasses}`;

        const progressPercent = (player.normalizedPlayheadTime || 0) * 100;
        const currentTimeLabel = formatPlayerTime(player.stats.playheadTime);

        // Get persistent video element for buffer/mute state
        let bufferPercent = 0;
        const persistentVideoEl = multiPlayerService.videoElements.get(this.streamId);
        const isMuted = persistentVideoEl?.muted ?? true;

        if (persistentVideoEl && persistentVideoEl.duration > 0) {
            const end = persistentVideoEl.buffered.length
                ? persistentVideoEl.buffered.end(persistentVideoEl.buffered.length - 1)
                : 0;
            const start = player.seekableRange.start;
            const duration = player.seekableRange.end - start;
            if (duration > 0) {
                bufferPercent = Math.min(100, Math.max(0, ((end - start) / duration) * 100));
            }
        }

        const handleMaximize = (e) => {
            e.stopPropagation();
            if (layoutMode === 'focus' && isFocused) {
                eventBus.dispatch('ui:multi-player:set-layout', { mode: 'grid' });
            } else {
                eventBus.dispatch('ui:multi-player:set-focus', { streamId: this.streamId });
            }
        };

        const template = html`
            <div
                class="${containerClass}"
                @mouseenter=${this._handleMouseEnter}
                @mouseleave=${this._handleMouseLeave}
                @click=${this._toggleSelection}
            >
                <!-- TOP CONTROLS (Always visible on selection, or hover) -->
                <div class="absolute top-0 left-0 right-0 p-2 flex justify-between items-start z-30 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
                    
                    <!-- Left: Identity & Selection -->
                    <div class="flex items-center gap-2 pointer-events-auto">
                         <div
                            @click=${this._toggleSelection}
                            class="w-5 h-5 rounded cursor-pointer border transition-colors flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-500 text-white' : 'bg-black/50 border-white/30 hover:border-white'}"
                        >
                            ${isSelected ? icons.checkCircle : ''}
                        </div>
                        <span class="text-[10px] font-bold text-white bg-black/50 backdrop-blur px-2 py-0.5 rounded border border-white/10 shadow-sm truncate max-w-[150px]">
                            ${player.streamName}
                        </span>
                    </div>

                    <!-- Right: Window Actions -->
                    <div class="flex items-center gap-1 pointer-events-auto">
                         <button
                            @click=${(e) => {
                                e.stopPropagation();
                                eventBus.dispatch(EVENTS.UI.MP_DUPLICATE_STREAM, { streamId: this.streamId });
                            }}
                            class="p-1.5 bg-black/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded backdrop-blur border border-white/10 transition-colors"
                            title="Clone"
                        >
                            ${icons.copy}
                        </button>
                        <button
                            @click=${handleMaximize}
                            class="p-1.5 bg-black/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded backdrop-blur border border-white/10 transition-colors"
                            title="${isFocused && layoutMode === 'focus' ? 'Grid View' : 'Focus View'}"
                        >
                            ${isFocused && layoutMode === 'focus' ? icons.minimize : icons.maximize}
                        </button>
                         <button
                            @click=${(e) => {
                                e.stopPropagation();
                                if (isRemovable) multiPlayerService.removePlayer(this.streamId);
                            }}
                            class="p-1.5 bg-black/50 rounded backdrop-blur border border-white/10 transition-colors ${isRemovable ? 'text-slate-300 hover:text-red-400 hover:bg-red-900/30' : 'text-slate-600 cursor-not-allowed'}"
                            ?disabled=${!isRemovable}
                            title="Close"
                        >
                            ${icons.xCircle}
                        </button>
                    </div>
                </div>

                <!-- VIDEO PORTAL AREA -->
                <div class="relative grow min-h-0 bg-black flex items-center justify-center w-full" id="video-portal-${this.streamId}">
                    <!-- Video injected here by JS -->
                    
                    ${showGlobalHud && player.isHudVisible ? html`<metrics-hud .data=${player}></metrics-hud>` : ''}
                    
                    ${player.state === 'paused' || player.state === 'idle'
                        ? html`
                              <div class="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none z-10">
                                  <div class="p-3 bg-black/40 rounded-full backdrop-blur-sm border border-white/10 shadow-xl scale-75 group-hover:scale-100 transition-transform">
                                      ${icons.play}
                                  </div>
                              </div>
                          `
                        : ''}

                    <!-- FLOATING COMPACT HUD (Bottom Overlay) -->
                    <div class="absolute bottom-2 left-2 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div class="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-lg p-2 shadow-xl ring-1 ring-black/20 flex flex-col gap-1">
                            
                            <!-- Progress Rail -->
                            <div 
                                class="relative h-1.5 w-full bg-slate-700/50 rounded-full cursor-pointer group/slider overflow-hidden interactive-slider"
                                @click=${this._handleSeek}
                            >
                                <div class="absolute top-0 left-0 bottom-0 bg-white/10" style="width: ${bufferPercent}%"></div>
                                <div class="absolute top-0 left-0 bottom-0 bg-blue-500 transition-all duration-100" style="width: ${progressPercent}%"></div>
                            </div>

                            <!-- Controls Row -->
                            <div class="flex items-center justify-between mt-1">
                                <div class="flex items-center gap-2">
                                     <button
                                        @click=${() => multiPlayerService.togglePlay(this.streamId)}
                                        class="text-slate-200 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
                                    >
                                        <div class="scale-75">
                                            ${player.state === 'playing' || player.state === 'buffering' ? icons.pause : icons.play}
                                        </div>
                                    </button>
                                    <span class="text-[9px] font-mono text-slate-400 select-none">${currentTimeLabel}</span>
                                </div>

                                <div class="flex items-center gap-1">
                                    <button
                                        @click=${this._handleSync}
                                        class="text-slate-400 hover:text-blue-400 transition-colors p-1 rounded hover:bg-white/5"
                                        title="Sync others to this"
                                    >
                                        <div class="scale-75">${icons.syncMaster}</div>
                                    </button>
                                    <button
                                        @click=${(e) => {
                                            e.stopPropagation();
                                            if (persistentVideoEl) {
                                                persistentVideoEl.muted = !persistentVideoEl.muted;
                                                this.render();
                                            }
                                        }}
                                        class="p-1 rounded hover:bg-white/5 transition-colors ${isMuted ? 'text-red-400' : 'text-slate-400 hover:text-white'}"
                                    >
                                        <div class="scale-75">
                                            ${isMuted ? icons.volumeOff : icons.volumeUp}
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        render(template, this);

        const videoContainer = this.querySelector(`#video-portal-${this.streamId}`);
        if (videoContainer) {
            this.injectVideoElement(videoContainer);
        }
    }
}

customElements.define('player-card-component', PlayerCardComponent);