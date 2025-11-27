import { usePlayerStore } from '@/state/playerStore';
import { uiActions } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const handleNavigateToPlayer = () => {
    uiActions.setActiveTab('player-simulation');
};

/**
 * Renders a warning banner if the player is not currently loaded or playing.
 * @param {string} contextName - The name of the tool requesting playback (e.g., "DRM Workbench").
 * @returns {import('lit-html').TemplateResult}
 */
export const playerActiveWarningTemplate = (contextName) => {
    const { isLoaded, playbackState } = usePlayerStore.getState();

    // If loaded and not idle/ended, we consider it "active" enough.
    const isActive =
        isLoaded && playbackState !== 'IDLE' && playbackState !== 'ENDED';

    if (isActive) return html``;

    return html`
        <div
            class="bg-amber-900/20 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between animate-fadeIn shrink-0"
        >
            <div class="flex items-center gap-3">
                <span class="text-amber-500">${icons.alertTriangle}</span>
                <div>
                    <span
                        class="text-xs font-bold text-amber-200 uppercase tracking-wider"
                        >Playback Idle</span
                    >
                    <span class="text-xs text-amber-400/80 ml-2">
                        The ${contextName} requires an active stream to capture
                        real-time data.
                    </span>
                </div>
            </div>
            <button
                @click=${handleNavigateToPlayer}
                class="flex items-center gap-2 px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 rounded text-xs font-bold text-amber-300 transition-all"
            >
                ${icons.play} Go to Player
            </button>
        </div>
    `;
};
