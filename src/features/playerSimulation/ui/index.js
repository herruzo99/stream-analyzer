import { html, render } from 'lit-html';
import { playerService } from '../application/playerService.js';
import { statsCardsTemplate } from './components/stats-cards.js';
import { eventLogTemplate } from './components/event-log.js';
import { playerControlsTemplate } from './components/player-controls.js';
import { useAnalysisStore } from '@/state/analysisStore';
import { usePlayerStore, playerActions } from '@/state/playerStore';
import { eventBus } from '@/application/event-bus';
import shaka from 'shaka-player/dist/shaka-player.ui.js';
import 'shaka-player/dist/controls.css';

// New ECharts integration
import { renderChart, disposeChart } from '@/ui/shared/charts/chart-renderer';
import { bufferTimelineChartOptions } from '@/ui/shared/charts/buffer-timeline-chart';
import { abrHistoryChartOptions } from '@/ui/shared/charts/abr-history-chart';
import { bufferHealthChartOptions } from '@/ui/shared/charts/buffer-health-chart';


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
    isMounted: false,
};

function updateBufferTimeline() {
    if (viewState.bufferGraphContainer && playerService.isInitialized) {
        const stream = useAnalysisStore.getState().streams.find(s => s.id === useAnalysisStore.getState().activeStreamId);
        const options = bufferTimelineChartOptions(viewState.videoEl, stream);
        if (Object.keys(options).length > 0) {
            renderChart(viewState.bufferGraphContainer, options);
        }
    }
}

