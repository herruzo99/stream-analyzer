import { html, render } from 'lit-html';
import { playerService } from '../application/playerService.js';
import { useAnalysisStore } from '@/state/analysisStore';
import { usePlayerStore } from '@/state/playerStore';
import { eventBus } from '@/application/event-bus';
import shaka from 'shaka-player/dist/shaka-player.ui.js';
import 'shaka-player/dist/controls.css';
import * as echarts from 'echarts';

import { disposeChart } from '@/ui/shared/charts/chart-renderer';
import './sidebar.js';
import './components/player-controls.js';

const viewState = {
    container: null,
    videoEl: null,
    videoContainer: null,
    subscriptions: [],
    lastError: null,
    isMounted: false,
};

function renderPlayerView() {
    if (!viewState.container) return;
    render(playerViewShellTemplate(), viewState.container);

    // After the shell is rendered, find the DOM elements
    viewState.videoEl = viewState.container.querySelector(
        '#player-video-element'
    );
    viewState.videoContainer = viewState.container.querySelector(
        '#video-container-element'
    );
}

const drmErrorTemplate = (error) => {
    return html`<div
        class="absolute inset-0 bg-red-900/80 text-red-200 p-4 flex flex-col items-center justify-center text-center"
    >
        <h3 class="text-lg font-bold">DRM Error</h3>
        <p class="text-sm mt-2">
            ${error?.message || 'An unknown DRM error occurred.'}
        </p>
    </div>`;
};

const playerViewShellTemplate = () => {
    const { lastError } = viewState;
    const isDrmError =
        lastError?.code === 'DRM_NO_LICENSE_URL' || lastError?.code === 6007;

    return html`
        <div id="player-view-shell" class="flex flex-col h-full gap-4">
            <div
                id="video-container-element"
                class="w-full bg-black aspect-video relative shadow-2xl rounded-lg overflow-hidden shrink-0"
            >
                ${isDrmError ? drmErrorTemplate(lastError) : ''}
                <video id="player-video-element" class="w-full h-full"></video>
            </div>
            <div
                class="grow bg-slate-800 rounded-lg border border-slate-700 min-h-0"
            >
                <player-controls-component></player-controls-component>
            </div>
        </div>
    `;
};

export const playerView = {
    hasContextualSidebar: true,
    isMounted: () => viewState.isMounted,

    activate(stream) {
        if (playerService.isInitialized && stream?.originalUrl) {
            const player = playerService.getPlayer();
            const currentAsset = player?.getAssetUri();
            if (currentAsset !== stream.originalUrl) {
                viewState.lastError = null;
                playerService.load(stream, true);
            } else {
                const videoElement = player?.getMediaElement();
                if (videoElement && videoElement.paused) {
                    videoElement.play();
                }
            }
        }
    },

    deactivate() {
        // This is called when switching away from the tab but PiP might be active.
        // The player is not destroyed here, only on full unmount.
    },

    mount(containerElement, { stream }) {
        if (viewState.isMounted) return;
        viewState.container = containerElement;
        viewState.lastError = null;

        renderPlayerView(); // Renders the shell and finds the video element
        playerService.initialize(viewState.videoEl, viewState.videoContainer);

        const errorSubscription = eventBus.subscribe(
            'player:error',
            ({ error }) => {
                viewState.lastError = error;
                renderPlayerView();
            }
        );
        viewState.subscriptions.push(errorSubscription);

        const manifestLoadedSubscription = eventBus.subscribe(
            'player:manifest-loaded',
            () => {
                viewState.lastError = null;
                renderPlayerView();
            }
        );
        viewState.subscriptions.push(manifestLoadedSubscription);

        const contextualSidebar = document.getElementById('contextual-sidebar');
        if (contextualSidebar) {
            render(html`<player-sidebar></player-sidebar>`, contextualSidebar);
        }

        viewState.isMounted = true;
    },

    unmount() {
        if (!viewState.isMounted) return;

        playerService.destroy();
        viewState.subscriptions.forEach((unsub) => unsub());

        const contextualSidebar = document.getElementById('contextual-sidebar');
        if (contextualSidebar) render(html``, contextualSidebar);

        if (viewState.container) render(html``, viewState.container);

        Object.keys(viewState).forEach((key) => {
            viewState[key] = Array.isArray(viewState[key]) ? [] : null;
        });
        viewState.isMounted = false;
    },
};
