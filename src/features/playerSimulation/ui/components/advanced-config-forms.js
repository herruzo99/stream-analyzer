import { eventBus } from '@/application/event-bus';
import { playerActions, usePlayerStore } from '@/state/playerStore';
import { showToast } from '@/ui/components/toast';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const labelClass =
    'text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block';

const presetButton = (label, onClick) => html`
    <button
        type="button"
        @click=${onClick}
        class="px-2 py-1 text-[10px] font-bold rounded bg-slate-800 hover:bg-slate-800 text-slate-100 uppercase tracking-wider transition-colors border border-slate-800"
    >
        ${label}
    </button>
`;

const sliderControl = (name, label, value, min, max, step, unit = '') => html`
    <div class="group">
        <div class="flex justify-between items-baseline mb-1">
            <label
                class="${labelClass} group-hover:text-slate-100 transition-colors"
                >${label}</label
            >
            <span class="font-mono text-xs text-blue-400"
                >${value}${unit}</span
            >
        </div>
        <div class="relative h-4 flex items-center">
            <div
                class="absolute left-0 right-0 h-1 bg-slate-800 rounded-full overflow-hidden"
            >
                <div class="h-full bg-blue-500 opacity-50"></div>
            </div>
            <input
                type="range"
                name="${name}"
                min="${min}"
                max="${max}"
                step="${step}"
                .value="${value}"
                class="relative w-full h-1 bg-transparent appearance-none cursor-pointer accent-blue-500 z-10"
            />
        </div>
    </div>
`;

const toggleControl = (name, label, checked) => html`
    <label class="flex items-center justify-between cursor-pointer group">
        <span
            class="${labelClass} group-hover:text-slate-100 transition-colors"
            >${label}</span
        >
        <div class="relative inline-flex items-center cursor-pointer">
            <input
                type="checkbox"
                name="${name}"
                .checked="${checked}"
                class="sr-only peer"
            />
            <div
                class="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"
            ></div>
        </div>
    </label>
`;

// --- Handlers ---

const dispatchLatencyConfig = (config) => {
    eventBus.dispatch('ui:player:set-latency-config', { config });
    showToast({ message: 'Live Sync settings applied.', type: 'pass' });
};

const dispatchBufferConfig = (config) => {
    eventBus.dispatch('ui:player:set-buffering-strategy', { config });
    showToast({ message: 'Buffer strategy updated.', type: 'pass' });
};

const dispatchAbrConfig = (config) => {
    eventBus.dispatch('ui:player:set-abr-strategy', { config });
    showToast({ message: 'ABR parameters updated.', type: 'pass' });
};

const handleLatencySubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const config = {
        enabled: formData.has('enabled'),
        targetLatency: parseFloat(String(formData.get('targetLatency'))),
        targetLatencyTolerance: parseFloat(
            String(formData.get('targetLatencyTolerance'))
        ),
        maxPlaybackRate: parseFloat(String(formData.get('maxPlaybackRate'))),
        minPlaybackRate: parseFloat(String(formData.get('minPlaybackRate'))),
        panicMode: formData.has('panicMode'),
        panicThreshold: parseFloat(String(formData.get('panicThreshold'))),
    };
    dispatchLatencyConfig(config);
};

const handleBufferSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const config = {
        rebufferingGoal: parseFloat(String(formData.get('rebufferingGoal'))),
        bufferingGoal: parseFloat(String(formData.get('bufferingGoal'))),
        bufferBehind: parseFloat(String(formData.get('bufferBehind'))),
        ignoreTextStreamFailures: formData.has('ignoreTextStreamFailures'),
    };
    dispatchBufferConfig(config);
};

const handleAbrSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const config = {
        bandwidthUpgradeTarget: parseFloat(
            String(formData.get('bandwidthUpgradeTarget'))
        ),
        bandwidthDowngradeTarget: parseFloat(
            String(formData.get('bandwidthDowngradeTarget'))
        ),
    };
    dispatchAbrConfig(config);
};

// --- Templates ---

