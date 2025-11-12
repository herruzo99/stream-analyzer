import { html, render } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map.js';
import {
    useMultiPlayerStore,
    selectIsPlayingAll,
} from '@/state/multiPlayerStore';
import { useUiStore } from '@/state/uiStore';
import { multiPlayerService } from '../application/multiPlayerService';
import { eventBus } from '@/application/event-bus';
import { appLog } from '@/shared/utils/debug';

import './components/grid-view.js';
import './components/sidebar-shell.js';
import './components/controls-view.js';
import * as icons from '@/ui/icons';

let container = null;
let multiPlayerUnsubscribe = null;
let uiUnsubscribe = null;
let analysisUnsubscribe = null;

const topBarControlsTemplate = () => {
    const { isMutedAll, isSyncEnabled, players, isAutoResetEnabled } =
        useMultiPlayerStore.getState();
    const { multiPlayerViewMode } = useUiStore.getState();
    const isPlaying = selectIsPlayingAll();
    const isImmersive = multiPlayerViewMode === 'immersive';
    const failedPlayerCount = Array.from(players.values()).filter(
        (p) => p.state === 'error'
    ).length;

    const buttonClasses =
        'px-3 py-1.5 text-sm font-semibold rounded-md transition-colors flex items-center gap-2';

    return html`
        <div class="flex items-center flex-wrap gap-2">
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
                <span>${isPlaying ? 'Pause All' : 'Play All'}</span>
            </button>
            <button
                @click=${() =>
                    isMutedAll
                        ? eventBus.dispatch('ui:multi-player:unmute-all')
                        : eventBus.dispatch('ui:multi-player:mute-all')}
                class="${buttonClasses} bg-slate-700/50 hover:bg-slate-600 text-slate-300"
            >
                ${isMutedAll ? icons.volumeOff : icons.volumeUp}
            </button>
            <button
                @click=${() =>
                    eventBus.dispatch('ui:multi-player:sync-toggled')}
                class="${buttonClasses} ${isSyncEnabled
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700/50 hover:bg-slate-600 text-slate-300'}"
            >
                ${icons.sync}
                <span>Sync</span>
            </button>
            <button
                @click=${() =>
                    eventBus.dispatch('ui:multi-player:toggle-immersive-view')}
                class="${buttonClasses} ${isImmersive
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700/50 hover:bg-slate-600 text-slate-300'}"
                title="Toggle immersive monitoring view"
            >
                 ${isImmersive ? icons.minimize : icons.maximize} <span>Inmersive</span>
            </button>

            <div class="h-6 w-px bg-slate-700"></div>

            <button
                @click=${() => eventBus.dispatch('ui:multi-player:reset-all')}
                class="${buttonClasses} bg-slate-700/50 hover:bg-slate-600 text-slate-300"
            >
                ${icons.sync}
                <span>Reset All</span>
            </button>
            <button
                @click=${() => eventBus.dispatch('ui:multi-player:clear-all')}
                class="${buttonClasses} bg-slate-700/50 hover:bg-slate-600 text-slate-300"
            >
                ${icons.xCircle}
                <span>Clear Duplicates</span>
            </button>

            ${failedPlayerCount > 0
                ? html`<button
                      @click=${() =>
                          eventBus.dispatch('ui:multi-player:reset-failed')}
                      class="${buttonClasses} bg-red-800 hover:bg-red-700 text-red-200"
                      title="Attempt to reload all failed players"
                  >
                      ${icons.sync} Reset Failed (${failedPlayerCount})
                  </button>`
                : ''}

            <div class="flex items-center gap-2">
                <label
                    for="auto-reset-toggle"
                    class="text-sm font-medium text-slate-400"
                    >Auto-reset</label
                >
                <button
                    @click=${() =>
                        eventBus.dispatch('ui:multi-player:toggle-auto-reset')}
                    role="switch"
                    aria-checked="${isAutoResetEnabled}"
                    id="auto-reset-toggle"
                    class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isAutoResetEnabled
                        ? 'bg-blue-600'
                        : 'bg-slate-600'}"
                >
                    <span
                        class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAutoResetEnabled
                            ? 'translate-x-6'
                            : 'translate-x-1'}"
                    ></span>
                </button>
            </div>
        </div>
    `;
};

function renderMultiPlayerDashboard() {
    if (!container) return;

    const { multiPlayerViewMode } = useUiStore.getState();
    const isImmersive = multiPlayerViewMode === 'immersive';

    const mainGridClasses = {
        grid: !isImmersive,
        'grid-cols-1': !isImmersive,
        'lg:grid-cols-[20rem_1fr]': !isImmersive,
        'gap-4': !isImmersive,
        grow: true,
        'min-h-0': true,
        'mt-4': !isImmersive, // Add margin-top in normal view
    };

    const leftSidebar = !isImmersive
        ? html` <div
              class="overflow-y-auto bg-slate-800 rounded-lg p-3 border border-slate-700"
          >
              <controls-view-component></controls-view-component>
          </div>`
        : '';

    const headerClasses = {
        'flex flex-col sm:flex-row justify-between items-center shrink-0 gap-4':
            true,
    };

    const gridContainerClasses = {
        'overflow-y-auto': true,
        'h-full': isImmersive,
        'mt-4': isImmersive, // Add margin-top in immersive view
    };

    const template = html`
        <div
            class="flex flex-col h-full ${isImmersive ? '' : 'gap-y-4'}"
        >
            <div class=${classMap(headerClasses)}>
                <h3 class="text-xl font-bold">Multi-Player Dashboard</h3>
                ${topBarControlsTemplate()}
            </div>
            <div class=${classMap(mainGridClasses)}>
                ${leftSidebar}
                <div class=${classMap(gridContainerClasses)}>
                    <grid-view-component></grid-view-component>
                </div>
            </div>
        </div>
    `;
    render(template, container);

    const contextualSidebar = document.getElementById('contextual-sidebar');
    if (contextualSidebar) {
        contextualSidebar.classList.toggle('hidden', isImmersive);
    }
}

export const multiPlayerView = {
    hasContextualSidebar: true,

    activate(containerElement) {
        appLog('MultiPlayerView', 'info', '[LIFECYCLE] activate() called.');
        container = containerElement;

        if (multiPlayerUnsubscribe) multiPlayerUnsubscribe();
        if (uiUnsubscribe) uiUnsubscribe();
        if (analysisUnsubscribe) analysisUnsubscribe();

        multiPlayerUnsubscribe = useMultiPlayerStore.subscribe(
            renderMultiPlayerDashboard
        );
        uiUnsubscribe = useUiStore.subscribe(renderMultiPlayerDashboard);

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

    deactivate() {
        appLog('MultiPlayerView', 'info', '[LIFECYCLE] deactivate() called.');
        multiPlayerService.stopStatsCollection();

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

    unmount() {
        appLog(
            'MultiPlayerView',
            'info',
            '[LIFECYCLE] unmount() called for full teardown.'
        );
        this.deactivate();
        multiPlayerService.destroyAll();
    },
};