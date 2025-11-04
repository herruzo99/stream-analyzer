import { html, render } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map.js';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { eventBus } from '@/application/event-bus';
import * as icons from '@/ui/icons';
import { statCardTemplate } from '@/features/summary/ui/components/shared';
import { toggleDropdown } from '@/ui/services/dropdownService';
import {
    videoSelectionPanelTemplate,
    audioSelectionPanelTemplate,
    textSelectionPanelTemplate,
} from '@/features/playerSimulation/ui/components/track-selection-dropdown';
import { formatBitrate } from '@/ui/shared/format';
import { connectedTabBar } from '@/ui/components/tabs';

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
        this._viewModel = null;
        this.isLastInGroup = false;
    }

    static get observedAttributes() {
        return ['stream-id'];
    }

    set viewModel(newViewModel) {
        if (this._viewModel === newViewModel) return;
        this._viewModel = newViewModel;

        const { players } = useMultiPlayerStore.getState();
        const playerState = players.get(this.streamId);
        if (playerState) {
            const group = Array.from(players.values()).filter(
                (p) => p.sourceStreamId === playerState.sourceStreamId
            );
            this.isLastInGroup = group.length <= 1;
        }

        this.render();
    }

    get viewModel() {
        return this._viewModel;
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'stream-id' && oldValue !== newValue) {
            this.streamId = parseInt(newValue, 10);
        }
    }

    connectedCallback() {
        this.render();
    }

    render() {
        if (this.streamId === -1 || !this._viewModel) {
            render(html``, this);
            return;
        }

        const vm = this._viewModel;
        const { globalAbrEnabled, players, playerCardTabs } =
            useMultiPlayerStore.getState();
        const playerState = players.get(this.streamId);
        const activeTab = playerCardTabs.get(this.streamId) || 'stats';

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

        const cardClasses = classMap({
            'player-card': true,
            'bg-slate-800': true,
            'rounded-lg': true,
            border: true,
            flex: true,
            'flex-col': true,
            'transition-all': true,
            'w-[420px]': true, // Enforce fixed width
            [healthColors[vm.health]]: true,
            'ring-2': vm.isHovered,
            'ring-purple-400': vm.isHovered,
        });

        const videoContainer = html`
            <div
                class="relative aspect-video bg-black rounded-t-lg overflow-hidden"
            >
                ${vm.videoElement}
                ${vm.error
                    ? html`<div
                          class="absolute inset-0 bg-red-900/80 text-red-200 p-2 text-xs flex items-center justify-center text-center"
                      >
                          ${vm.error}
                      </div>`
                    : ''}
                ${vm.streamType === 'live'
                    ? html`<span
                          class="absolute top-2 right-2 text-xs font-bold px-2 py-1 bg-red-600 text-white rounded-md animate-pulse"
                          >LIVE</span
                      >`
                    : ''}
            </div>
        `;

        const isAbrEffectivelyEnabled =
            playerState.abrOverride === null
                ? globalAbrEnabled
                : playerState.abrOverride;
        const hasOverrides =
            playerState.abrOverride !== null || !isAbrEffectivelyEnabled;

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

        const activeVideoTrack = playerState.variantTracks.find(
            (t) => t.active
        );
        const activeAudioTrack = playerState.audioTracks.find((t) => t.active);
        const activeTextTrack = playerState.textTracks.find((t) => t.active);

        const isPlayerLoading =
            playerState.state === 'idle' || playerState.state === 'loading';

        const handleAbrToggle = () => {
            const newAbrState = !isAbrEffectivelyEnabled;
            eventBus.dispatch('ui:player:set-abr-enabled', {
                streamId: playerState.streamId,
                enabled: newAbrState,
            });
        };

        const controlsContent = html` <div class="p-3 space-y-3">
            <div class="flex justify-between items-center">
                <label class="font-semibold text-slate-300 text-sm"
                    >ABR Mode</label
                >
                <button
                    @click=${handleAbrToggle}
                    class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50"
                    ?disabled=${isPlayerLoading}
                >
                    <span
                        class="absolute inset-0 rounded-full ${isAbrEffectivelyEnabled
                            ? 'bg-blue-600'
                            : 'bg-slate-600'}"
                    ></span>
                    <span
                        class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAbrEffectivelyEnabled
                            ? 'translate-x-6'
                            : 'translate-x-1'}"
                    ></span>
                </button>
            </div>
            ${dropdownButton(
                isAbrEffectivelyEnabled
                    ? 'Auto (ABR)'
                    : activeVideoTrack
                      ? `${activeVideoTrack.height}p`
                      : 'Video',
                isAbrEffectivelyEnabled
                    ? 'Adapting to network'
                    : activeVideoTrack
                      ? formatBitrate(activeVideoTrack.bandwidth)
                      : 'N/A',
                (e) =>
                    toggleDropdown(
                        e.currentTarget,
                        videoSelectionPanelTemplate(
                            playerState.variantTracks,
                            isAbrEffectivelyEnabled,
                            new Map(),
                            playerState.streamId
                        )
                    ),
                isPlayerLoading || isAbrEffectivelyEnabled
            )}
            ${dropdownButton(
                activeAudioTrack?.label || activeAudioTrack?.language || 'Audio',
                activeAudioTrack
                    ? `Role: ${activeAudioTrack.roles.join(', ') || 'main'}`
                    : 'N/A',
                (e) =>
                    toggleDropdown(
                        e.currentTarget,
                        audioSelectionPanelTemplate(
                            playerState.audioTracks,
                            playerState.streamId
                        )
                    ),
                isPlayerLoading
            )}
            ${dropdownButton(
                activeTextTrack?.label ||
                    activeTextTrack?.language ||
                    'Text Tracks Off',
                activeTextTrack
                    ? `Kind: ${activeTextTrack.kind || 'subtitle'}`
                    : '',
                (e) =>
                    toggleDropdown(
                        e.currentTarget,
                        textSelectionPanelTemplate(
                            playerState.textTracks,
                            playerState.streamId
                        )
                    ),
                isPlayerLoading
            )}
        </div>`;

        const statsContent = html` <div class="p-3 grid grid-cols-2 gap-2">
            ${statCardTemplate(vm.stats.buffer)}
            ${statCardTemplate(vm.stats.bitrate)}
            ${statCardTemplate(vm.stats.resolution)}
            ${statCardTemplate(vm.stats.stalls)}
            ${statCardTemplate(vm.stats.bandwidth)}
            ${statCardTemplate(vm.stats.droppedFrames)}
        </div>`;

        const actionButton = (icon, title, action, disabled = false) => {
            const classes = classMap({
                'text-slate-400': !disabled,
                'hover:text-white': !disabled,
                'hover:bg-slate-700': !disabled,
                'text-slate-600': disabled,
                'cursor-not-allowed': disabled,
                'p-1.5': true,
                'rounded-full': true,
                'transition-colors': true,
            });
            return html`<button
                @click=${disabled ? null : action}
                title=${title}
                class=${classes}
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
                class=${cardClasses}
                @mouseover=${() =>
                    useMultiPlayerStore
                        .getState()
                        .setHoveredStreamId(this.streamId)}
                @mouseout=${() =>
                    useMultiPlayerStore.getState().setHoveredStreamId(null)}
            >
                ${videoContainer}
                <div class="p-3 text-xs">
                    <header class="flex items-start justify-between gap-2">
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
                                icons.syncMaster,
                                'Sync All to This',
                                () =>
                                    eventBus.dispatch(
                                        'ui:multi-player:sync-all-to',
                                        { streamId: this.streamId }
                                    )
                            )}
                            ${actionButton(
                                icons.clipboardCopy,
                                'Duplicate Player',
                                () =>
                                    eventBus.dispatch(
                                        'ui:multi-player:duplicate-stream',
                                        { streamId: this.streamId }
                                    )
                            )}
                            ${actionButton(
                                icons.xCircle,
                                'Remove Player',
                                () =>
                                    eventBus.dispatch(
                                        'ui:multi-player:remove-stream',
                                        { streamId: this.streamId }
                                    ),
                                this.isLastInGroup
                            )}
                        </div>
                    </header>
                </div>
                <div class="border-t border-slate-700 mt-auto">
                    ${connectedTabBar(tabs, activeTab, onTabClick)}
                    <div
                        class="bg-slate-900 rounded-b-lg border-x border-b border-slate-700 min-h-[220px]"
                    >
                        ${activeTab === 'stats' ? statsContent : controlsContent}
                    </div>
                </div>
            </div>
        `;
        render(template, this);
    }
}

if (!customElements.get('player-card-component')) {
    customElements.define('player-card-component', PlayerCardComponent);
}