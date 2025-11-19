import { html, render } from 'lit-html';
import { usePlayerStore } from '@/state/playerStore';
import * as icons from '@/ui/icons';
import { showToast } from '@/ui/components/toast';
import { toggleDropdown } from '@/ui/services/dropdownService';
import {
    videoSelectionPanelTemplate,
    audioSelectionPanelTemplate,
    textSelectionPanelTemplate,
} from './track-selection-dropdown.js';
import { formattedOptionsDropdownTemplate } from './formatted-options-dropdown.js';
import { formatBitrate } from '@/ui/shared/format';
import {
    ABR_STRATEGY_PRESETS,
    BUFFERING_PRESETS,
    RESOLUTION_PRESETS,
} from '../../domain/control-presets.js';
import '@/ui/components/labeled-control';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { useAnalysisStore } from '@/state/analysisStore.js';
import { eventBus } from '@/application/event-bus.js';
import { playerService } from '../../application/playerService.js';

// --- Utility Functions ---

const findActivePreset = (presets, currentConfigSubset) => {
    if (!currentConfigSubset) {
        return { id: 'custom', label: 'Custom' };
    }
    const activePreset = presets.find((preset) =>
        Object.entries(preset.config).every(
            ([key, value]) => currentConfigSubset[key] === value
        )
    );
    return activePreset || { id: 'custom', label: 'Custom' };
};

// --- UI Components ---

const dropdownButton = (
    label,
    subtext,
    onClick,
    { isActive = false, fullWidth = true, tooltip = '' } = {}
) => {
    const widthClass = fullWidth ? 'w-full' : 'w-auto min-w-[150px]';
    return html`
        <button
            type="button"
            @click=${onClick}
            class="flex items-center justify-between rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-left transition-colors duration-150 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${widthClass} ${isActive
                ? 'ring-2 ring-blue-500 border-transparent'
                : ''}"
            data-tooltip=${tooltip}
        >
            <span class="grid flex-1 grid-cols-1 overflow-hidden">
                <span class="truncate text-sm font-semibold text-slate-100"
                    >${label}</span
                >
                ${subtext
                    ? html`<span class="truncate text-xs text-slate-400"
                          >${subtext}</span
                      >`
                    : ''}
            </span>
            <span class="ml-3 flex-shrink-0 text-slate-400"
                >${icons.chevronDown}</span
            >
        </button>
    `;
};

// --- Main Web Component ---

class PlayerControlsComponent extends HTMLElement {
    constructor() {
        super();
        this.unsubscribePlayer = null;
        this.unsubscribeAnalysis = null;
        this._localLatencyState = null;
    }

    connectedCallback() {
        this.render();
        this.unsubscribePlayer = usePlayerStore.subscribe(() => this.render());
        this.unsubscribeAnalysis = useAnalysisStore.subscribe(() =>
            this.render()
        );
    }

    disconnectedCallback() {
        if (this.unsubscribePlayer) this.unsubscribePlayer();
        if (this.unsubscribeAnalysis) this.unsubscribeAnalysis();
    }

    handleFormChange(e) {
        const form = e.target.closest('form');
        if (!form) return;
        const formData = new FormData(form);
        const formId = form.dataset.formId;

        const actions = {
            'abr-config': () =>
                eventBus.dispatch('ui:player:set-abr-strategy', {
                    config: {
                        bandwidthUpgradeTarget:
                            Number(formData.get('bandwidthUpgradeTarget')) ||
                            0.85,
                        bandwidthDowngradeTarget:
                            Number(formData.get('bandwidthDowngradeTarget')) ||
                            0.95,
                    },
                }),
            'abr-restrictions': () => {
                const maxBw = formData.get('maxBandwidth');
                const maxH = formData.get('maxHeight');
                eventBus.dispatch('ui:player:set-restrictions', {
                    restrictions: {
                        minWidth: Number(formData.get('minWidth')) || 0,
                        maxWidth: maxH === '' ? Infinity : Number(maxH),
                        minHeight: Number(formData.get('minHeight')) || 0,
                        maxHeight: maxH === '' ? Infinity : Number(maxH),
                        minBandwidth: Number(formData.get('minBandwidth')) || 0,
                        maxBandwidth: maxBw === '' ? Infinity : Number(maxBw),
                    },
                });
            },
            buffering: () =>
                eventBus.dispatch('ui:player:set-buffering-strategy', {
                    config: {
                        rebufferingGoal:
                            Number(formData.get('rebufferingGoal')) || 2,
                        bufferingGoal:
                            Number(formData.get('bufferingGoal')) || 10,
                        bufferBehind:
                            Number(formData.get('bufferBehind')) || 30,
                        ignoreTextStreamFailures: formData.has(
                            'ignoreTextStreamFailures'
                        ),
                    },
                }),
        };

        if (actions[formId]) {
            actions[formId]();
            showToast({ message: 'Advanced config updated.', type: 'pass' });
        }
    }

