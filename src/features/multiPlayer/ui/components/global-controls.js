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

const BANDWIDTH_CAP_OPTIONS = [
    { label: 'Unlimited', value: Infinity },
    { label: 'Fiber (25 Mbps)', value: 25000000 },
    { label: 'DSL (5 Mbps)', value: 5000000 },
    { label: 'Fast 3G (1.5 Mbps)', value: 1500000 },
    { label: 'Slow 3G (500 Kbps)', value: 500000 },
];

const globalControlsTemplate = ({ state }) => {
    const selectClasses =
        'bg-slate-700 text-white rounded-md p-1 text-sm border border-slate-600 w-full max-w-[10rem]';

    return html`
        <div class="space-y-4">
            <h4 class="text-md font-bold text-slate-300">Global Settings</h4>

            <div class="space-y-3 p-3 bg-slate-900/50 rounded-md">
                <h5 class="text-sm font-semibold text-slate-400 mb-2">
                    Streaming Behavior
                </h5>
                <labeled-control-component
                    label="Default ABR Mode"
                    description="Set the default ABR behavior for all players."
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
                            : 'bg-slate-600'}"
                    >
                        <span
                            class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${state.globalAbrEnabled
                                ? 'translate-x-6'
                                : 'translate-x-1'}"
                        ></span>
                    </button>
                </labeled-control-component>

                <labeled-control-component
                    label="Global Max Resolution"
                    description="Sets a global resolution cap. ABR will not select tracks above this."
                >
                    <select
                        @change=${(e) =>
                            eventBus.dispatch(
                                'ui:multi-player:set-global-max-height',
                                {
                                    height: parseInt(e.target.value),
                                }
                            )}
                        .value=${String(state.globalMaxHeight)}
                        class=${selectClasses}
                    >
                        ${RESOLUTION_OPTIONS.map(
                            (opt) =>
                                html`<option value=${String(opt.value)}>
                                    ${opt.label}
                                </option>`
                        )}
                    </select>
                </labeled-control-component>

                 <labeled-control-component label="Global Audio Language">
                    <select
                        @change=${(e) =>
                            eventBus.dispatch(
                                'ui:multi-player:set-global-audio-track',
                                {
                                    lang: e.target.value,
                                }
                            )}
                        class=${selectClasses}
                    >
                        <option value="">Auto (Default)</option>
                        ${(state.availableAudioLangs || []).map(
                            (lang) =>
                                html`<option value=${lang}>${lang}</option>`
                        )}
                    </select>
                </labeled-control-component>
            </div>

            <div class="space-y-3 p-3 bg-slate-900/50 rounded-md">
                <h5 class="text-sm font-semibold text-slate-400 mb-2">
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
                        class=${selectClasses}
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