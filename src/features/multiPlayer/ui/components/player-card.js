import { html, render } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map.js';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { useUiStore } from '@/state/uiStore';
import { createMultiPlayerGridViewModel } from '../view-model';
import { eventBus } from '@/application/event-bus';
import * as icons from '@/ui/icons';
import { statCardTemplate } from '@/features/summary/ui/components/shared';
import { toggleDropdown } from '@/ui/services/dropdownService';
import {
    audioSelectionPanelTemplate,
    videoSelectionPanelTemplate,
} from '@/features/playerSimulation/ui/components/track-selection-dropdown';
import { formatBitrate } from '@/ui/shared/format';
import { connectedTabBar } from '@/ui/components/tabs';
import { multiPlayerService } from '../../application/multiPlayerService';

const dropdownButton = (label, subtext, onClick, disabled = false) => {
    return html`
        <button
            type="button"
            @click=${onClick}
            class="flex items-center justify-between rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-left transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-full disabled:opacity-50 disabled:cursor-not-allowed"
            ?disabled=${disabled}
        >
            <span class="grid flex-1 grid-cols-1 overflow-hidden">
                <span class="truncate text-sm font-semibold text-slate-100"
                    >${label}</span
                >
                <span class="truncate text-xs text-slate-400">${subtext}</span>
            </span>
            <span class="ml-3 flex-shrink-0 text-slate-400"
                >${icons.chevronDown}</span
            >
        </button>
    `;
};

export class PlayerCardComponent extends HTMLElement {
    constructor() {
        super();
        this.streamId = -1;
        this.isLastInGroup = false;
        this.unsubscribe = null;
        this.uiUnsubscribe = null;
        this.lastRenderedState = {};

        // Bind methods to ensure `this` context is correct
        this._handleAbrToggle = this._handleAbrToggle.bind(this);
        this._handleAudioDropdown = this._handleAudioDropdown.bind(this);
        this._handleSync = this._handleSync.bind(this);
        this._handleDuplicate = this._handleDuplicate.bind(this);
        this._handleRemove = this._handleRemove.bind(this);
        this._handleReset = this._handleReset.bind(this);
        this._handleMouseOver = this._handleMouseOver.bind(this);
        this._handleMouseOut = this._handleMouseOut.bind(this);
    }

    static get observedAttributes() {
        return ['stream-id'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'stream-id' && oldValue !== newValue) {
            this.streamId = parseInt(newValue, 10);
            if (this.unsubscribe) this.unsubscribe();
            if (this.uiUnsubscribe) this.uiUnsubscribe();
            this.subscribeToState();
        }
    }

    connectedCallback() {
        if (this.streamId !== -1 && !this.unsubscribe) {
            this.subscribeToState();
        }
    }

    disconnectedCallback() {
        // Unbind the video element from the service to allow GC
        multiPlayerService.unbindMediaElement(this.streamId);

        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        if (this.uiUnsubscribe) {
            this.uiUnsubscribe();
            this.uiUnsubscribe = null;
        }
        // The service handles player destruction via the 'removePlayer' action
        // or manual call if this component is removed but the stream remains.
        // In this context, we assume unmount means we are done with this specific view instance.
    }

    subscribeToState() {
        const selector = (multiPlayerState) => ({
            player: multiPlayerState.players.get(this.streamId),
            isHovered: multiPlayerState.hoveredStreamId === this.streamId,
            globalAbrEnabled: multiPlayerState.globalAbrEnabled,
            activeTab:
                multiPlayerState.playerCardTabs.get(this.streamId) || 'stats',
            viewMode: useUiStore.getState().multiPlayerViewMode,
        });

        const listener = () => {
            const newState = selector(useMultiPlayerStore.getState());

            // If the player instance doesn't exist in the service map yet (state initialized), create it.
            if (
                newState.player &&
                !multiPlayerService.players.has(this.streamId)
            ) {
                // This creates the player instance but doesn't attach yet if element isn't bound
                multiPlayerService.createAndLoadPlayer(newState.player);
            }

            const tracksChanged =
                newState.player?.variantTracks !==
                this.lastRenderedState.player?.variantTracks;

            if (
                newState.player !== this.lastRenderedState.player ||
                newState.isHovered !== this.lastRenderedState.isHovered ||
                newState.activeTab !== this.lastRenderedState.activeTab ||
                newState.globalAbrEnabled !==
                    this.lastRenderedState.globalAbrEnabled ||
                tracksChanged ||
                newState.viewMode !== this.lastRenderedState.viewMode
            ) {
                this.lastRenderedState = newState;
                this.renderComponent(newState);
            }
        };

        this.unsubscribe = useMultiPlayerStore.subscribe(listener);
        this.uiUnsubscribe = useUiStore.subscribe(listener);

        listener();
    }

    // ... (handlers remain unchanged) ...