export const latencyFormTemplate = (config) => {
    const c = config?.streaming?.liveSync || {};
    const enabled = c.enabled ?? false;
    const target = c.targetLatency ?? 3;

    const applyPreset = (mode) => {
        let newConfig = { ...c, enabled: true };
        if (mode === 'low')
            newConfig = {
                ...newConfig,
                targetLatency: 1.5,
                maxPlaybackRate: 1.2,
            };
        if (mode === 'std')
            newConfig = {
                ...newConfig,
                targetLatency: 4.0,
                maxPlaybackRate: 1.1,
            };
        if (mode === 'safe')
            newConfig = {
                ...newConfig,
                targetLatency: 10.0,
                maxPlaybackRate: 1.05,
            };
        dispatchLatencyConfig(newConfig);
    };

    return html`
        <form
            @change=${handleLatencySubmit}
            class="space-y-4 p-4 bg-slate-800 rounded-xl border border-slate-800"
        >
            <div class="flex items-center justify-between mb-2">
                <h4
                    class="text-sm font-bold text-slate-100 flex items-center gap-2"
                >
                    ${icons.clock} Live Sync
                </h4>
                ${toggleControl('enabled', 'Active', enabled)}
            </div>

            <div class="flex gap-2 pb-2 border-b border-slate-800">
                ${presetButton('Low Latency', () => applyPreset('low'))}
                ${presetButton('Standard', () => applyPreset('std'))}
                ${presetButton('Safe', () => applyPreset('safe'))}
            </div>

            <div
                class="grid grid-cols-2 gap-4 opacity-${enabled
                    ? '100'
                    : '50 pointer-events-none'} transition-opacity"
            >
                ${sliderControl(
                    'targetLatency',
                    'Target Latency',
                    target,
                    0.5,
                    30,
                    0.5,
                    's'
                )}
                ${sliderControl(
                    'targetLatencyTolerance',
                    'Tolerance',
                    c.targetLatencyTolerance || 0.5,
                    0,
                    5,
                    0.1,
                    's'
                )}
                ${sliderControl(
                    'maxPlaybackRate',
                    'Max Rate',
                    c.maxPlaybackRate || 1.1,
                    1.0,
                    2.0,
                    0.05,
                    'x'
                )}
                ${sliderControl(
                    'minPlaybackRate',
                    'Min Rate',
                    c.minPlaybackRate || 0.95,
                    0.5,
                    1.0,
                    0.05,
                    'x'
                )}
            </div>
        </form>
    `;
};

export const bufferFormTemplate = (config) => {
    const s = config?.streaming || {};

    const applyPreset = (mode) => {
        let newConfig = { ...s };
        if (mode === 'min')
            newConfig = {
                ...newConfig,
                bufferingGoal: 2,
                rebufferingGoal: 0.5,
            };
        if (mode === 'std')
            newConfig = { ...newConfig, bufferingGoal: 10, rebufferingGoal: 2 };
        if (mode === 'huge')
            newConfig = { ...newConfig, bufferingGoal: 60, rebufferingGoal: 5 };
        dispatchBufferConfig(newConfig);
    };

    return html`
        <form
            @change=${handleBufferSubmit}
            class="space-y-4 p-4 bg-slate-800 rounded-xl border border-slate-800"
        >
            <div class="flex items-center justify-between mb-2">
                <h4
                    class="text-sm font-bold text-slate-100 flex items-center gap-2"
                >
                    ${icons.layers} Buffer Control
                </h4>
            </div>

            <div class="flex gap-2 pb-2 border-b border-slate-800">
                ${presetButton('Minimal', () => applyPreset('min'))}
                ${presetButton('Standard', () => applyPreset('std'))}
                ${presetButton('Large', () => applyPreset('huge'))}
            </div>

            <div class="grid grid-cols-3 gap-4">
                ${sliderControl(
                    'bufferingGoal',
                    'Goal Buffer',
                    s.bufferingGoal || 10,
                    1,
                    60,
                    1,
                    's'
                )}
                ${sliderControl(
                    'rebufferingGoal',
                    'Rebuffer Thresh',
                    s.rebufferingGoal || 2,
                    0.1,
                    10,
                    0.1,
                    's'
                )}
                ${sliderControl(
                    'bufferBehind',
                    'Back Buffer',
                    s.bufferBehind || 30,
                    0,
                    300,
                    10,
                    's'
                )}
            </div>
        </form>
    `;
};