    // --- Render Helpers ---

    _renderSection(title, content, isOpen = true) {
        return html`
            <details class="group" ?open=${isOpen}>
                <summary
                    class="list-none cursor-pointer flex items-center justify-between py-2"
                >
                    <h4
                        class="font-bold text-slate-400 text-xs uppercase tracking-wider"
                    >
                        ${title}
                    </h4>
                    <span
                        class="text-slate-400 transition-transform duration-200 group-open:rotate-180"
                        >${icons.chevronDown}</span
                    >
                </summary>
                <div class="pb-2 space-y-3">${content}</div>
            </details>
        `;
    }

    _renderLiveLatencyControls(config, activeStream) {
        const streamingConfig = config.streaming || {};
        const liveSyncConfig = streamingConfig.liveSync || {};

        const dvrWindowSeconds =
            activeStream?.manifest?.timeShiftBufferDepth ||
            activeStream?.manifest?.summary?.hls?.dvrWindow ||
            30;
        const maxLatency = Math.max(30, dvrWindowSeconds);

        const state = {
            enabled: liveSyncConfig.enabled ?? false,
            targetLatency: Math.min(
                liveSyncConfig.targetLatency ?? 8,
                maxLatency
            ),
            targetLatencyTolerance:
                liveSyncConfig.targetLatencyTolerance ?? 0.5,
            minPlaybackRate: liveSyncConfig.minPlaybackRate ?? 0.95,
            maxPlaybackRate: liveSyncConfig.maxPlaybackRate ?? 1.1,
            panicMode: liveSyncConfig.panicMode ?? false,
            panicThreshold: liveSyncConfig.panicThreshold ?? 60,
            rebufferingGoal: Math.min(
                streamingConfig.rebufferingGoal ?? 2,
                maxLatency
            ),
        };

        const effectiveState = this._localLatencyState || state;

        const applyConfig = (newConfig) => {
            eventBus.dispatch('ui:player:set-latency-config', {
                config: newConfig,
            });
            showToast({ message: 'Latency config updated.', type: 'pass' });
        };

        const setPreset = (preset) => {
            this._localLatencyState = null;
            let newConfig = { ...state };
            if (preset === 'aggressive') {
                newConfig = {
                    ...newConfig,
                    targetLatency: 1.5,
                    rebufferingGoal: 0.1,
                    maxPlaybackRate: 1.2,
                    targetLatencyTolerance: 0.2,
                };
            } else if (preset === 'balanced') {
                newConfig = {
                    ...newConfig,
                    targetLatency: 4,
                    rebufferingGoal: 2,
                    maxPlaybackRate: 1.1,
                    minPlaybackRate: 0.95,
                    targetLatencyTolerance: 0.5,
                };
            } else if (preset === 'stable') {
                newConfig = {
                    ...newConfig,
                    targetLatency: 8,
                    rebufferingGoal: 4,
                    maxPlaybackRate: 1.05,
                    minPlaybackRate: 0.98,
                    targetLatencyTolerance: 1.0,
                };
            }
            applyConfig(newConfig);
        };

        const handleChange = (e) => {
            const form = e.currentTarget;
            if (!form) return;
            const newConfig = { ...effectiveState };
            applyConfig(newConfig);
            this._localLatencyState = null;
        };

        const handleInput = (e) => {
            const form = e.currentTarget.closest('form');
            if (!form) return;
            const formData = new FormData(form);
            this._localLatencyState = {
                enabled: formData.has('enabled'),
                targetLatency: parseFloat(
                    String(formData.get('targetLatency'))
                ),
                rebufferingGoal: parseFloat(
                    String(formData.get('rebufferingGoal'))
                ),
                targetLatencyTolerance: parseFloat(
                    String(formData.get('targetLatencyTolerance'))
                ),
                minPlaybackRate: parseFloat(
                    String(formData.get('minPlaybackRate'))
                ),
                maxPlaybackRate: parseFloat(
                    String(formData.get('maxPlaybackRate'))
                ),
                panicMode: formData.has('panicMode'),
                panicThreshold: parseFloat(
                    String(formData.get('panicThreshold'))
                ),
            };
            this.render();
        };

        const slider = (id, label, value, min, max, step, tooltip) => html`
            <div>
                <div class="flex justify-between items-baseline mb-2 text-sm">
                    <label
                        for=${id}
                        class="font-semibold text-slate-200 ${tooltipTriggerClasses}"
                        data-tooltip=${tooltip}
                        >${label}</label
                    >
                    <span class="font-mono text-slate-300"
                        >${value.toFixed(2)}</span
                    >
                </div>
                <div class="relative h-5">
                    <input
                        type="range"
                        id=${id}
                        name=${id}
                        min=${min}
                        max=${max}
                        step=${step}
                        .value=${String(value)}
                        class="w-full absolute top-1/2 -translate-y-1/2"
                    />
                </div>
            </div>
        `;

        const presets = ['aggressive', 'balanced', 'stable'];

        const content = html`
            <form @change=${handleChange} @input=${handleInput}>
                <labeled-control-component
                    label="Enable Live Sync"
                    description="Dynamically adjust playback rate to chase target latency."
                >
                    <input
                        type="checkbox"
                        name="enabled"
                        ?checked=${effectiveState.enabled}
                        class="toggle"
                    />
                </labeled-control-component>

                <fieldset
                    ?disabled=${!effectiveState.enabled}
                    class="space-y-6"
                >
                    <div class="flex items-center justify-center gap-2 pt-4">
                        ${presets.map(
                            (p) =>
                                html`<button
                                    type="button"
                                    @click=${() => setPreset(p)}
                                    class="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-700 hover:bg-slate-600 transition-colors capitalize"
                                >
                                    ${p}
                                </button>`
                        )}
                    </div>

                    ${slider(
                        'targetLatency',
                        'Target Latency (s)',
                        effectiveState.targetLatency,
                        0.1,
                        maxLatency,
                        0.1,
                        'The ideal latency from the live edge the player will aim for.'
                    )}
                    ${slider(
                        'rebufferingGoal',
                        'Rebuffer Goal (s)',
                        effectiveState.rebufferingGoal,
                        0.1,
                        maxLatency,
                        0.1,
                        'The minimum buffer required to start or resume playback.'
                    )}
                    ${slider(
                        'targetLatencyTolerance',
                        'Tolerance (s)',
                        effectiveState.targetLatencyTolerance,
                        0,
                        5,
                        0.1,
                        'Allowed deviation from target latency before playback rate changes.'
                    )}
                    ${slider(
                        'minPlaybackRate',
                        'Min Playback Rate',
                        effectiveState.minPlaybackRate,
                        0.8,
                        1.0,
                        0.01,
                        'Minimum speed to slow down to when ahead of target latency.'
                    )}
                    ${slider(
                        'maxPlaybackRate',
                        'Max Playback Rate',
                        effectiveState.maxPlaybackRate,
                        1.0,
                        2.0,
                        0.01,
                        'Maximum speed to catch up when behind target latency.'
                    )}

                    <labeled-control-component
                        label="Panic Mode"
                        description="After a stall, slow down to min rate to rebuild buffer."
                    >
                        <input
                            type="checkbox"
                            name="panicMode"
                            ?checked=${effectiveState.panicMode}
                            class="toggle"
                        />
                    </labeled-control-component>
                    <labeled-control-component
                        label="Panic Threshold (s)"
                        description="Seconds to stay in panic mode after a stall."
                    >
                        <input
                            type="number"
                            name="panicThreshold"
                            min="0"
                            step="1"
                            .value=${String(effectiveState.panicThreshold)}
                            ?disabled=${!effectiveState.panicMode}
                            class="w-24 text-center py-1.5 rounded-md bg-slate-800 border border-slate-700"
                        />
                    </labeled-control-component>
                </fieldset>
            </form>
        `;
        return this._renderSection('Live Latency Control', content);
    }