    _handleAbrToggle() {
        const player = this.lastRenderedState.player;
        const globalAbrEnabled = this.lastRenderedState.globalAbrEnabled;
        if (!player) return;
        const isAbrEffectivelyEnabled =
            player.abrOverride === null ? globalAbrEnabled : player.abrOverride;
        const newAbrState = !isAbrEffectivelyEnabled;
        eventBus.dispatch('ui:player:set-abr-enabled', {
            streamId: player.streamId,
            enabled: newAbrState,
        });
    }

    _handleAudioDropdown(e) {
        const player = this.lastRenderedState.player;
        if (!player) return;
        toggleDropdown(
            e.currentTarget,
            () =>
                audioSelectionPanelTemplate(player.audioTracks, this.streamId),
            e
        );
    }

    _handleSync() {
        eventBus.dispatch('ui:multi-player:sync-all-to', {
            streamId: this.streamId,
        });
    }

    _handleDuplicate() {
        eventBus.dispatch('ui:multi-player:duplicate-stream', {
            streamId: this.streamId,
        });
    }

    _handleRemove() {
        eventBus.dispatch('ui:multi-player:remove-stream', {
            streamId: this.streamId,
        });
    }

    _handleReset() {
        eventBus.dispatch('ui:multi-player:reset-single', {
            streamId: this.streamId,
        });
    }

    _handleMouseOver() {
        useMultiPlayerStore.getState().setHoveredStreamId(this.streamId);
    }

    _handleMouseOut() {
        useMultiPlayerStore.getState().setHoveredStreamId(null);
    }

