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
        this.unsubscribe = null;
    }

    connectedCallback() {
        this.render();
        this.unsubscribe = usePlayerStore.subscribe(() => this.render());
    }

    disconnectedCallback() {
        if (this.unsubscribe) this.unsubscribe();
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
                    class="list-none cursor-pointer flex items-center justify-between py-3"
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
                <div class="pb-2">${content}</div>
            </details>
        `;
    }

    _renderTrackSelection({
        videoTracks,
        audioTracks,
        textTracks,
        isAbrEnabled,
        activeVideoTrack,
        activeAudioTrack,
        activeTextTrack,
        streamId,
    }) {
        const videoLabel = isAbrEnabled
            ? 'Auto (ABR)'
            : activeVideoTrack
              ? `${activeVideoTrack.height}p`
              : 'Video';
        const videoSubtext = isAbrEnabled
            ? 'Adapting to network'
            : activeVideoTrack
              ? formatBitrate(activeVideoTrack.bandwidth)
              : 'N/A';
        const audioLabel =
            activeAudioTrack?.label || activeAudioTrack?.language || 'Audio';
        const audioSubtext = activeAudioTrack
            ? `Role: ${activeAudioTrack.roles.join(', ') || 'main'}`
            : 'N/A';
        const textLabel =
            activeTextTrack?.label ||
            activeTextTrack?.language ||
            'Text Tracks Off';
        const textSubtext = activeTextTrack
            ? `Kind: ${activeTextTrack.kind || 'subtitle'}`
            : '';

        const content = html`
            <div class="space-y-2">
                ${dropdownButton(
                    videoLabel,
                    videoSubtext,
                    (e) =>
                        toggleDropdown(
                            e.currentTarget,
                            () =>
                                videoSelectionPanelTemplate(
                                    videoTracks,
                                    isAbrEnabled,
                                    streamId
                                ),
                            e
                        ),
                    {
                        isActive: !isAbrEnabled,
                        tooltip:
                            'Select the video track. "Auto" enables Adaptive Bitrate (ABR).',
                    }
                )}
                ${dropdownButton(
                    audioLabel,
                    audioSubtext,
                    (e) =>
                        toggleDropdown(
                            e.currentTarget,
                            () =>
                                audioSelectionPanelTemplate(
                                    audioTracks,
                                    streamId
                                ),
                            e
                        ),
                    { tooltip: 'Select the active audio language track.' }
                )}
                ${dropdownButton(
                    textLabel,
                    textSubtext,
                    (e) =>
                        toggleDropdown(
                            e.currentTarget,
                            () =>
                                textSelectionPanelTemplate(
                                    textTracks,
                                    streamId
                                ),
                            e
                        ),
                    { tooltip: 'Select the active subtitle or caption track.' }
                )}
            </div>
        `;
        return this._renderSection('Track Selection', content);
    }

    _renderExperiencePresets(config) {
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

        const content = html`
            <div class="space-y-2">
                <div class="flex justify-between items-center">
                    <span class="text-sm text-slate-300">ABR Strategy</span>
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
                                        (preset) => {
                                            eventBus.dispatch(
                                                'ui:player:set-abr-strategy',
                                                { config: preset.config }
                                            );
                                            showToast({
                                                message: `ABR strategy set to ${preset.label}`,
                                                type: 'pass',
                                            });
                                        }
                                    ),
                                e
                            ),
                        {
                            fullWidth: false,
                            tooltip:
                                'Select a preset for Adaptive Bitrate switching behavior.',
                        }
                    )}
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-sm text-slate-300">Max Resolution</span>
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
                                        (preset) => {
                                            eventBus.dispatch(
                                                'ui:player:set-restrictions',
                                                {
                                                    restrictions: {
                                                        minWidth: 0,
                                                        minHeight: 0,
                                                        minBandwidth: 0,
                                                        maxBandwidth: Infinity,
                                                        ...preset.config,
                                                    },
                                                }
                                            );
                                            showToast({
                                                message: `Resolution capped at ${preset.label}`,
                                                type: 'pass',
                                            });
                                        }
                                    ),
                                e
                            ),
                        {
                            fullWidth: false,
                            tooltip:
                                'Set a maximum resolution cap for the player.',
                        }
                    )}
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-sm text-slate-300"
                        >Buffering Profile</span
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
                                        (preset) => {
                                            eventBus.dispatch(
                                                'ui:player:set-buffering-strategy',
                                                {
                                                    config: {
                                                        ...config.streaming,
                                                        ...preset.config,
                                                    },
                                                }
                                            );
                                            showToast({
                                                message: `Buffering profile set to ${preset.label}`,
                                                type: 'pass',
                                            });
                                        }
                                    ),
                                e
                            ),
                        {
                            fullWidth: false,
                            tooltip:
                                "Select a preset for the player's buffering strategy.",
                        }
                    )}
                </div>
            </div>
        `;
        return this._renderSection('Playback Experience Presets', content);
    }

    _renderAdvancedControls(config, isAbrEnabled) {
        const inputBaseClasses =
            'rounded-md bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50';

        const content = html`
            <div class="space-y-4">
                <div>
                    <h5
                        class="font-bold text-slate-400 text-xs uppercase tracking-wider mb-3"
                    >
                        ABR Fine-Tuning
                    </h5>
                    <fieldset ?disabled=${!isAbrEnabled} class="space-y-3">
                        <form
                            data-form-id="abr-config"
                            @change=${this.handleFormChange}
                        >
                            <div class="flex justify-between items-center">
                                <div>
                                    <label
                                        for="bwUpgrade"
                                        class="text-sm font-semibold text-slate-200 ${tooltipTriggerClasses}"
                                        data-tooltip="The fraction of the estimated bandwidth which must be exceeded to upgrade. A lower value is more aggressive (upgrades faster)."
                                        >Bandwidth Upgrade Target</label
                                    >
                                    <p class="text-xs text-slate-400">
                                        Fraction of est. bandwidth to upgrade.
                                        Higher = conservative.
                                    </p>
                                </div>
                                <input
                                    id="bwUpgrade"
                                    type="number"
                                    step="0.05"
                                    min="0"
                                    max="2"
                                    name="bandwidthUpgradeTarget"
                                    class="${inputBaseClasses} w-24 text-center py-1.5"
                                    .value=${config.abr.bandwidthUpgradeTarget}
                                />
                            </div>
                            <div class="flex justify-between items-center">
                                <div>
                                    <label
                                        for="bwDowngrade"
                                        class="text-sm font-semibold text-slate-200 ${tooltipTriggerClasses}"
                                        data-tooltip="The fraction of the estimated bandwidth below which the player will downgrade. A higher value is more conservative (downgrades faster)."
                                        >Bandwidth Downgrade Target</label
                                    >
                                    <p class="text-xs text-slate-400">
                                        Fraction of est. bandwidth to downgrade.
                                        Lower = aggressive.
                                    </p>
                                </div>
                                <input
                                    id="bwDowngrade"
                                    type="number"
                                    step="0.05"
                                    min="0"
                                    max="2"
                                    name="bandwidthDowngradeTarget"
                                    class="${inputBaseClasses} w-24 text-center py-1.5"
                                    .value=${config.abr
                                        .bandwidthDowngradeTarget}
                                />
                            </div>
                        </form>
                    </fieldset>
                </div>
                <div>
                    <h5
                        class="font-bold text-slate-400 text-xs uppercase tracking-wider mb-3"
                    >
                        Explicit Restrictions
                    </h5>
                    <fieldset ?disabled=${!isAbrEnabled}>
                        <form
                            data-form-id="abr-restrictions"
                            @change=${this.handleFormChange}
                            class="grid grid-cols-2 gap-x-4 gap-y-3"
                        >
                            <div>
                                <label class="block text-sm text-slate-300 mb-1"
                                    >Min Bitrate
                                    <span class="text-slate-400"
                                        >(bps)</span
                                    ></label
                                >
                                <input
                                    type="number"
                                    name="minBandwidth"
                                    class="${inputBaseClasses} w-full px-2 py-1.5"
                                    .value=${config.restrictions.minBandwidth}
                                />
                            </div>
                            <div>
                                <label class="block text-sm text-slate-300 mb-1"
                                    >Max Bitrate
                                    <span class="text-slate-400"
                                        >(bps)</span
                                    ></label
                                >
                                <input
                                    type="number"
                                    name="maxBandwidth"
                                    class="${inputBaseClasses} w-full px-2 py-1.5"
                                    .value=${config.restrictions
                                        .maxBandwidth === Infinity
                                        ? ''
                                        : config.restrictions.maxBandwidth}
                                    placeholder="Infinity"
                                />
                            </div>
                            <div>
                                <label class="block text-sm text-slate-300 mb-1"
                                    >Min Height
                                    <span class="text-slate-400"
                                        >(px)</span
                                    ></label
                                >
                                <input
                                    type="number"
                                    name="minHeight"
                                    class="${inputBaseClasses} w-full px-2 py-1.5"
                                    .value=${config.restrictions.minHeight}
                                />
                            </div>
                            <div>
                                <label class="block text-sm text-slate-300 mb-1"
                                    >Max Height
                                    <span class="text-slate-400"
                                        >(px)</span
                                    ></label
                                >
                                <input
                                    type="number"
                                    name="maxHeight"
                                    class="${inputBaseClasses} w-full px-2 py-1.5"
                                    .value=${config.restrictions.maxHeight ===
                                    Infinity
                                        ? ''
                                        : config.restrictions.maxHeight}
                                    placeholder="Infinity"
                                />
                            </div>
                        </form>
                    </fieldset>
                </div>
            </div>
        `;
        return this._renderSection('Advanced Configuration', content, true);
    }

    render() {
        const player = playerService.getPlayer();
        if (!player) {
            render(
                html`<div class="p-4 text-center text-slate-500">
                    Player not initialized.
                </div>`,
                this
            );
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
        const { activeStreamId } = useAnalysisStore.getState();
        const config = playerService.getConfiguration();

        if (!config) {
            render(
                html`<div class="p-4 text-center text-slate-500">
                    Loading configuration...
                </div>`,
                this
            );
            return;
        }

        const template = html`
            <div class="bg-slate-900 text-white px-4">
                ${this._renderTrackSelection({
                    videoTracks,
                    audioTracks,
                    textTracks,
                    isAbrEnabled,
                    activeVideoTrack,
                    activeAudioTrack,
                    activeTextTrack,
                    streamId: activeStreamId,
                })}
                ${this._renderExperiencePresets(config)}
                ${this._renderAdvancedControls(config, isAbrEnabled)}
            </div>
        `;
        render(template, this);
    }
}

if (!customElements.get('player-controls-component')) {
    customElements.define('player-controls-component', PlayerControlsComponent);
}
