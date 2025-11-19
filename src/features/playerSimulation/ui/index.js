import { html, render } from 'lit-html';
import { playerService } from '../application/playerService.js';
import { useAnalysisStore } from '@/state/analysisStore';
import { usePlayerStore, playerActions } from '@/state/playerStore';
import { eventBus } from '@/application/event-bus';
import 'shaka-player/dist/controls.css';

import './sidebar.js';
import './components/player-controls.js';
import * as icons from '@/ui/icons';

const viewState = {
    container: null,
    videoEl: null,
    videoContainer: null,
    subscriptions: [],
    lastError: null,
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

const playerErrorTemplate = (error) => {
    const message = error?.message || 'An unknown player error occurred.';

    const handleReload = () => {
        const { streams, activeStreamId } = useAnalysisStore.getState();
        const activeStream = streams.find((s) => s.id === activeStreamId);
        if (activeStream) {
            playerService.load(activeStream, true);
        }
    };

    return html`<div
        class="absolute inset-0 bg-red-900/80 text-red-200 p-4 flex flex-col items-center justify-center text-center"
    >
        <h3 class="text-lg font-bold">Playback Error</h3>
        <p class="text-sm mt-2 font-mono">${message}</p>
        <button
            @click=${handleReload}
            class="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 flex items-center gap-2"
        >
            ${icons.sync} Reload Stream
        </button>
    </div>`;
};

const launchPlayerTemplate = () => {
    const handleLaunch = () => {
        const { streams, activeStreamId } = useAnalysisStore.getState();
        const activeStream = streams.find((s) => s.id === activeStreamId);
        if (activeStream) {
            playerService.reinitializeAndLoad(
                viewState.videoEl,
                viewState.videoContainer,
                activeStream
            );
        }
    };

    return html`
        <div
            class="absolute inset-0 bg-slate-900/50 flex flex-col items-center justify-center text-center z-10"
        >
            <h3 class="text-lg font-semibold text-slate-200">
                Player is Stopped
            </h3>
            <p class="text-sm text-slate-400 mt-1">
                The player instance has been reset.
            </p>
            <button
                @click=${handleLaunch}
                class="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 flex items-center gap-2"
            >
                ${icons.play} Launch Player
            </button>
        </div>
    `;
};

const playerViewShellTemplate = () => {
    const { lastError } = viewState;
    const playerIsInitialized = playerService.isInitialized;

    return html`
        <div id="player-view-shell" class="flex flex-col h-full gap-4">
            <div
                class="w-full bg-black aspect-video relative shadow-2xl rounded-lg overflow-hidden shrink-0"
            >
                <div
                    id="video-container-element"
                    class="w-full h-full absolute inset-0"
                >
                    <video
                        id="player-video-element"
                        class="w-full h-full"
                    ></video>
                </div>
                ${lastError ? playerErrorTemplate(lastError) : ''}
                ${!playerIsInitialized && !lastError
                    ? launchPlayerTemplate()
                    : ''}
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

    activate(stream) {
        playerActions.setPipUnmountState(false);
        // Pre-populate the player store with tracks from the manifest IR.
        playerActions.setInitialTracksFromManifest(stream.manifest);

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
        const contextualSidebar = document.getElementById('contextual-sidebar');
        if (contextualSidebar) {
            render(
                html`<player-sidebar class="h-full"></player-sidebar>`,
                contextualSidebar
            );
        }
    },

    deactivate() {
        const { playbackState, isPictureInPicture } = usePlayerStore.getState();
        const isPlaying =
            playbackState === 'PLAYING' || playbackState === 'BUFFERING';

        if (isPlaying || isPictureInPicture) {
            playerActions.setPipUnmountState(true);
        } else {
            playerService.unload();
        }

        const contextualSidebar = document.getElementById('contextual-sidebar');
        if (contextualSidebar) {
            render(html``, contextualSidebar);
        }
    },

    mount(containerElement, { stream }) {
        viewState.container = containerElement;
        viewState.lastError = null;

        // Clean up any previous subscriptions before re-subscribing
        viewState.subscriptions.forEach((unsub) => unsub());
        viewState.subscriptions = [];

        renderPlayerView(); // Renders the shell and finds the video element

        // The player is now initialized on-demand by the user if it has been destroyed.
        if (!playerService.isInitialized) {
            const playerStateUnsub = usePlayerStore.subscribe(
                (state, prevState) => {
                    // Re-render the shell if the loaded state changes, to show/hide the launch button
                    if (state.isLoaded !== prevState.isLoaded) {
                        renderPlayerView();
                    }
                }
            );
            viewState.subscriptions.push(playerStateUnsub);
        } else {
            playerService.initialize(
                viewState.videoEl,
                viewState.videoContainer
            );
        }

        const errorSubscription = eventBus.subscribe(
            'player:error',
            ({ message, error }) => {
                // Combine the original error with our formatted message for the UI
                viewState.lastError = { ...error, message };
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
            render(
                html`<player-sidebar class="h-full"></player-sidebar>`,
                contextualSidebar
            );
        }
    },

    unmount() {
        playerService.destroy();
        viewState.subscriptions.forEach((unsub) => unsub());
        viewState.subscriptions = [];

        document.body.classList.remove('contextual-sidebar-open');
        const contextualSidebar = document.getElementById('contextual-sidebar');
        if (contextualSidebar) render(html``, contextualSidebar);

        if (viewState.container) render(html``, viewState.container);

        viewState.container = null;
        viewState.videoEl = null;
        viewState.videoContainer = null;
        viewState.lastError = null;
    },
};