    render() {
        const player = playerService.getPlayer();
        if (!player) {
            return;
        }

        const {
            isAbrEnabled,
            videoTracks,
            audioTracks,
            textTracks,
            activeVideoTrack,
            activeAudioTrack,
            activeTextTrack,
        } = usePlayerStore.getState();
        const { activeStreamId, streams } = useAnalysisStore.getState();
        const activeStream = streams.find((s) => s.id === activeStreamId);
        const isLive = activeStream?.manifest?.type === 'dynamic';

        const config = playerService.getConfiguration();
        if (!config) {
            return;
        }

        const activeAbrPreset = findActivePreset(
            ABR_STRATEGY_PRESETS,
            config.abr
        );
        const activeBufferPreset = findActivePreset(
            BUFFERING_PRESETS,
            config.streaming
        );
        const activeResPreset = findActivePreset(
            RESOLUTION_PRESETS,
            config.restrictions
        );

        const inputBaseClasses =
            'rounded-md bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50';

        const template = html`
            <style>
                input[type='range'] {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 100%;
                    height: 6px;
                    background: #475569; /* slate-600 */
                    border-radius: 3px;
                    outline: none;
                    padding: 0;
                    margin: 0;
                }
                input[type='range']::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 20px;
                    height: 20px;
                    background: #3b82f6; /* blue-500 */
                    border-radius: 50%;
                    cursor: pointer;
                    border: 3px solid #f8fafc; /* slate-50 */
                    box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
                }
                input[type='range']::-moz-range-thumb {
                    width: 20px;
                    height: 20px;
                    background: #3b82f6;
                    border-radius: 50%;
                    cursor: pointer;
                    border: 3px solid #f8fafc;
                }
                .toggle {
                    width: 2.75rem;
                    height: 1.5rem;
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    border-radius: 9999px;
                    transition: background-color 0.2s;
                    -webkit-appearance: none;
                    appearance: none;
                    border: none;
                    cursor: pointer;
                }
                .toggle:checked {
                    background-color: #2563eb;
                }
                .toggle:not(:checked) {
                    background-color: #475569;
                }
                .toggle::before {
                    content: '';
                    display: inline-block;
                    width: 1rem;
                    height: 1rem;
                    background-color: white;
                    border-radius: 9999px;
                    position: absolute;
                    left: 0.25rem;
                    transition: transform 0.2s;
                }
                .toggle:checked::before {
                    transform: translateX(1.25rem);
                }
            </style>
            <div
                class="bg-slate-900 text-white p-4 grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6 h-full"
            >
                <!-- Left Column -->
                <div class="space-y-6">
                    ${this._renderSection(
                        'Track Selection',
                        html`
                            <div class="space-y-2">
                                ${dropdownButton(
                                    isAbrEnabled
                                        ? 'Auto (ABR)'
                                        : activeVideoTrack
                                          ? `${activeVideoTrack.height}p`
                                          : 'Video',
                                    isAbrEnabled
                                        ? 'Adapting to network'
                                        : activeVideoTrack
                                          ? formatBitrate(
                                                activeVideoTrack.bandwidth
                                            )
                                          : 'N/A',
                                    (e) =>
                                        toggleDropdown(
                                            e.currentTarget,
                                            () =>
                                                videoSelectionPanelTemplate(
                                                    videoTracks,
                                                    isAbrEnabled,
                                                    activeStreamId
                                                ),
                                            e
                                        ),
                                    { isActive: !isAbrEnabled }
                                )}
                                ${dropdownButton(
                                    activeAudioTrack?.label ||
                                        activeAudioTrack?.language ||
                                        'Audio',
                                    activeAudioTrack
                                        ? `Role: ${
                                              activeAudioTrack.roles.join(
                                                  ', '
                                              ) || 'main'
                                          }`
                                        : 'N/A',
                                    (e) =>
                                        toggleDropdown(
                                            e.currentTarget,
                                            () =>
                                                audioSelectionPanelTemplate(
                                                    audioTracks,
                                                    activeStreamId
                                                ),
                                            e
                                        )
                                )}
                                ${dropdownButton(
                                    activeTextTrack?.label ||
                                        activeTextTrack?.language ||
                                        'Text Tracks Off',
                                    activeTextTrack
                                        ? `Kind: ${
                                              activeTextTrack.kind || 'subtitle'
                                          }`
                                        : '',
                                    (e) =>
                                        toggleDropdown(
                                            e.currentTarget,
                                            () =>
                                                textSelectionPanelTemplate(
                                                    textTracks,
                                                    activeStreamId
                                                ),
                                            e
                                        )
                                )}
                            </div>
                        `
                    )}
                    ${isLive
                        ? this._renderLiveLatencyControls(config, activeStream)
                        : ''}
                </div>

                <!-- Right Column -->
                <div class="space-y-4">
                    ${this._renderSection(
                        'Advanced Configuration',
                        html`
                            ${this._renderSection(
                                'ABR Fine-Tuning',
                                html` <fieldset
                                    ?disabled=${!isAbrEnabled}
                                    class="space-y-3"
                                >
                                    <form
                                        data-form-id="abr-config"
                                        @change=${this.handleFormChange}
                                    >
                                        <labeled-control-component
                                            label="ABR Strategy"
                                            description="Preset for ABR switching behavior."
                                        >
                                            ${dropdownButton(
                                                activeAbrPreset.label,
                                                '',
                                                (e) =>
                                                    toggleDropdown(
                                                        e.currentTarget,
                                                        () =>
                                                            formattedOptionsDropdownTemplate(
                                                                ABR_STRATEGY_PRESETS,
                                                                activeAbrPreset.id,
                                                                (p) =>
                                                                    eventBus.dispatch(
                                                                        'ui:player:set-abr-strategy',
                                                                        {
                                                                            config: p.config,
                                                                        }
                                                                    )
                                                            ),
                                                        e
                                                    ),
                                                { fullWidth: false }
                                            )}
                                        </labeled-control-component>
                                        <labeled-control-component
                                            label="Bandwidth Upgrade Target"
                                            description="Fraction of est. bandwidth to upgrade. Higher = conservative."
                                        >
                                            <input
                                                type="number"
                                                step="0.05"
                                                min="0"
                                                max="2"
                                                name="bandwidthUpgradeTarget"
                                                class="${inputBaseClasses} w-24 text-center py-1.5"
                                                .value=${config.abr
                                                    .bandwidthUpgradeTarget}
                                            />
                                        </labeled-control-component>
                                        <labeled-control-component
                                            label="Bandwidth Downgrade Target"
                                            description="Fraction of est. bandwidth to downgrade. Lower = aggressive."
                                        >
                                            <input
                                                type="number"
                                                step="0.05"
                                                min="0"
                                                max="2"
                                                name="bandwidthDowngradeTarget"
                                                class="${inputBaseClasses} w-24 text-center py-1.5"
                                                .value=${config.abr
                                                    .bandwidthDowngradeTarget}
                                            />
                                        </labeled-control-component>
                                    </form>
                                </fieldset>`
                            )}
                            ${this._renderSection(
                                'Explicit Restrictions',
                                html` <fieldset
                                    ?disabled=${!isAbrEnabled}
                                    class="space-y-3"
                                >
                                    <form
                                        data-form-id="abr-restrictions"
                                        @change=${this.handleFormChange}
                                    >
                                        <labeled-control-component
                                            label="Max Resolution"
                                        >
                                            ${dropdownButton(
                                                activeResPreset.label,
                                                '',
                                                (e) =>
                                                    toggleDropdown(
                                                        e.currentTarget,
                                                        () =>
                                                            formattedOptionsDropdownTemplate(
                                                                RESOLUTION_PRESETS,
                                                                activeResPreset.id,
                                                                (p) =>
                                                                    eventBus.dispatch(
                                                                        'ui:player:set-restrictions',
                                                                        {
                                                                            restrictions:
                                                                                {
                                                                                    ...config.restrictions,
                                                                                    ...p.config,
                                                                                },
                                                                        }
                                                                    )
                                                            ),
                                                        e
                                                    ),
                                                { fullWidth: false }
                                            )}
                                        </labeled-control-component>
                                        <labeled-control-component
                                            label="Max Bitrate (bps)"
                                        >
                                            <input
                                                type="number"
                                                name="maxBandwidth"
                                                class="${inputBaseClasses} w-full px-2 py-1.5"
                                                .value=${config.restrictions
                                                    .maxBandwidth === Infinity
                                                    ? ''
                                                    : config.restrictions
                                                          .maxBandwidth}
                                                placeholder="Infinity"
                                            />
                                        </labeled-control-component>
                                    </form>
                                </fieldset>`
                            )}
                            ${this._renderSection(
                                'Buffering Strategy',
                                html`
                                    <form
                                        data-form-id="buffering"
                                        @change=${this.handleFormChange}
                                    >
                                        <labeled-control-component
                                            label="Buffering Profile"
                                        >
                                            ${dropdownButton(
                                                activeBufferPreset.label,
                                                '',
                                                (e) =>
                                                    toggleDropdown(
                                                        e.currentTarget,
                                                        () =>
                                                            formattedOptionsDropdownTemplate(
                                                                BUFFERING_PRESETS,
                                                                activeBufferPreset.id,
                                                                (p) =>
                                                                    eventBus.dispatch(
                                                                        'ui:player:set-buffering-strategy',
                                                                        {
                                                                            config: {
                                                                                ...config.streaming,
                                                                                ...p.config,
                                                                            },
                                                                        }
                                                                    )
                                                            ),
                                                        e
                                                    ),
                                                { fullWidth: false }
                                            )}
                                        </labeled-control-component>
                                    </form>
                                `
                            )}
                        `
                    )}
                </div>
            </div>
        `;
        render(template, this);
    }
}

if (!customElements.get('player-controls-component')) {
    customElements.define('player-controls-component', PlayerControlsComponent);
}