function startUiUpdates() {
    if (viewState.animationFrameId) {
        cancelAnimationFrame(viewState.animationFrameId);
    }
    function loop() {
        updateBufferTimeline();
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
    const { activeTab, currentStats, eventLog, playbackHistory } =
        usePlayerStore.getState();
    const shakaConfig = playerService.getConfiguration();
    const bufferingGoal = shakaConfig?.streaming?.bufferingGoal || 10;

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
        >
            ${label}
        </button>`;
    };

    let content;
    if (activeTab === 'stats') {
        content = statsCardsTemplate(currentStats);
    } else if (activeTab === 'log') {
        content = eventLogTemplate(eventLog);
    } else if (activeTab === 'graphs') {
        const abrChartOpts = abrHistoryChartOptions(playbackHistory);
        const bufferChartOpts = bufferHealthChartOptions(playbackHistory, bufferingGoal);

        // Defer chart rendering until after lit-html has created the container div
        setTimeout(() => {
            const abrContainer = viewState.diagnosticPanelContainer?.querySelector('#abr-chart-container');
            const bufferContainer = viewState.diagnosticPanelContainer?.querySelector('#buffer-chart-container');
            if (abrContainer) renderChart(abrContainer, abrChartOpts);
            if (bufferContainer) renderChart(bufferContainer, bufferChartOpts);
        }, 0);
        
        content = html`
            <div class="space-y-6">
                <div id="abr-chart-container" class="h-64"></div>
                <div id="buffer-chart-container" class="h-48"></div>
            </div>
        `;
    }

    const template = html`
        <div class="shrink-0 border-b border-gray-700 flex space-x-2 px-4">
            ${tabButton('Live Stats', 'stats')} ${tabButton('Graphs', 'graphs')}
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
    let message =
        'An unknown DRM error occurred. Check the console for details.';

    if (error.code === 'DRM_NO_LICENSE_URL') {
        title = 'License Server URL Required';
        message =
            'This stream is encrypted, but a license server URL could not be automatically discovered. Please go back and provide one in the input form to enable playback.';
    } else if (error.code === 6007) {
        // LICENSE_REQUEST_FAILED
        title = 'License Request Failed';
        message =
            'The request to the license server failed. This is often due to missing or incorrect authentication headers. Please check your Authentication Settings for this stream.';
    }

    return html`
        <div
            class="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center p-4 z-20"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-12 w-12 text-yellow-400 mb-4"
                viewBox="0 0 20 20"
                fill="currentColor"
            >
                <path
                    fill-rule="evenodd"
                    d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                    clip-rule="evenodd"
                />
            </svg>
            <h3 class="text-xl font-bold text-white">${title}</h3>
            <p class="text-gray-300 mt-2 max-w-md">${message}</p>
        </div>
    `;
};

const playerViewShellTemplate = () => {
    const { lastError } = viewState;
    const isDrmError =
        lastError?.code === 'DRM_NO_LICENSE_URL' || lastError?.code === 6007;

    return html`
        <div id="player-view-shell" class="flex flex-col h-full gap-6 p-4 sm:p-6">
            <div class="space-y-4">
                <div
                    data-shaka-player-container
                    id="video-container-element"
                    class="w-full bg-black aspect-video relative shadow-2xl rounded-lg"
                >
                    ${isDrmError ? drmErrorTemplate(lastError) : ''}
                    <video
                        id="player-video-element"
                        class="w-full h-full rounded-lg"
                        data-shaka-player
                    ></video>
                </div>
                <div id="buffer-graph-container-element" class="h-8 rounded-lg bg-gray-800"></div>
            </div>
            <div id="player-controls-container" class="shrink-0"></div>
            <div
                id="diagnostic-panel-container"
                class="bg-gray-900/50 rounded-lg border border-gray-700/50 flex flex-col min-h-0 grow"
            ></div>
        </div>
    `;
};

export const playerView = {
    isMounted: () => viewState.isMounted,

    activate(stream) {
        if (playerService.isInitialized && stream?.originalUrl) {
            const player = playerService.getPlayer();
            const currentAsset = player?.getAssetUri();
            // Only load if not already loaded or if the stream is different
            if (currentAsset !== stream.originalUrl) {
                viewState.lastError = null;
                // Explicitly request autoplay when activating the view
                playerService.load(stream, true);
            } else {
                // If the same stream is already loaded, just play it
                const videoElement = player?.getMediaElement();
                if (videoElement && videoElement.paused) {
                    videoElement.play();
                }
            }
        }
    },

    deactivate() {
        // No-op. We no longer want to pause playback when leaving the view.
        // Playback state is now managed solely by the user via player controls
        // or by the browser (e.g., when the tab becomes inactive).
    },

    mount(containerElement, { stream }) {
        if (viewState.isMounted) return;

        viewState.container = containerElement;
        viewState.lastError = null;

        render(playerViewShellTemplate(), viewState.container);

        viewState.videoEl = viewState.container.querySelector(
            '#player-video-element'
        );
        viewState.videoContainer = viewState.container.querySelector(
            '#video-container-element'
        );
        viewState.controlsContainer = viewState.container.querySelector(
            '#player-controls-container'
        );
        viewState.bufferGraphContainer = viewState.container.querySelector(
            '#buffer-graph-container-element'
        );
        viewState.diagnosticPanelContainer = viewState.container.querySelector(
            '#diagnostic-panel-container'
        );

        playerService.initialize(
            viewState.videoEl,
            viewState.videoContainer,
            shaka
        );
        // DO NOT load stream here. Loading is now managed by the mainRenderer via activate().

        viewState.subscriptions.push(usePlayerStore.subscribe(renderControls));
        viewState.subscriptions.push(
            useAnalysisStore.subscribe(renderControls)
        );
        viewState.subscriptions.push(
            usePlayerStore.subscribe(renderDiagnosticPanel)
        );
        viewState.subscriptions.push(
            eventBus.subscribe('player:error', ({ error }) => {
                viewState.lastError = error;
                render(playerViewShellTemplate(), viewState.container);
            })
        );
        viewState.subscriptions.push(
            eventBus.subscribe('player:manifest-loaded', () => {
                viewState.lastError = null;
                startUiUpdates();
                renderControls();
                render(playerViewShellTemplate(), viewState.container);
            })
        );

        renderControls();
        renderDiagnosticPanel();
        viewState.isMounted = true;
    },

    unmount() {
        if (!viewState.isMounted) return;

        stopUiUpdates();
        
        if (viewState.bufferGraphContainer) disposeChart(viewState.bufferGraphContainer);
        const abrChart = viewState.diagnosticPanelContainer?.querySelector('#abr-chart-container');
        if (abrChart) disposeChart(abrChart);
        const bufferChart = viewState.diagnosticPanelContainer?.querySelector('#buffer-chart-container');
        if (bufferChart) disposeChart(bufferChart);

        playerService.destroy();
        viewState.subscriptions.forEach((unsub) => unsub());
        playerActions.reset();

        if (viewState.container) {
            render(html``, viewState.container);
        }

        Object.keys(viewState).forEach((key) => {
            viewState[key] = Array.isArray(viewState[key]) ? [] : null;
        });
        viewState.isMounted = false;
    },
};