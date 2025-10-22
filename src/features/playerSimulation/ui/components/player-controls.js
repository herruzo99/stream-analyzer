import { html } from 'lit-html';
import { playerService } from '../../application/playerService';
import { usePlayerStore } from '@/state/playerStore';
import { useAnalysisStore } from '@/state/analysisStore';
import {
    togglePlayerAndPolling,
    reloadStream,
} from '@/ui/services/streamActionsService';
import * as icons from '@/ui/icons';
import { showToast } from '@/ui/components/toast';
import { playerStatusDisplayTemplate } from './player-status-display.js';

const controlSectionTemplate = (title, content, disabled = false) => html`
    <div
        class="bg-gray-800 p-4 rounded-lg transition-opacity ${disabled
            ? 'opacity-50 pointer-events-none'
            : ''}"
    >
        <h4 class="font-bold text-gray-300 mb-3">${title}</h4>
        <fieldset ?disabled=${disabled}>${content}</fieldset>
    </div>
`;

export const playerControlsTemplate = () => {
    const { streams, activeStreamId } = useAnalysisStore.getState();
    const { isLoaded: isPlayerLoaded } = usePlayerStore.getState();
    const stream = streams.find((s) => s.id === activeStreamId);
    const player = playerService.getPlayer();

    if (!stream || !player) {
        return html`<div class="text-center text-gray-500 py-4">Player not initialized.</div>`;
    }

    const config = playerService.getConfiguration();
    if (!config) {
        return html`<div class="text-center text-gray-500 py-4">Loading configuration...</div>`;
    }

    const isLive = stream.manifest?.type === 'dynamic';
    const isPolling = isLive && stream.isPolling;
    const isActive = isPolling || isPlayerLoaded;
    const isAbrEnabled = config.abr.enabled;

    const handleFormChange = (e) => {
        const form = e.target.closest('form');
        if (!form) return;

        const formData = new FormData(form);

        switch (form.dataset.formId) {
            case 'abr-config':
                playerService.setAbrConfiguration({
                    bandwidthUpgradeTarget:
                        Number(formData.get('bandwidthUpgradeTarget')) || 0,
                    bandwidthDowngradeTarget:
                        Number(formData.get('bandwidthDowngradeTarget')) || 0,
                });
                break;
            case 'abr-restrictions':
                playerService.setRestrictions({
                    minWidth: Number(formData.get('minWidth')) || 0,
                    maxWidth: Number(formData.get('maxWidth')) || Infinity,
                    minHeight: Number(formData.get('minHeight')) || 0,
                    maxHeight: Number(formData.get('maxHeight')) || Infinity,
                    minBandwidth: Number(formData.get('minBandwidth')) || 0,
                    maxBandwidth: Number(formData.get('maxBandwidth')) || Infinity,
                });
                break;
            case 'buffering':
                playerService.setBufferConfiguration({
                    rebufferingGoal:
                        Number(formData.get('rebufferingGoal')) || 2,
                    bufferingGoal: Number(formData.get('bufferingGoal')) || 10,
                    bufferBehind: Number(formData.get('bufferBehind')) || 30,
                    ignoreTextStreamFailures: formData.has(
                        'ignoreTextStreamFailures'
                    ),
                });
                break;
        }
        showToast({ message: 'Player config updated.', type: 'pass' });
    };

    const videoTracks = player.getVariantTracks().filter((t) => t.type === 'variant' && t.videoCodec);
    const audioTracks = player.getAudioLanguagesAndRoles();
    const textTracks = player.getTextTracks();

    const masterControls = controlSectionTemplate(
        'Master Controls',
        html`
            <div @change=${handleFormChange} class="flex items-center gap-2">
                <button @click=${togglePlayerAndPolling} class="px-4 py-2 font-bold rounded-md flex items-center gap-2 transition-colors ${isActive ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}">
                    ${isActive ? icons.pause : icons.play}
                    <span>${isActive ? 'Stop Loading' : 'Start Loading'}</span>
                </button>
                <button @click=${() => reloadStream(stream)} class="px-4 py-2 font-bold rounded-md flex items-center gap-2 transition-colors bg-gray-600 hover:bg-gray-700 text-white">
                    ${icons.updates}
                    <span>Force Reload</span>
                </button>
            </div>
        `
    );

    const trackSelection = controlSectionTemplate(
        'Track Selection',
        html`
            <div @change=${handleFormChange} class="space-y-2 text-sm">
                <select @change=${(e) => {
                    const isAuto = e.target.value === '-1';
                    playerService.setAbrEnabled(isAuto);
                    if (!isAuto) {
                        playerService.selectVariantTrack(videoTracks.find((t) => t.id == e.target.value));
                    }
                }} class="input-field">
                    <option value="-1" ?selected=${isAbrEnabled}>Auto (ABR)</option>
                    ${videoTracks.map(track => html`
                        <option value=${track.id} ?selected=${track.active && !isAbrEnabled}>
                            ${track.height}p @ ${(track.bandwidth / 1000).toFixed(0)}kbps
                        </option>`
                    )}
                </select>
                 <select @change=${(e) => playerService.selectAudioLanguage(e.target.value)} class="input-field">
                    ${audioTracks.map(track => html`
                        <option value=${track.language} ?selected=${track.active}>Audio: ${track.language}</option>
                    `)}
                </select>
                <select @change=${(e) => playerService.selectTextTrack(textTracks.find((t) => t.id == e.target.value))} class="input-field">
                    <option value="-1">Text Tracks Off</option>
                    ${textTracks.map(track => html`
                        <option value=${track.id} ?selected=${track.active}>Subtitles: ${track.language}</option>
                    `)}
                </select>
            </div>
        `
    );

    const abrConfig = controlSectionTemplate(
        'ABR Strategy',
        html`
            <form data-form-id="abr-config" @change=${handleFormChange} class="space-y-2 text-sm">
                 <label class="input-label" for="bw-upgrade">Bandwidth Upgrade Target (fraction)</label>
                <input type="number" step="0.1" name="bandwidthUpgradeTarget" id="bw-upgrade" class="input-field" .value=${config.abr.bandwidthUpgradeTarget}>
                <label class="input-label" for="bw-downgrade">Bandwidth Downgrade Target (fraction)</label>
                <input type="number" step="0.1" name="bandwidthDowngradeTarget" id="bw-downgrade" class="input-field" .value=${config.abr.bandwidthDowngradeTarget}>
            </form>
        `,
        !isAbrEnabled
    );

    const abrRestrictions = controlSectionTemplate(
        'ABR Restrictions',
        html`
            <form data-form-id="abr-restrictions" @change=${handleFormChange} class="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <input type="number" name="minBandwidth" placeholder="Min Bitrate (bps)" class="input-field" .value=${config.restrictions.minBandwidth}>
                <input type="number" name="maxBandwidth" placeholder="Max Bitrate (bps)" class="input-field" .value=${config.restrictions.maxBandwidth}>
                <input type="number" name="minHeight" placeholder="Min Height (px)" class="input-field" .value=${config.restrictions.minHeight}>
                <input type="number" name="maxHeight" placeholder="Max Height (px)" class="input-field" .value=${config.restrictions.maxHeight}>
            </form>
        `,
        !isAbrEnabled
    );

    const bufferingConfig = controlSectionTemplate(
        'Buffering & Streaming',
        html`
            <form data-form-id="buffering" @change=${handleFormChange} class="space-y-2 text-sm">
                 <label class="input-label" for="rebuffer-goal">Rebuffering Goal (seconds)</label>
                <input type="number" step="1" name="rebufferingGoal" id="rebuffer-goal" class="input-field" .value=${config.streaming.rebufferingGoal}>
                <label class="input-label" for="buffer-goal">Buffering Goal (seconds)</label>
                <input type="number" step="1" name="bufferingGoal" id="buffer-goal" class="input-field" .value=${config.streaming.bufferingGoal}>
                 <label class="input-label" for="buffer-behind">Buffer Behind (seconds)</label>
                <input type="number" step="1" name="bufferBehind" id="buffer-behind" class="input-field" .value=${config.streaming.bufferBehind}>
                <div class="flex items-center gap-2 pt-2">
                    <input type="checkbox" name="ignoreTextStreamFailures" id="ignore-text-failures" .checked=${config.streaming.ignoreTextStreamFailures}>
                    <label for="ignore-text-failures" class="input-label">Ignore Text Stream Failures</label>
                </div>
            </form>
        `
    );

    return html`
        <style>
            .input-field { width: 100%; background-color: #374151; color: white; border-radius: 0.375rem; padding: 0.5rem; border: 1px solid #4b5563; }
            .input-label { font-size: 0.75rem; color: #9CA3AF; display: block; margin-bottom: 0.25rem; }
        </style>
        <div>
            ${playerStatusDisplayTemplate()}
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div class="space-y-4">${masterControls}${trackSelection}</div>
                <div class="space-y-4">${abrConfig}${abrRestrictions}</div>
                <div class="space-y-4">${bufferingConfig}</div>
            </div>
        </div>
    `;
};