export const abrFormTemplate = (config) => {
    const a = config?.abr || {};

    const applyPreset = (mode) => {
        let newConfig = { ...a };
        if (mode === 'aggressive')
            newConfig = {
                ...newConfig,
                bandwidthUpgradeTarget: 0.75,
                bandwidthDowngradeTarget: 0.85,
            };
        if (mode === 'balanced')
            newConfig = {
                ...newConfig,
                bandwidthUpgradeTarget: 0.85,
                bandwidthDowngradeTarget: 0.95,
            };
        if (mode === 'stable')
            newConfig = {
                ...newConfig,
                bandwidthUpgradeTarget: 0.95,
                bandwidthDowngradeTarget: 0.98,
            };
        dispatchAbrConfig(newConfig);
    };

    return html`
        <form
            @change=${handleAbrSubmit}
            class="space-y-4 p-4 bg-slate-800 rounded-xl border border-slate-800"
        >
            <div class="flex items-center justify-between mb-2">
                <h4
                    class="text-sm font-bold text-slate-100 flex items-center gap-2"
                >
                    ${icons.trendingUp} ABR Tuning
                </h4>
            </div>

            <div class="flex gap-2 pb-2 border-b border-slate-800">
                ${presetButton('Aggressive', () => applyPreset('aggressive'))}
                ${presetButton('Balanced', () => applyPreset('balanced'))}
                ${presetButton('Stable', () => applyPreset('stable'))}
            </div>

            <div class="grid grid-cols-2 gap-4">
                ${sliderControl(
                    'bandwidthUpgradeTarget',
                    'Upgrade Target',
                    a.bandwidthUpgradeTarget || 0.85,
                    0.5,
                    1.0,
                    0.05
                )}
                ${sliderControl(
                    'bandwidthDowngradeTarget',
                    'Downgrade Target',
                    a.bandwidthDowngradeTarget || 0.95,
                    0.5,
                    1.0,
                    0.05
                )}
            </div>
        </form>
    `;
};
export const autoRestartFormTemplate = () => {
    const { isAutoResetEnabled, retryDelayMs } = usePlayerStore.getState();

    return html`
        <div
            class="space-y-4 p-4 bg-slate-800 rounded-xl border border-slate-800"
        >
            <div class="flex items-center justify-between mb-2">
                <h4
                    class="text-sm font-bold text-slate-100 flex items-center gap-2"
                >
                    ${icons.sync} Auto-Restart
                </h4>
                <label
                    class="flex items-center justify-between cursor-pointer group"
                >
                    <span
                        class="${labelClass} group-hover:text-slate-100 transition-colors mr-3"
                        >Active</span
                    >
                    <div
                        class="relative inline-flex items-center cursor-pointer"
                    >
                        <button
                            @click=${() => playerActions.toggleAutoReset()}
                            role="switch"
                            aria-checked="${isAutoResetEnabled}"
                            class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isAutoResetEnabled
                                ? 'bg-blue-500'
                                : 'bg-slate-800'}"
                        >
                            <span
                                class="inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isAutoResetEnabled
                                    ? 'translate-x-5'
                                    : 'translate-x-1'}"
                            ></span>
                        </button>
                    </div>
                </label>
            </div>

            <div class="space-y-3">
                <div>
                    <label class="${labelClass}">Retry Strategy</label>
                    <p
                        class="text-[10px] text-slate-400 mb-2"
                    >
                        Determines wait time between retries
                    </p>

                    <div class="relative">
                        <select
                            @change=${(e) => {
                                const val = parseInt(e.target.value, 10);
                                playerActions.setRetryDelay(val);
                            }}
                            ?disabled=${!isAutoResetEnabled}
                            class="w-full bg-slate-800 text-slate-100 text-xs rounded border border-slate-800 px-2 py-1.5 outline-none focus:border-blue-500 appearance-none disabled:opacity-50"
                        >
                            <option
                                value="2000"
                                ?selected=${retryDelayMs === 2000}
                            >
                                Standard (2s)
                            </option>
                            <option
                                value="1000"
                                ?selected=${retryDelayMs === 1000}
                            >
                                Fast (1s)
                            </option>
                            <option
                                value="500"
                                ?selected=${retryDelayMs === 500}
                            >
                                Intensive (0.5s)
                            </option>
                            <option
                                value="250"
                                ?selected=${retryDelayMs === 250}
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
                                : ''}
                        </div>
                    </div>
                </div>
                ${!isAutoResetEnabled
                    ? html`<p
                          class="text-[9px] text-amber-400 opacity-80"
                      >
                          Enable Auto-Restart to configure strategy
                      </p>`
                    : ''}
            </div>
        </div>
    `;
};
