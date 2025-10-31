import { html } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map.js';
import { playerService } from '../../application/playerService';
import { usePlayerStore } from '@/state/playerStore';
import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { showToast } from '@/ui/components/toast';
import { playerStatusDisplayTemplate } from './player-status-display.js';
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

// --- Helper Components ---

/**
 * Identifies the active preset from a list based on the current player configuration.
 * Uses shallow equality check on the config object.
 * @param {Array<object>} presets The list of presets to check against.
 * @param {object} currentConfigSubset The relevant subset of the current player config.
 * @returns {object | undefined} The active preset object or undefined if no match.
 */
const findActivePreset = (presets, currentConfigSubset) => {
    return presets.find((preset) => {
        return Object.entries(preset.config).every(
            ([key, value]) => currentConfigSubset[key] === value
        );
    });
};

const pipButtonTemplate = () => {
    const { isPictureInPicture } = usePlayerStore.getState();
    const isPipSupported = typeof document !== 'undefined' && document.pictureInPictureEnabled;
    if (!isPipSupported) return html``;
    const handleClick = () => isPictureInPicture ? playerService.exitPictureInPicture() : playerService.enterPictureInPicture();
    const icon = isPictureInPicture ? icons.pipExit : icons.pipEnter;
    const label = isPictureInPicture ? 'Exit Picture-in-Picture' : 'Enter Picture-in-Picture';
    return html`
        <button
            @click=${handleClick}
            class="bg-slate-700/50 hover:bg-slate-600/50 text-white font-bold p-2 rounded-md transition duration-300 h-full aspect-square flex items-center justify-center"
            title=${label}
        >
            ${icon}
        </button>
    `;
};

const dropdownButton = (label, subtext, onClick, isActive = false) => html`
    <button
        @click=${onClick}
        class="input-field text-left flex items-center justify-between w-full hover:bg-slate-600 transition-colors ${isActive
            ? 'ring-1 ring-blue-500 border-blue-500'
            : ''}"
    >
        <span class="truncate grid grid-cols-1">
            <span class="font-semibold text-slate-200 truncate">${label}</span>
            ${subtext ? html`<span class="text-xs text-slate-400 truncate">${subtext}</span>` : ''}
        </span>
        <span class="text-slate-400 shrink-0 ml-2">${icons.chevronDown}</span>
    </button>
`;

const modeToggleTemplate = (currentMode) => html`
    <div class="flex bg-slate-900/50 p-1 rounded-lg border border-slate-700/50 w-fit">
        <button
            @click=${() => uiActions.setPlayerControlMode('standard')}
            class="px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${currentMode === 'standard'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'}"
        >
            Standard
        </button>
        <button
            @click=${() => uiActions.setPlayerControlMode('advanced')}
            class="px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${currentMode === 'advanced'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'}"
        >
            Advanced
        </button>
    </div>
`;

const standardModeTemplate = (config) => {
    const activeAbrPreset = findActivePreset(ABR_STRATEGY_PRESETS, config.abr) || { id: 'custom', label: 'Custom' };
    const activeBufferPreset = findActivePreset(BUFFERING_PRESETS, config.streaming) || { id: 'custom', label: 'Custom' };
    const activeResPreset = findActivePreset(RESOLUTION_PRESETS, config.restrictions) || { id: 'custom', label: 'Custom' };

    return html`
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label class="input-label mb-1">ABR Strategy</label>
                ${dropdownButton(
                    activeAbrPreset.label,
                    activeAbrPreset.description || 'Custom config',
                    (e) => toggleDropdown(e.currentTarget, formattedOptionsDropdownTemplate(ABR_STRATEGY_PRESETS, activeAbrPreset.id, (preset) => {
                        playerService.setAbrConfiguration(preset.config);
                        showToast({ message: `ABR strategy set to ${preset.label}`, type: 'pass' });
                    }))
                )}
            </div>
            <div>
                <label class="input-label mb-1">Max Resolution</label>
                ${dropdownButton(
                    activeResPreset.label,
                    activeResPreset.description || 'Custom restrictions',
                    (e) => toggleDropdown(e.currentTarget, formattedOptionsDropdownTemplate(RESOLUTION_PRESETS, activeResPreset.id, (preset) => {
                        playerService.setRestrictions({ minWidth: 0, minHeight: 0, minBandwidth: 0, maxBandwidth: Infinity, ...preset.config });
                        showToast({ message: `Resolution capped at ${preset.label}`, type: 'pass' });
                    }))
                )}
            </div>
            <div>
                <label class="input-label mb-1">Buffering Profile</label>
                ${dropdownButton(
                    activeBufferPreset.label,
                    activeBufferPreset.description || 'Custom config',
                    (e) => toggleDropdown(e.currentTarget, formattedOptionsDropdownTemplate(BUFFERING_PRESETS, activeBufferPreset.id, (preset) => {
                        playerService.setBufferConfiguration({ ...config.streaming, ...preset.config });
                        showToast({ message: `Buffering profile set to ${preset.label}`, type: 'pass' });
                    }))
                )}
            </div>
        </div>
    `;
};

