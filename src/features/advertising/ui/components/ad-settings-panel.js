/**
 * Ad-detection settings panel.
 *
 * Reconstructed for the port (imported but never committed). Contract,
 * derived from the inspector call site: `adSettingsPanelTemplate(true)`
 * renders toggles bound to uiStore adDetectionPreferences.
 * The boolean selects embedded mode (no outer card chrome).
 */
import { html } from 'lit-html';
import { useUiStore } from '@/state/uiStore';

const METHODS = [
    ['SCTE35_INBAND', 'SCTE-35 in-band', 'Splice points carried in the segment stream'],
    ['SCTE35_DATERANGE', 'SCTE-35 daterange', 'HLS EXT-X-DATERANGE ad markers'],
    ['ASSET_IDENTIFIER', 'Asset identifier', 'Identifier-based ad boundaries'],
    ['ENCRYPTION_TRANSITION', 'Encryption transition', 'Clear/encrypted switches as ad edges'],
    ['STRUCTURAL_DISCONTINUITY', 'Structural discontinuity', 'Timeline gaps treated as breaks'],
];

export const adSettingsPanelTemplate = (embedded = false) => {
    const { adDetectionPreferences, setAdDetectionPreference } =
        useUiStore.getState();
    const prefs = adDetectionPreferences || {};
    const rows = METHODS.map(
        ([key, label, desc]) => html`
            <label
                class="flex items-start gap-3 p-2.5 rounded-md border border-white/10 hover:border-white/10 bg-white/5 cursor-pointer transition-all"
                title="${desc}"
            >
                <input
                    type="checkbox"
                    ?checked=${!!prefs[key]}
                    @change=${(e) =>
                        setAdDetectionPreference(key, e.target.checked)}
                    class="mt-0.5 accent-emerald-400"
                />
                <span class="min-w-0">
                    <span class="block text-xs font-bold text-slate-200"
                        >${label}</span
                    >
                    <span class="block text-[10px] text-slate-500 mt-0.5"
                        >${desc}</span
                    >
                </span>
            </label>
        `
    );
    if (embedded) {
        return html`<div class="space-y-2">${rows}</div>`;
    }
    return html`
        <div class="rounded-md border border-white/10 bg-white/5 p-4">
            <h3
                class="text-xs font-bold text-slate-400 mb-3"
            >
                Ad detection rules
            </h3>
            <div class="space-y-2">${rows}</div>
        </div>
    `;
};