    renderComponent({
        player,
        isHovered,
        globalAbrEnabled,
        activeTab,
        viewMode,
    }) {
        if (!player) {
            render(html``, this);
            return;
        }

        const isImmersive = viewMode === 'immersive';

        // --- ARCHITECTURAL REFACTOR: Declarative Video Element ---
        // We render the video tag directly. After render, we bind it to the service.
        const videoContainerClasses = {
            relative: true,
            'bg-black': true,
            'overflow-hidden': true,
            'aspect-video': true,
            'w-full': true,
            'rounded-lg': isImmersive,
            'rounded-t-lg': !isImmersive,
        };

        // Unique ID for query selection if needed, though we use 'this' context
        const videoId = `video-${this.streamId}`;

        const videoContainer = html`
            <div class=${classMap(videoContainerClasses)}>
                <video
                    id="${videoId}"
                    class="w-full h-full"
                    disablePictureInPicture
                ></video>
                ${player.error
                    ? html`<div
                          class="absolute inset-0 bg-red-900/80 text-red-200 p-2 text-xs flex items-center justify-center text-center"
                      >
                          ${player.error}
                      </div>`
                    : ''}
                ${player.streamType === 'live'
                    ? html`<span
                          class="absolute top-2 right-2 text-xs font-bold px-2 py-1 bg-red-600 text-white rounded-md animate-pulse"
                          >LIVE</span
                      >`
                    : ''}
            </div>
        `;
        // --- END REFACTOR ---

        const { cards } = createMultiPlayerGridViewModel(
            new Map([[player.streamId, player]])
        );
        const vm = cards[0];
        if (!vm) return;

        const { players } = useMultiPlayerStore.getState();
        const group = Array.from(players.values()).filter(
            (p) => p.sourceStreamId === player.sourceStreamId
        );
        this.isLastInGroup = group.length <= 1;

        const stateColors = {
            playing: 'bg-green-500',
            paused: 'bg-yellow-500',
            buffering: 'bg-blue-500 animate-pulse',
            ended: 'bg-gray-500',
            error: 'bg-red-500',
            loading: 'bg-gray-500 animate-pulse',
            idle: 'bg-gray-600',
        };
        const healthColors = {
            healthy: 'border-slate-700',
            warning: 'border-yellow-500',
            critical: 'border-red-500',
        };

        const cardClasses = {
            'player-card': true,
            'bg-slate-800': true,
            'rounded-lg': true,
            border: true,
            flex: true,
            'flex-col': true,
            'transition-all': true,
            'w-[420px]': !isImmersive,
            'h-fit': isImmersive,
            'w-full': isImmersive,
            [healthColors[vm.health]]: true,
            'ring-2': isHovered,
            'ring-purple-400': isHovered,
        };

        const isAbrEffectivelyEnabled =
            player.abrOverride === null ? globalAbrEnabled : player.abrOverride;
        const hasOverrides = player.abrOverride !== null;

        const tabs = [
            { key: 'stats', label: 'Stats' },
            {
                key: 'controls',
                label: 'Controls',
                indicator: hasOverrides
                    ? html`<span class="text-yellow-400"
                          >${icons.slidersHorizontal}</span
                      >`
                    : '',
            },
        ];
        const onTabClick = (tab) => {
            eventBus.dispatch('ui:multi-player:set-card-tab', {
                streamId: this.streamId,
                tab,
            });
        };

        const activeVideoTrack = player.activeVideoTrack;
        const videoTrackLabel = isAbrEffectivelyEnabled
            ? 'Auto (ABR)'
            : activeVideoTrack
              ? `${activeVideoTrack.height}p`
              : 'Video';
        const videoTrackSubtext = isAbrEffectivelyEnabled
            ? 'Adapting to network'
            : activeVideoTrack
              ? formatBitrate(activeVideoTrack.bandwidth)
              : 'N/A';
        const activeAudioTrack = player.audioTracks.find((t) => t.active);
        const isPlayerLoading =
            player.state === 'idle' || player.state === 'loading';

        const controlsContent = html` <div class="p-3 space-y-3">
            ${dropdownButton(
                videoTrackLabel,
                videoTrackSubtext,
                (e) =>
                    toggleDropdown(
                        e.currentTarget,
                        () =>
                            videoSelectionPanelTemplate(
                                player.variantTracks,
                                isAbrEffectivelyEnabled,
                                player.streamId
                            ),
                        e
                    ),
                isPlayerLoading
            )}
            ${dropdownButton(
                activeAudioTrack?.label ||
                    activeAudioTrack?.language ||
                    'Audio',
                activeAudioTrack
                    ? `Role: ${activeAudioTrack.roles.join(', ') || 'main'}`
                    : 'N/A',
                this._handleAudioDropdown,
                isPlayerLoading
            )}
        </div>`;

        const statsContent = html` <div class="p-3 grid grid-cols-2 gap-2">
            ${statCardTemplate(vm.stats.buffer)}
            ${statCardTemplate(vm.stats.bitrate)}
            ${statCardTemplate(vm.stats.resolution)}
            ${statCardTemplate(vm.stats.stalls)}
            ${statCardTemplate(vm.stats.bandwidth)}
        </div>`;

        const actionButton = (
            icon,
            title,
            action,
            { disabled = false, colorClass = 'text-slate-400' } = {}
        ) => {
            const classes = {
                [colorClass]: !disabled,
                'hover:text-white':
                    !disabled && colorClass === 'text-slate-400',
                'hover:bg-slate-700': !disabled,
                'text-slate-600': disabled,
                'cursor-not-allowed': disabled,
                'p-1.5': true,
                'rounded-full': true,
                'transition-colors': true,
            };
            return html`<button
                @click=${disabled ? null : action}
                title=${title}
                class=${classMap(classes)}
                ?disabled=${disabled}
            >
                ${icon}
            </button>`;
        };

        const template = html`
            <style>
                :host {
                    display: contents;
                }
            </style>
            <div
                class=${classMap(cardClasses)}
                @mouseover=${this._handleMouseOver}
                @mouseout=${this._handleMouseOut}
            >
                ${videoContainer}
                ${!isImmersive
                    ? html` <div class="p-3 text-xs">
                              <header
                                  class="flex items-start justify-between gap-2"
                              >
                                  <h4
                                      class="font-bold text-slate-200 text-sm truncate"
                                      title=${vm.streamName}
                                  >
                                      ${vm.streamName}
                                  </h4>
                                  <div class="flex items-center gap-1 shrink-0">
                                      <span
                                          class="font-semibold ${vm.error
                                              ? 'text-red-400'
                                              : 'text-slate-300'}"
                                          >${vm.state.toUpperCase()}</span
                                      >
                                      <div
                                          class="w-3 h-3 rounded-full ${stateColors[
                                              vm.state
                                          ] || 'bg-slate-600'}"
                                          title="Status: ${vm.state}"
                                      ></div>
                                      ${actionButton(
                                          icons.sync,
                                          'Reset Player',
                                          this._handleReset,
                                          {
                                              disabled:
                                                  player.state !== 'error',
                                              colorClass: 'text-red-400',
                                          }
                                      )}
                                      ${actionButton(
                                          icons.syncMaster,
                                          'Sync All to This',
                                          this._handleSync
                                      )}
                                      ${actionButton(
                                          icons.clipboardCopy,
                                          'Duplicate Player',
                                          this._handleDuplicate
                                      )}
                                      ${actionButton(
                                          icons.xCircle,
                                          'Remove Player',
                                          this._handleRemove,
                                          { disabled: this.isLastInGroup }
                                      )}
                                  </div>
                              </header>
                          </div>
                          <div class="border-t border-slate-700 mt-auto">
                              ${connectedTabBar(tabs, activeTab, onTabClick)}
                              <div
                                  class="bg-slate-900 rounded-b-lg border-x border-b border-slate-700 min-h-[160px]"
                              >
                                  ${activeTab === 'stats'
                                      ? statsContent
                                      : controlsContent}
                              </div>
                          </div>`
                    : ''}
            </div>
        `;
        render(template, this);

        // --- ARCHITECTURAL REFACTOR: Post-Render Binding ---
        // After rendering, grab the new video element and bind it to the service.
        // This hands off control cleanly without the service owning DOM creation.
        const videoEl = this.querySelector(`#${videoId}`);
        if (videoEl) {
            multiPlayerService.bindMediaElement(
                this.streamId,
                /** @type {HTMLVideoElement} */ (videoEl)
            );
        }
    }
}

if (!customElements.get('player-card-component')) {
    customElements.define('player-card-component', PlayerCardComponent);
}
