import { html, render } from 'lit-html';
import { eventBus } from '@/application/event-bus';
import '@/ui/components/labeled-control';

const RESOLUTION_OPTIONS = [
    { label: 'Auto', value: Infinity },
    { label: '1080p', value: 1080 },
    { label: '720p', value: 720 },
    { label: '480p', value: 480 },
    { label: '360p', value: 360 },
];

const BUFFER_GOAL_OPTIONS = [
    { label: 'Default (10s)', value: 10 },
    { label: 'Low Latency (3s)', value: 3 },
    { label: 'Stable (30s)', value: 30 },
];

const BANDWIDTH_CAP_OPTIONS = [
    { label: 'Unlimited', value: Infinity },
    { label: 'Fiber (25 Mbps)', value: 25000000 },
    { label: 'DSL (5 Mbps)', value: 5000000 },
    { label: 'Fast 3G (1.5 Mbps)', value: 1500000 },
    { label: 'Slow 3G (500 Kbps)', value: 500000 },
];

const globalControlsTemplate = ({ state }) => {
    return html`
        <div
            class="bg-gray-800 p-3 rounded-lg border border-gray-700 space-y-4"
        >
            <h4 class="text-md font-bold text-gray-300">Global Defaults</h4>

            <div class="space-y-3 p-3 bg-gray-900/50 rounded-md">
                <h5 class="text-sm font-semibold text-gray-400">
                    Streaming Quality
                </h5>
                <labeled-control-component
                    label="Adaptive Bitrate (ABR)"
                    description="Globally enable or disable ABR for all players."
                >
                    <button
                        @click=${() =>
                            eventBus.dispatch(
                                'ui:multi-player:set-global-abr',
                                {
                                    enabled: !state.globalAbrEnabled,
                                }
                            )}
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${state.globalAbrEnabled
                            ? 'bg-blue-600'
                            : 'bg-gray-600'}"
                    >
                        <span
                            class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${state.globalAbrEnabled
                                ? 'translate-x-6'
                                : 'translate-x-1'}"
                        ></span>
                    </button>
                </labeled-control-component>

                <labeled-control-component label="Max Resolution">
                    <select
                        @change=${(e) =>
                            eventBus.dispatch(
                                'ui:multi-player:set-global-max-height',
                                {
                                    height: parseInt(e.target.value),
                                }
                            )}
                        .value=${String(state.globalMaxHeight)}
                        class="bg-gray-700 text-white rounded-md p-1 text-sm border border-gray-600 w-full"
                    >
                        ${RESOLUTION_OPTIONS.map(
                            (opt) =>
                                html`<option value=${String(opt.value)}>
                                    ${opt.label}
                                </option>`
                        )}
                    </select>
                </labeled-control-component>

                <labeled-control-component label="Buffer Goal">
                    <select
                        @change=${(e) =>
                            eventBus.dispatch(
                                'ui:multi-player:set-global-buffer-goal',
                                {
                                    goal: parseInt(e.target.value),
                                }
                            )}
                        .value=${String(state.globalBufferingGoal)}
                        class="bg-gray-700 text-white rounded-md p-1 text-sm border border-gray-600 w-full"
                    >
                        ${BUFFER_GOAL_OPTIONS.map(
                            (opt) =>
                                html`<option value=${String(opt.value)}>
                                    ${opt.label}
                                </option>`
                        )}
                    </select>
                </labeled-control-component>
                <labeled-control-component label="Audio Language">
                    <select
                        @change=${(e) =>
                            eventBus.dispatch(
                                'ui:multi-player:set-global-audio-track',
                                {
                                    lang: e.target.value,
                                }
                            )}
                        class="bg-gray-700 text-white rounded-md p-1 text-sm border border-gray-600 w-full"
                    >
                        <option value="">Auto (Default)</option>
                        ${(state.availableAudioLangs || []).map(
                            (lang) =>
                                html`<option value=${lang}>${lang}</option>`
                        )}
                    </select>
                </labeled-control-component>
            </div>

            <div class="space-y-3 p-3 bg-gray-900/50 rounded-md">
                <h5 class="text-sm font-semibold text-gray-400">
                    Network Simulation
                </h5>
                <labeled-control-component label="Bandwidth Cap">
                    <select
                        @change=${(e) =>
                            eventBus.dispatch(
                                'ui:multi-player:set-global-bandwidth-cap',
                                {
                                    bps: parseInt(e.target.value),
                                }
                            )}
                        .value=${String(state.globalBandwidthCap)}
                        class="bg-gray-700 text-white rounded-md p-1 text-sm border border-gray-600 w-full"
                    >
                        ${BANDWIDTH_CAP_OPTIONS.map(
                            (opt) =>
                                html`<option value=${String(opt.value)}>
                                    ${opt.label}
                                </option>`
                        )}
                    </select>
                </labeled-control-component>
            </div>
        </div>
    `;
};

export class GlobalControlsComponent extends HTMLElement {
    constructor() {
        super();
        this._state = {};
    }

    set state(newState) {
        if (this._state === newState) return;
        this._state = newState;
        this.render();
    }

    get state() {
        return this._state;
    }

    connectedCallback() {
        this.render();
    }

    render() {
        render(globalControlsTemplate({ state: this._state }), this);
    }
}

customElements.define('global-controls', GlobalControlsComponent);
