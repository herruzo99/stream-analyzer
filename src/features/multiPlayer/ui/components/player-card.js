import { html, render } from 'lit-html';
import { multiPlayerService } from '../../application/multiPlayerService';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { debugLog } from '@/shared/utils/debug';
import { eventBus } from '@/application/event-bus';
import * as icons from '@/ui/icons';

export class PlayerCardComponent extends HTMLElement {
    constructor() {
        super();
        this.streamId = -1;
        this._viewModel = null;
        this._isExpanded = false;
    }

    static get observedAttributes() {
        return ['stream-id'];
    }

    set viewModel(newViewModel) {
        if (this._viewModel === newViewModel) return;
        this._viewModel = newViewModel;
        this._isExpanded = useMultiPlayerStore.getState().isAllExpanded;
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
        debugLog(
            'PlayerCard',
            `[LIFECYCLE] connectedCallback for stream ${this.streamId}`
        );
        this.render();
    }

    disconnectedCallback() {
        debugLog(
            'PlayerCard',
            `[LIFECYCLE] disconnectedCallback for stream ${this.streamId}`
        );
    }

    toggleExpand(e) {
        e.stopPropagation();
        this._isExpanded = !this._isExpanded;
        this.render();
    }

    render() {
        if (this.streamId === -1 || !this._viewModel) {
            render(html``, this);
            return;
        }

        const {
            streamName,
            state,
            error,
            streamType,
            health,
            resolution,
            videoBitrate,
            forwardBuffer,
            syncDrift,
            bufferSparklinePoints,
            maxBuffer,
            estBandwidth,
            liveLatency,
            droppedFrames,
            totalStalls,
            stallDuration,
            videoElement,
            isHovered,
        } = this._viewModel;

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
            healthy: 'border-gray-700',
            warning: 'border-yellow-500',
            critical: 'border-red-500',
        };
        const hoverClass = isHovered ? 'ring-2 ring-purple-400' : '';

        const driftSeconds = (
            (syncDrift * (parseFloat(maxBuffer) || 1)) /
            100
        ).toFixed(2);
        const bufferLatencyLabel =
            streamType === 'live' ? 'Live Latency' : 'Fwd Buffer (VOD)';
        const bufferLatencyValue =
            streamType === 'live' ? liveLatency : forwardBuffer;

        const detailsTemplate = html` <div
            class="mt-3 pt-3 border-t border-gray-700/50 grid grid-cols-2 gap-x-3 gap-y-2"
        >
            <div>
                <div class="text-gray-400">Est. Bandwidth</div>
                <div class="font-semibold text-white font-mono">
                    ${estBandwidth}
                </div>
            </div>
            <div>
                <div class="text-gray-400">${bufferLatencyLabel}</div>
                <div class="font-semibold text-white font-mono">
                    ${bufferLatencyValue}s
                </div>
            </div>
            <div>
                <div class="text-gray-400">Dropped Frames</div>
                <div class="font-semibold text-white font-mono">
                    ${droppedFrames}
                </div>
            </div>
            <div>
                <div class="text-gray-400">Stalls / Dur</div>
                <div class="font-semibold text-white font-mono">
                    ${totalStalls} / ${stallDuration}s
                </div>
            </div>
        </div>`;

        const videoContainer = html`
            <div
                class="relative aspect-video bg-black rounded-t-lg overflow-hidden"
            >
                ${videoElement}
                ${error
                    ? html`<div
                          class="absolute inset-0 bg-red-900/80 text-red-200 p-2 text-xs flex items-center justify-center text-center"
                      >
                          ${error}
                      </div>`
                    : ''}
                ${streamType === 'live'
                    ? html`<span
                          class="absolute top-2 right-2 text-xs font-bold px-2 py-1 bg-red-600 text-white rounded-md animate-pulse"
                          >LIVE</span
                      >`
                    : ''}
            </div>
        `;

