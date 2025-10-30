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
import { createMultiPlayerGridViewModel } from './view-model';

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
    const { isMutedAll, isSyncEnabled, isAllExpanded, activeLayout } =
        useMultiPlayerStore.getState();
    const isPlaying = selectIsPlayingAll();

    const buttonClasses =
        'px-3 py-1.5 text-sm font-semibold rounded-md transition-colors flex items-center gap-2';
    const layoutOptions = [
        { value: 'auto', label: 'Auto Grid' },
        { value: 'grid-2', label: '2-Column' },
        { value: 'grid-1', label: '1-Column' },
    ];

    return html`
        <div class="flex items-center gap-2">
            <select
                @change=${(e) =>
                    eventBus.dispatch('ui:multi-player:set-active-layout', {
                        layout: e.target.value,
                    })}
                .value=${activeLayout}
                class="bg-gray-700/50 hover:bg-gray-600/50 text-white font-semibold rounded-md p-2 text-sm border border-gray-600"
            >
                ${layoutOptions.map(
                    (opt) =>
                        html`<option value=${opt.value}>${opt.label}</option>`
                )}
            </select>
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
    const { players } = useMultiPlayerStore.getState();
    const { averagePlayheadTime, maxDuration } =
        createMultiPlayerGridViewModel(players);

    const handleSeek = (e) => {
        eventBus.dispatch('ui:multi-player:seek-all', {
            time: parseFloat(e.target.value),
        });
    };

    const masterSeekBar = html`
        <div
            class="flex items-center gap-4 bg-gray-900/50 p-2 rounded-lg border border-gray-700"
        >
            <span class="font-mono text-sm text-gray-400"
                >${new Date(averagePlayheadTime * 1000)
                    .toISOString()
                    .slice(14, 19)}</span
            >
            <input
                type="range"
                min="0"
                .max=${maxDuration}
                .value=${averagePlayheadTime}
                @input=${handleSeek}
                class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <span class="font-mono text-sm text-gray-400"
                >${new Date(maxDuration * 1000)
                    .toISOString()
                    .slice(14, 19)}</span
            >
        </div>
    `;

    const template = html`
        <div class="flex flex-col h-full gap-y-4">
            <div class="flex justify-between items-center shrink-0">
                <h3 class="text-xl font-bold">Multi-Player Dashboard</h3>
                ${topBarControlsTemplate()}
            </div>
            <div class="shrink-0">${masterSeekBar}</div>
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
        debugLog('MultiPlayerView', '[LIFECYCLE] mount() called.');
        container = containerElement;

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
