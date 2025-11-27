import { html, render } from 'lit-html';
import { multiPlayerService } from '../application/multiPlayerService';

// Import Components
import './components/multi-player-bottom-panel.js';
import './components/player-grid.js';

let container = null;

function renderMultiPlayerView() {
    if (!container) return;

    const template = html`
        <div
            class="relative h-full w-full bg-slate-950 overflow-hidden flex flex-col"
        >
            <!-- Main Grid Area (Scrollable) -->
            <div class="grow min-h-0 z-0 w-full">
                <player-grid-component></player-grid-component>
            </div>

            <!-- Console (Fixed Bottom) -->
            <multi-player-bottom-panel></multi-player-bottom-panel>
        </div>
    `;

    render(template, container);
}

export const multiPlayerView = {
    hasContextualSidebar: false,

    activate(containerElement) {
        container = containerElement;
        multiPlayerService.startStatsCollection();
        renderMultiPlayerView();
    },

    deactivate() {
        multiPlayerService.stopStatsCollection();
        if (container) render(html``, container);
        container = null;
    },

    unmount() {
        this.deactivate();
        multiPlayerService.destroyAll();
    },
};