const advancedModeTemplate = (config, handleFormChange, isAbrEnabled) => html`
    <div class="space-y-6">
        <div>
            <h5 class="text-xs font-bold text-slate-400 mb-2 uppercase">ABR Fine-Tuning</h5>
            <fieldset ?disabled=${!isAbrEnabled}>
                <form data-form-id="abr-config" @change=${handleFormChange} class="space-y-3">
                    <div class="${!isAbrEnabled ? 'opacity-50' : ''}">
                        <label class="input-label" for="bw-upgrade">Bandwidth Upgrade Target (fraction)</label>
                        <input type="number" step="0.05" min="0" max="2" name="bandwidthUpgradeTarget" id="bw-upgrade" class="input-field" .value=${config.abr.bandwidthUpgradeTarget} />
                        <p class="text-xs text-slate-500 mt-1">Higher = harder to upgrade.</p>
                    </div>
                    <div class="${!isAbrEnabled ? 'opacity-50' : ''}">
                        <label class="input-label" for="bw-downgrade">Bandwidth Downgrade Target (fraction)</label>
                        <input type="number" step="0.05" min="0" max="2" name="bandwidthDowngradeTarget" id="bw-downgrade" class="input-field" .value=${config.abr.bandwidthDowngradeTarget} />
                        <p class="text-xs text-slate-500 mt-1">Lower = easier to downgrade.</p>
                    </div>
                </form>
            </fieldset>
        </div>
        <div>
            <h5 class="text-xs font-bold text-slate-400 mb-2 uppercase">Explicit Restrictions</h5>
            <fieldset ?disabled=${!isAbrEnabled}>
                <form data-form-id="abr-restrictions" @change=${handleFormChange} class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="input-label">Min Bitrate (bps)</label>
                        <input type="number" name="minBandwidth" class="input-field" .value=${config.restrictions.minBandwidth} />
                    </div>
                    <div>
                        <label class="input-label">Max Bitrate (bps)</label>
                        <input type="number" name="maxBandwidth" class="input-field" .value=${config.restrictions.maxBandwidth === Infinity ? '' : config.restrictions.maxBandwidth} placeholder="Infinity" />
                    </div>
                    <div>
                        <label class="input-label">Min Height (px)</label>
                        <input type="number" name="minHeight" class="input-field" .value=${config.restrictions.minHeight} />
                    </div>
                    <div>
                        <label class="input-label">Max Height (px)</label>
                        <input type="number" name="maxHeight" class="input-field" .value=${config.restrictions.maxHeight === Infinity ? '' : config.restrictions.maxHeight} placeholder="Infinity" />
                    </div>
                </form>
            </fieldset>
        </div>
        <div>
            <h5 class="text-xs font-bold text-slate-400 mb-2 uppercase">Buffering Engine</h5>
            <form data-form-id="buffering" @change=${handleFormChange} class="space-y-3">
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="input-label" for="rebuffer-goal">Rebuffer Goal (s)</label>
                        <input type="number" step="0.5" name="rebufferingGoal" id="rebuffer-goal" class="input-field" .value=${config.streaming.rebufferingGoal} />
                    </div>
                    <div>
                        <label class="input-label" for="buffer-goal">Buffer Goal (s)</label>
                        <input type="number" step="1" name="bufferingGoal" id="buffer-goal" class="input-field" .value=${config.streaming.bufferingGoal} />
                    </div>
                </div>
                <div>
                    <label class="input-label" for="buffer-behind">Buffer Behind (s)</label>
                    <input type="number" step="1" name="bufferBehind" id="buffer-behind" class="input-field" .value=${config.streaming.bufferBehind} />
                </div>
                <div class="flex items-center gap-2 pt-1">
                    <input type="checkbox" name="ignoreTextStreamFailures" id="ignore-text-failures" .checked=${config.streaming.ignoreTextStreamFailures} class="rounded bg-slate-700 border-slate-600 text-blue-600 focus:ring-offset-slate-800" />
                    <label for="ignore-text-failures" class="input-label mb-0! cursor-pointer">Ignore Text Stream Failures</label>
                </div>
            </form>
        </div>
    </div>
`;