        const template = html` <style>
                :host {
                    display: contents;
                }
                .sparkline {
                    fill: none;
                    stroke: #3b82f6;
                    stroke-width: 2;
                    stroke-linejoin: round;
                    stroke-linecap: round;
                }
            </style>
            <div
                class="player-card bg-gray-800 rounded-lg border-2 ${healthColors[
                    health
                ]} ${hoverClass} flex flex-col transition-all"
            >
                ${videoContainer}
                <div class="p-3 space-y-3 text-xs">
                    <div class="flex items-start justify-between gap-2">
                        <h4
                            class="font-bold text-gray-200 text-sm truncate flex items-center gap-2"
                            title=${streamName}
                        >
                            <button
                                @click=${() =>
                                    eventBus.dispatch(
                                        'ui:multi-player:sync-all-to',
                                        { streamId: this.streamId }
                                    )}
                                class="text-cyan-400 hover:text-cyan-200 transition-colors"
                                title="Sync all other players to this player's current time"
                            >
                                ${icons.syncMaster}
                            </button>
                            <button
                                @click=${() =>
                                    eventBus.dispatch(
                                        'ui:multi-player:filter-log-to-stream',
                                        { streamId: this.streamId }
                                    )}
                                class="hover:underline"
                                title="Click to filter event log to this stream"
                            >
                                ${streamName}
                            </button>
                        </h4>
                        <div class="flex items-center gap-2 shrink-0">
                            <span
                                class="font-semibold ${state === 'error'
                                    ? 'text-red-400'
                                    : 'text-gray-300'}"
                                >${state.toUpperCase()}</span
                            >
                            <div
                                class="w-3 h-3 rounded-full ${stateColors[
                                    state
                                ] || 'bg-gray-600'}"
                                title="Status: ${state}"
                            ></div>
                        </div>
                    </div>
                    <div class="grid grid-cols-3 gap-3 text-center">
                        <div>
                            <div class="text-gray-400">Resolution</div>
                            <div class="font-semibold text-white font-mono">
                                ${resolution}
                            </div>
                        </div>
                        <div>
                            <div class="text-gray-400">Bitrate</div>
                            <div class="font-semibold text-white font-mono">
                                ${videoBitrate}
                            </div>
                        </div>
                        <div>
                            <div class="text-gray-400">Buffer</div>
                            <div class="font-semibold text-white font-mono">
                                ${forwardBuffer}s
                            </div>
                        </div>
                    </div>
                    <div class="h-10 relative">
                        <svg
                            class="w-full h-full"
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                        >
                            <polyline
                                class="sparkline"
                                points=${bufferSparklinePoints}
                            ></polyline>
                        </svg>
                        <div
                            class="absolute top-0 right-0 text-gray-500 text-[10px] font-mono"
                        >
                            ${maxBuffer}s
                        </div>
                    </div>
                    <div>
                        <div class="text-gray-400 text-center mb-1">
                            Sync Drift
                        </div>
                        <div
                            class="relative h-2 bg-gray-700 rounded-full overflow-hidden"
                        >
                            <div
                                class="absolute top-0 bottom-0 left-1/2 w-px bg-gray-500"
                            ></div>
                            <div
                                class="absolute top-0 bottom-0 h-full bg-cyan-400 rounded-full"
                                style="left: 50%; transform: translateX(-50%) translateX(${syncDrift}%); width: 4px;"
                                title="Drift: ${driftSeconds}s"
                            ></div>
                        </div>
                    </div>
                    ${this._isExpanded ? detailsTemplate : ''}
                </div>
                <div class="border-t border-gray-700/50 mt-auto">
                    <button
                        @click=${(e) => this.toggleExpand(e)}
                        class="w-full text-center text-xs py-1.5 text-gray-400 hover:bg-gray-700/50 hover:text-white"
                    >
                        ${this._isExpanded ? 'Show Less' : 'Show More'}
                    </button>
                </div>
            </div>`;
        render(template, this);
    }
}

if (!customElements.get('player-card-component')) {
    customElements.define('player-card-component', PlayerCardComponent);
}
