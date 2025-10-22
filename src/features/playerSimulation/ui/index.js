import { html, render } from 'lit-html';
import { playerService } from '../application/playerService.js';
import { bufferGraphTemplate } from './components/buffer-graph.js';
import { statsCardsTemplate } from './components/stats-cards.js';
import { eventLogTemplate } from './components/event-log.js';
import { playerControlsTemplate } from './components/player-controls.js';
import { useAnalysisStore } from '@/state/analysisStore';
import { usePlayerStore, playerActions } from '@/state/playerStore';
import { eventBus } from '@/application/event-bus';
import shaka from 'shaka-player/dist/shaka-player.ui.js';
import 'shaka-player/dist/controls.css';

const viewState = {
    container: null,
    videoEl: null,
    videoContainer: null,
    controlsContainer: null,
    bufferGraphContainer: null,
    diagnosticPanelContainer: null,
    subscriptions: [],
    animationFrameId: null,
    lastError: null,
};

function updateBufferGraph() {
    if (viewState.bufferGraphContainer) {
        render(bufferGraphTemplate(viewState.videoEl), viewState.bufferGraphContainer);
    }
}

function startUiUpdates() {
    if (viewState.animationFrameId) {
        cancelAnimationFrame(viewState.animationFrameId);
    }
    function loop() {
        updateBufferGraph();
        viewState.animationFrameId = requestAnimationFrame(loop);
    }
    loop();
}

function stopUiUpdates() {
    if (viewState.animationFrameId) {
        cancelAnimationFrame(viewState.animationFrameId);
        viewState.animationFrameId = null;
    }
}

function renderControls() {
    if (viewState.controlsContainer) {
        render(playerControlsTemplate(), viewState.controlsContainer);
    }
}

function renderDiagnosticPanel() {
    const { activeTab, currentStats, eventLog } = usePlayerStore.getState();

    const tabButton = (label, key) => {
        const isActive = activeTab === key;
        const classes = `px-4 py-2 font-semibold text-sm rounded-t-lg transition-colors ${
            isActive
                ? 'bg-gray-800 text-white'
                : 'bg-gray-900/50 text-gray-400 hover:bg-gray-700/50'
        }`;
        return html`<button
            @click=${() => playerActions.setActiveTab(key)}
            class=${classes}
        >${label}</button>`;
    };

    let content;
    if (activeTab === 'stats') {
        content = statsCardsTemplate(currentStats);
    } else if (activeTab === 'log') {
        content = eventLogTemplate(eventLog);
    }

    const template = html`
        <div class="shrink-0 border-b border-gray-700 flex space-x-2 px-4">
            ${tabButton('Live Stats', 'stats')}
            ${tabButton('Event Log', 'log')}
        </div>
        <div id="diagnostic-panel-content" class="grow p-4 overflow-y-auto">
            ${content}
        </div>
    `;

    if (viewState.diagnosticPanelContainer) {
        render(template, viewState.diagnosticPanelContainer);
    }
}

const drmErrorTemplate = (error) => {
    let title = 'DRM Playback Error';
    let message = 'An unknown DRM error occurred. Check the console for details.';

    if (error.code === 'DRM_NO_LICENSE_URL') {
        title = 'License Server URL Required';
        message = 'This stream is encrypted, but a license server URL could not be automatically discovered. Please go back and provide one in the input form to enable playback.';
    } else if (error.code === 6007) { // LICENSE_REQUEST_FAILED
        title = 'License Request Failed';
        message = 'The request to the license server failed. This is often due to missing or incorrect authentication headers. Please check your Authentication Settings for this stream.';
    }

    return html`
        <div class="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center p-4 z-20">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-yellow-400 mb-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clip-rule="evenodd" />
            </svg>
            <h3 class="text-xl font-bold text-white">${title}</h3>
            <p class="text-gray-300 mt-2 max-w-md">${message}</p>
        </div>
    `;
};


const playerViewShellTemplate = () => {
    const isDrmError = viewState.lastError?.code === 'DRM_NO_LICENSE_URL' || viewState.lastError?.code === 6007;

    return html`
        <div class="flex flex-col h-full gap-6">
            <div class="space-y-4">
                <div data-shaka-player-container id="video-container-element" class="w-full bg-black aspect-video relative shadow-2xl rounded-lg">
                    ${isDrmError ? drmErrorTemplate(viewState.lastError) : ''}
                    <video id="player-video-element" autoplay class="w-full h-full rounded-lg" data-shaka-player></video>
                </div>
                <div id="buffer-graph-container-element"></div>
            </div>
            <div id="player-controls-container" class="shrink-0"></div>
            <div id="diagnostic-panel-container" class="bg-gray-900/50 rounded-lg border border-gray-700/50 flex flex-col min-h-0 grow"></div>
        </div>
    `;
};


export const playerView = {
    mount(containerElement, { stream }) {
        viewState.container = containerElement;
        viewState.lastError = null;

        const activeStream = stream;

        if (!activeStream?.originalUrl) {
            render(html`<div class="text-center py-12 text-yellow-400">
                <p>Player simulation requires a stream with a valid manifest URL.</p>
                <p class="text-sm text-gray-400 mt-2">Analysis from local files is not supported for playback.</p>
            </div>`, viewState.container);
            return;
        }

        render(playerViewShellTemplate(), viewState.container);

        viewState.videoEl = viewState.container.querySelector('#player-video-element');
        viewState.videoContainer = viewState.container.querySelector('#video-container-element');
        viewState.controlsContainer = viewState.container.querySelector('#player-controls-container');
        viewState.bufferGraphContainer = viewState.container.querySelector('#buffer-graph-container-element');
        viewState.diagnosticPanelContainer = viewState.container.querySelector('#diagnostic-panel-container');

        playerService.initialize(viewState.videoEl, viewState.videoContainer, shaka);
        playerService.load(activeStream);

        viewState.subscriptions.forEach((unsub) => unsub());
        viewState.subscriptions = [];

        const onPlayerError = ({ error }) => {
            viewState.lastError = error;
            // Re-render the shell to show the DRM error overlay if necessary
            render(playerViewShellTemplate(), viewState.container);
        };

        viewState.subscriptions.push(usePlayerStore.subscribe(renderControls));
        viewState.subscriptions.push(useAnalysisStore.subscribe(renderControls));
        viewState.subscriptions.push(usePlayerStore.subscribe(renderDiagnosticPanel));
        viewState.subscriptions.push(eventBus.subscribe('player:error', onPlayerError));
        
        viewState.subscriptions.push(
            useAnalysisStore.subscribe(
                (state, prevState) => {
                    if (state.activeStreamId !== prevState.activeStreamId) {
                        const newStream = state.streams.find(s => s.id === state.activeStreamId);
                        viewState.lastError = null; // Clear error on stream change
                        if (newStream?.originalUrl) {
                            playerService.load(newStream);
                        } else {
                            playerService.unload();
                        }
                    }
                }
            )
        );

        const onManifestLoaded = () => {
            viewState.lastError = null;
            startUiUpdates();
            renderControls(); 
        };
        viewState.subscriptions.push(eventBus.subscribe('player:manifest-loaded', onManifestLoaded));

        renderControls();
        renderDiagnosticPanel();
    },

    unmount() {
        stopUiUpdates();
        playerService.destroy();
        viewState.subscriptions.forEach((unsub) => unsub());
        playerActions.reset();

        Object.keys(viewState).forEach((key) => {
            viewState[key] = Array.isArray(viewState[key]) ? [] : null;
        });
    },
};