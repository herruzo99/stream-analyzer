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
        const stream = useAnalysisStore.getState().streams.find((s) => s.id === useAnalysisStore.getState().activeStreamId);
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

function renderPlayerDashboard() {
    if (!viewState.container) return;
    render(playerViewShellTemplate(), viewState.container);
    // After the shell is rendered, populate the individual components
    viewState.videoEl = viewState.container.querySelector('#player-video-element');
    viewState.videoContainer = viewState.container.querySelector('#video-container-element');
    viewState.controlsContainer = viewState.container.querySelector('#player-controls-container');
    viewState.bufferGraphContainer = viewState.container.querySelector('#buffer-graph-container-element');
    viewState.diagnosticPanelContainer = viewState.container.querySelector('#diagnostic-panel-container');

    renderControls();
    renderDiagnosticPanel();
}

function renderControls() {
    if (viewState.controlsContainer) {
        render(playerControlsTemplate(), viewState.controlsContainer);
    }
}

function renderDiagnosticPanel() {
    if (!viewState.diagnosticPanelContainer) return;

    const { activeTab, currentStats, eventLog, abrHistory, playbackHistory } = usePlayerStore.getState();
    const shakaConfig = playerService.getConfiguration();
    const bufferingGoal = shakaConfig?.streaming?.bufferingGoal || 10;

    const tabButton = (label, key) => {
        const isActive = activeTab === key;
        return html`<button
            @click=${() => playerActions.setActiveTab(key)}
            class="px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${isActive
                ? 'bg-zinc-800 text-white'
                : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-700/50'}"
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
        const abrChartOpts = abrHistoryChartOptions(abrHistory);
        const bufferChartOpts = bufferHealthChartOptions(playbackHistory, bufferingGoal);

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
        <div class="border-b border-zinc-700 flex space-x-2 px-4">${tabButton('Live Stats', 'stats')} ${tabButton('Graphs', 'graphs')} ${tabButton('Event Log', 'log')}</div>
        <div id="diagnostic-panel-content" class="grow p-4 overflow-y-auto">${content}</div>
    `;

    render(template, viewState.diagnosticPanelContainer);
}

const drmErrorTemplate = (error) => {
    // ...
};

const playerViewShellTemplate = () => {
    const { lastError } = viewState;
    const isDrmError = lastError?.code === 'DRM_NO_LICENSE_URL' || lastError?.code === 6007;

    return html`
        <div id="player-view-shell" class="grid grid-cols-1 lg:grid-cols-[1fr_450px] xl:grid-cols-[1fr_500px] gap-6 h-full">
            <div class="flex flex-col gap-6 min-h-0">
                <div data-shaka-player-container id="video-container-element" class="w-full bg-black aspect-video relative shadow-2xl rounded-lg">
                    ${isDrmError ? drmErrorTemplate(lastError) : ''}
                    <video id="player-video-element" class="w-full h-full rounded-lg" data-shaka-player></video>
                </div>
                <div id="buffer-graph-container-element" class="h-8 rounded-lg bg-zinc-800"></div>
                <div id="player-controls-container" class="grow overflow-y-auto pr-2"></div>
            </div>
            <div id="diagnostic-panel-container" class="bg-zinc-900/50 rounded-lg border border-zinc-700/50 flex flex-col min-h-0"></div>
        </div>
    `;
};


export const playerView = {
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
    deactivate() {},
    mount(containerElement, { stream }) {
        if (viewState.isMounted) return;
        viewState.container = containerElement;
        viewState.lastError = null;

        renderPlayerDashboard();
        playerService.initialize(viewState.videoEl, viewState.videoContainer);

        viewState.subscriptions.push(usePlayerStore.subscribe(renderControls));
        viewState.subscriptions.push(useAnalysisStore.subscribe(renderControls));
        viewState.subscriptions.push(usePlayerStore.subscribe(renderDiagnosticPanel));
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