import { html, render } from 'lit-html';
import {
    useMultiPlayerStore,
    selectIsPlayingAll,
} from '@/state/multiPlayerStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import { multiPlayerService } from '../application/multiPlayerService';
import { useAnalysisStore } from '@/state/analysisStore';
import { eventBus } from '@/application/event-bus';
import { debugLog } from '@/shared/utils/debug';
import { createMultiPlayerGridViewModel } from './view-model.js';

import { GridViewComponent } from './components/grid-view.js';
import { SidebarShellComponent } from './components/sidebar-shell.js';
import { ControlsViewComponent } from './components/controls-view.js';
import * as icons from '@/ui/icons';
import { formatPlayerTime } from '@/ui/shared/time-format.js';

let container = null;
let multiPlayerUnsubscribe = null;
let uiUnsubscribe = null;
let analysisUnsubscribe = null;

if (!customElements.get('grid-view-component'))
    customElements.define('grid-view-component', GridViewComponent);
if (!customElements.get('sidebar-shell-component'))
    customElements.define('sidebar-shell-component', SidebarShellComponent);
if (!customElements.get('controls-view-component'))
    customElements.define('controls-view-component', ControlsViewComponent);

const topBarControlsTemplate = () => {
    const { isMutedAll, isSyncEnabled } = useMultiPlayerStore.getState();
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
                class="${buttonClasses} bg-slate-700/50 hover:bg-slate-600 text-slate-300"
            >
                ${isMutedAll ? icons.volumeUp : icons.volumeOff}
                ${isMutedAll ? 'Unmute' : 'Mute'}
            </button>
            <button
                @click=${() =>
                    eventBus.dispatch('ui:multi-player:sync-toggled')}
                class="${buttonClasses} ${isSyncEnabled
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700/50 hover:bg-slate-600 text-slate-300'}"
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
            <div
                class="grid grid-cols-1 lg:grid-cols-[20rem_1fr] gap-4 grow min-h-0"
            >
                <div
                    class="overflow-y-auto bg-slate-800 rounded-lg p-3 border border-slate-700"
                >
                    <controls-view-component></controls-view-component>
                </div>
                <div class="overflow-y-auto">
                    <grid-view-component></grid-view-component>
                </div>
            </div>
        </div>
    `;
    render(template, container);
}

export const multiPlayerView = {
    hasContextualSidebar: true,

    async mount(containerElement) {
        debugLog('MultiPlayerView', '[LIFECYCLE] mount() called.');
        container = containerElement;

        // ARCHITECTURAL FIX: Destroy previous players on mount, not unmount.
        // This ensures a clean slate and prevents re-entrant state updates during unmount.
        await multiPlayerService.destroyAll();

        if (multiPlayerUnsubscribe) multiPlayerUnsubscribe();
        if (uiUnsubscribe) uiUnsubscribe();
        if (analysisUnsubscribe) analysisUnsubscribe();

        multiPlayerUnsubscribe = useMultiPlayerStore.subscribe(
            renderMultiPlayerDashboard
        );
        uiUnsubscribe = useUiStore.subscribe(renderMultiPlayerDashboard);

        const { streams } = useAnalysisStore.getState();
        const { addPlayer, players } = useMultiPlayerStore.getState();

        debugLog(
            'MultiPlayerView',
            `Mounting. Current player count: ${players.size}. Streams to process: ${streams.length}`
        );

        if (players.size === 0 && streams.length > 0) {
            streams.forEach((stream) => {
                const streamType =
                    stream.manifest?.type === 'dynamic' ? 'live' : 'vod';
                addPlayer(
                    stream.id,
                    stream.name,
                    stream.originalUrl,
                    streamType
                );
            });
            debugLog(
                'MultiPlayerView',
                'Populated player state in store. GridView will now initialize players.'
            );
        }

        multiPlayerService.startStatsCollection();
        renderMultiPlayerDashboard();

        const contextualSidebar = document.getElementById('contextual-sidebar');
        if (contextualSidebar) {
            render(
                html`<div class="h-full">
                    <sidebar-shell-component></sidebar-shell-component>
                </div>`,
                contextualSidebar
            );
        }
    },
    unmount() {
        debugLog('MultiPlayerView', '[LIFECYCLE] unmount() called.');
        // ARCHITECTURAL FIX: Removed multiPlayerService.destroyAll() from here.
        // It is now handled by the next view's mount() or the global unmount of the player view.
        multiPlayerService.stopStatsCollection(); // Stop tickers safely.

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
            render(html``, contextualSidebar); // Use the same container reference
        }
    },
};