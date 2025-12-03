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

    const isActive =
        isLoaded && playbackState !== 'IDLE' && playbackState !== 'ENDED';

    if (isActive) return html``;

    return html`
        <div
            class="bg-slate-900/80 border-b border-amber-500/20 px-3 py-1.5 flex items-center justify-between animate-fadeIn shrink-0 z-20"
        >
            <div class="flex items-center gap-2">
                <span class="text-amber-500 scale-75"
                    >${icons.alertTriangle}</span
                >
                <div>
                    <span
                        class="text-[10px] font-bold text-amber-200 uppercase tracking-wider"
                        >Playback Idle</span
                    >
                    <span
                        class="text-[10px] text-amber-400/60 ml-1 hidden sm:inline"
                    >
                        (Start playback to capture data)
                    </span>
                </div>
            </div>
            <button
                @click=${handleNavigateToPlayer}
                class="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 rounded text-[10px] font-bold text-amber-300 transition-all whitespace-nowrap"
            >
                ${icons.play} Go to Player
            </button>
        </div>
    `;
};
