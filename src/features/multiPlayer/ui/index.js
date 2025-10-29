import { html, render } from 'lit-html';
import {
    useMultiPlayerStore,
    selectIsPlayingAll,
} from '@/state/multiPlayerStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import { multiPlayerService } from '../application/multiPlayerService';
import { useAnalysisStore } from '@/state/analysisStore';
import { eventBus } from '@/application/event-bus';

import { GridViewComponent } from './components/grid-view.js';
import { SidebarShellComponent } from './components/sidebar-shell.js';
import * as icons from '@/ui/icons';

let container = null;
let multiPlayerUnsubscribe = null;
let uiUnsubscribe = null;
let analysisUnsubscribe = null;

if (!customElements.get('grid-view-component'))
    customElements.define('grid-view-component', GridViewComponent);
if (!customElements.get('sidebar-shell-component'))
    customElements.define('sidebar-shell-component', SidebarShellComponent);

const topBarControlsTemplate = () => {
    const { isMutedAll, isSyncEnabled, isAllExpanded } =
        useMultiPlayerStore.getState();
    const isPlaying = selectIsPlayingAll();

    const buttonClasses =
        'px-3 py-1.5 text-sm font-semibold rounded-md transition-colors flex items-center gap-2';

    return html`
        <div class="flex items-center gap-2">
            <button
                @click=${() =>
                    isPlaying
                        ? eventBus.dispatch('ui:multi-player:pause-all')
                        : eventBus.dispatch('ui:multi-player:play-all')}
                class="${buttonClasses} ${isPlaying
                    ? 'bg-yellow-600 text-yellow-900 hover:bg-yellow-500'
                    : 'bg-green-600 text-white hover:bg-green-500'}"
            >
                ${isPlaying ? icons.pause : icons.play}
                ${isPlaying ? 'Pause All' : 'Play All'}
            </button>
            <button
                @click=${() =>
                    isMutedAll
                        ? eventBus.dispatch('ui:multi-player:unmute-all')
                        : eventBus.dispatch('ui:multi-player:mute-all')}
                class="${buttonClasses} bg-gray-700/50 hover:bg-gray-600 text-gray-300"
            >
                ${isMutedAll ? icons.volumeUp : icons.volumeOff}
                ${isMutedAll ? 'Unmute' : 'Mute'}
            </button>
            <button
                @click=${() =>
                    eventBus.dispatch('ui:multi-player:expand-all-toggled')}
                class="${buttonClasses} bg-gray-700/50 hover:bg-gray-600 text-gray-300"
            >
                ${isAllExpanded ? 'Collapse All' : 'Expand All'}
            </button>
            <button
                @click=${() =>
                    eventBus.dispatch('ui:multi-player:sync-toggled')}
                class="${buttonClasses} ${isSyncEnabled
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700/50 hover:bg-gray-600 text-gray-300'}"
            >
                ${icons.sync} Sync
            </button>
        </div>
    `;
};

function renderMultiPlayerDashboard() {
    if (!container) return;

    const template = html`
        <div class="flex flex-col h-full gap-y-4">
            <div class="flex justify-between items-center shrink-0">
                <h3 class="text-xl font-bold">Multi-Player Dashboard</h3>
                ${topBarControlsTemplate()}
            </div>
            <div class="grow overflow-y-auto">
                <grid-view-component></grid-view-component>
            </div>
        </div>
    `;
    render(template, container);
}

export const multiPlayerView = {
    hasContextualSidebar: true,

    async mount(containerElement) {
        container = containerElement;

        // Clean up any previous subscriptions to prevent memory leaks.
        if (multiPlayerUnsubscribe) multiPlayerUnsubscribe();
        if (uiUnsubscribe) uiUnsubscribe();
        if (analysisUnsubscribe) analysisUnsubscribe();

        // Establish subscriptions to relevant stores.
        multiPlayerUnsubscribe = useMultiPlayerStore.subscribe(
            renderMultiPlayerDashboard
        );
        uiUnsubscribe = useUiStore.subscribe(renderMultiPlayerDashboard);
        analysisUnsubscribe = useAnalysisStore.subscribe(
            async (state, prevState) => {
                // The service now handles intelligent synchronization.
                if (state.streams !== prevState.streams) {
                    await multiPlayerService.setupPlayersForStreams(
                        state.streams
                    );
                }
            }
        );

        // Perform initial setup using the current state.
        const { streams } = useAnalysisStore.getState();
        await multiPlayerService.setupPlayersForStreams(streams);
        multiPlayerService.startStatsCollection();

        renderMultiPlayerDashboard();

        const contextualSidebar = document.getElementById('contextual-sidebar');
        if (contextualSidebar) {
            render(
                html`<sidebar-shell-component></sidebar-shell-component>`,
                contextualSidebar
            );
        }
    },
    unmount() {
        multiPlayerService.destroyAll();
        if (multiPlayerUnsubscribe) multiPlayerUnsubscribe();
        if (uiUnsubscribe) uiUnsubscribe();
        if (analysisUnsubscribe) analysisUnsubscribe();
        multiPlayerUnsubscribe = null;
        uiUnsubscribe = null;
        analysisUnsubscribe = null;

        if (container) render(html``, container);
        container = null;

        const contextualSidebar = document.getElementById('contextual-sidebar');
        if (contextualSidebar) {
            render(html``, contextualSidebar);
        }
    },
};