export const playerControlsTemplate = () => {
    const { streams, activeStreamId } = useAnalysisStore.getState();
    const { playerControlMode } = useUiStore.getState();
    const stream = streams.find((s) => s.id === activeStreamId);
    const player = playerService.getPlayer();

    if (!stream || !player) {
        return html`<div class="text-center text-slate-500 py-4">Player not initialized.</div>`;
    }

    const config = playerService.getConfiguration();
    if (!config) {
        return html`<div class="text-center text-slate-500 py-4">Loading configuration...</div>`;
    }

    const isAbrEnabled = config.abr.enabled;

    const handleFormChange = (e) => {
        const form = e.target.closest('form');
        if (!form) return;
        const formData = new FormData(form);
        const formId = form.dataset.formId;

        const actions = {
            'abr-config': () => playerService.setAbrConfiguration({
                bandwidthUpgradeTarget: Number(formData.get('bandwidthUpgradeTarget')) || 0.85,
                bandwidthDowngradeTarget: Number(formData.get('bandwidthDowngradeTarget')) || 0.95,
            }),
            'abr-restrictions': () => {
                const maxBw = formData.get('maxBandwidth');
                const maxH = formData.get('maxHeight');
                playerService.setRestrictions({
                    minWidth: Number(formData.get('minWidth')) || 0,
                    maxWidth: maxH === '' ? Infinity : Number(maxH),
                    minHeight: Number(formData.get('minHeight')) || 0,
                    maxHeight: maxH === '' ? Infinity : Number(maxH),
                    minBandwidth: Number(formData.get('minBandwidth')) || 0,
                    maxBandwidth: maxBw === '' ? Infinity : Number(maxBw),
                });
            },
            buffering: () => playerService.setBufferConfiguration({
                rebufferingGoal: Number(formData.get('rebufferingGoal')) || 2,
                bufferingGoal: Number(formData.get('bufferingGoal')) || 10,
                bufferBehind: Number(formData.get('bufferBehind')) || 30,
                ignoreTextStreamFailures: formData.has('ignoreTextStreamFailures'),
            }),
        };

        if (actions[formId]) {
            actions[formId]();
            showToast({ message: 'Advanced config updated.', type: 'pass' });
        }
    };

    const manifest = player.getManifest();
    const videoTracks = player.getVariantTracks().filter((t) => t.type === 'variant' && t.videoCodec);
    const audioTracks = player.getAudioLanguagesAndRoles();
    const textTracks = player.getTextTracks();

    const videoBandwidthMap = new Map();
    if (manifest && manifest.variants) {
        for (const variant of manifest.variants) {
            if (variant.video && variant.video.bandwidth) {
                videoBandwidthMap.set(variant.id, variant.video.bandwidth);
            }
        }
    }

    const activeVideoTrack = videoTracks.find((t) => t.active);
    const activeAudioTrack = audioTracks.find((t) => t.active);
    const activeTextTrack = textTracks.find((t) => t.active);

    const videoButtonLabel = isAbrEnabled ? 'Auto (ABR)' : (activeVideoTrack ? `${activeVideoTrack.height}p` : 'Video');
    const videoButtonSubtext = isAbrEnabled
        ? 'Adapting to network'
        : activeVideoTrack
          ? formatBitrate(videoBandwidthMap.get(activeVideoTrack.id) ?? activeVideoTrack.bandwidth)
          : 'N/A';

    const audioButtonLabel = activeAudioTrack ? activeAudioTrack.label || activeAudioTrack.language : 'Audio';
    const audioButtonSubtext = activeAudioTrack ? `Role: ${activeAudioTrack.roles.join(', ') || 'main'}` : 'N/A';

    const textButtonLabel = activeTextTrack ? activeTextTrack.label || activeTextTrack.language : 'Text Tracks Off';
    const textButtonSubtext = activeTextTrack ? `Kind: ${activeTextTrack.kind || 'subtitle'}` : '';

    const trackSelectionContent = html`
        <div class="flex items-stretch gap-2">
            <div class="grow space-y-2 text-sm">
                ${dropdownButton(
                    videoButtonLabel,
                    videoButtonSubtext,
                    (e) => toggleDropdown(e.currentTarget, videoSelectionPanelTemplate(videoTracks, isAbrEnabled, videoBandwidthMap)),
                    !isAbrEnabled
                )}
                ${dropdownButton(audioButtonLabel, audioButtonSubtext, (e) =>
                    toggleDropdown(e.currentTarget, audioSelectionPanelTemplate(audioTracks))
                )}
                ${dropdownButton(textButtonLabel, textButtonSubtext, (e) =>
                    toggleDropdown(e.currentTarget, textSelectionPanelTemplate(textTracks))
                )}
            </div>
            <div class="shrink-0">${pipButtonTemplate()}</div>
        </div>
    `;

    const configContent = playerControlMode === 'standard'
        ? standardModeTemplate(config)
        : advancedModeTemplate(config, handleFormChange, isAbrEnabled);

    return html`
        <style>
            .input-field { background-color: var(--color-bg-inset); color: var(--color-text-primary); border-radius: 0.375rem; padding: 0.5rem 0.75rem; border: 1px solid var(--color-border-primary); }
            .input-field:focus { outline: none; border-color: var(--color-info); }
            .input-label { font-size: 0.75rem; font-weight: 600; color: var(--color-text-secondary); display: block; margin-bottom: 0.25rem; }
        </style>
        <div class="space-y-6">
            ${playerStatusDisplayTemplate()}
            <div class="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <h4 class="font-bold text-slate-300 mb-3 text-sm uppercase tracking-wider">Track Selection</h4>
                ${trackSelectionContent}
            </div>
            <div class="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <div class="flex justify-between items-center mb-3">
                    <h4 class="font-bold text-slate-300 text-sm uppercase tracking-wider">
                        ${playerControlMode === 'standard' ? 'Playback Experience' : 'Advanced Configuration'}
                    </h4>
                    ${modeToggleTemplate(playerControlMode)}
                </div>
                <div>${configContent}</div>
            </div>
        </div>
    `;
};