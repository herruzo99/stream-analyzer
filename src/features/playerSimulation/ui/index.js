import { useAnalysisStore } from '@/state/analysisStore';
import { playerActions, usePlayerStore } from '@/state/playerStore';
import { useUiStore } from '@/state/uiStore';
import { html, render } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map.js';
import 'shaka-player/dist/controls.css';
import { playerService } from '../application/playerService.js';

// Components
import '@/features/signalQuality/ui/signal-monitor.js';
import { connectedTabBar } from '@/ui/components/tabs';
import * as icons from '@/ui/icons';
import './components/custom-transport-bar.js';
import { customTransportBarTemplate } from './components/custom-transport-bar.js';
import { eventLogTemplate } from './components/event-log.js';
import { hudOverlayTemplate } from './components/hud-overlay.js';
import './components/player-controls.js';
import { telemetryPanelTemplate } from './components/telemetry-panel.js';

const viewState = {
    container: null,
    videoEl: null,
    videoContainer: null,
    subscriptions: [],
    isHudVisible: true,
    lastLoadedStreamId: null,
    isSwitching: false,
};

const cockpitLayoutTemplate = (stream, playerState) => {
    const {
        currentStats,
        eventLog,
        activeTab,
        isLoaded,
        retryCount,
        isAutoResetEnabled,
    } = playerState;
    const { isSwitching } = viewState;
    const { isSignalMonitorOpen, playerTelemetrySidebarOpen } =
        useUiStore.getState();

    let activeError = null;
    if (retryCount > 0 && eventLog.length > 0) {
        const lastError = eventLog.find((e) => e.type === 'error');
        if (lastError) activeError = lastError.details;
    }

    const handleToggleHud = () => {
        viewState.isHudVisible = !viewState.isHudVisible;
        requestAnimationFrame(() => renderPlayerView());
    };

    const handleManualLaunch = async () => {
        if (stream) {
            viewState.lastLoadedStreamId = stream.id;
            try {
                if (!playerService.isInitialized && viewState.videoEl) {
                    await playerService.initialize(
                        viewState.videoEl,
                        viewState.videoContainer
                    );
                }
                await playerService.load(stream, true);
            } catch (e) {
                console.error('Manual launch failed:', e);
            }
        }
    };

    const tabs = [
        { key: 'telemetry', label: 'Telemetry', icon: icons.activity },
        { key: 'logs', label: 'Event Log', icon: icons.list },
    ];

    let videoOverlayContent = html``;

    if (isSwitching) {
        videoOverlayContent = html`
            <div
                class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 text-blue-400 animate-fadeIn"
            >
                <div class="scale-150 mb-4 animate-spin">${icons.spinner}</div>
                <span class="text-sm font-mono uppercase tracking-widest"
                    >Initializing Stream...</span
                >
            </div>
        `;
    } else if (!isLoaded && !activeError) {
        videoOverlayContent = html`
            <div
                class="absolute inset-0 z-40 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-fadeIn"
            >
                <div
                    class="p-4 rounded-full bg-slate-800 text-slate-500 mb-4 border border-slate-700 shadow-xl"
                >
                    ${icons.play}
                </div>
                <h3 class="text-lg font-bold text-white mb-1">Player Ready</h3>
                <p class="text-sm text-slate-400 mb-6 max-w-xs text-center">
                    Stream:
                    <span class="text-slate-200 font-semibold"
                        >${stream.name}</span
                    >
                </p>
                <button
                    @click=${handleManualLaunch}
                    class="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20 hover:scale-105 active:scale-95"
                >
                    ${icons.play} Launch Stream
                </button>
            </div>
        `;
    }

    const audioMonitorClasses = classMap({
        'shrink-0': true,
        'border-r': true,
        'border-slate-800': true,
        'z-20': true,
        'w-12': true,
        'bg-slate-950': true,
        'transition-[width]': true,
        'duration-300': true,
        hidden: !isSignalMonitorOpen,
        flex: true,
        'flex-col': true,
    });

    const videoMonitorHeight = 'h-64';

    const sidebarClasses = classMap({
        flex: true,
        'flex-col': true,
        'border-l': true,
        'border-slate-800': true,
        'bg-slate-950/50': true,
        'shrink-0': true,
        'transition-[width]': true,
        'duration-300': true,
        'w-[350px]': playerTelemetrySidebarOpen,
        'w-[0px]': !playerTelemetrySidebarOpen,
        'overflow-hidden': true,
    });

    return html`
        <div
            class="flex flex-col h-full bg-slate-950 text-slate-200 overflow-hidden"
        >
            <!-- MAIN STAGE ROW -->
            <div class="flex-1 flex min-h-0 relative">
                <!-- 1. LEFT: Audio QC (Vertical) -->
                <div class="${audioMonitorClasses}">
                    ${isSignalMonitorOpen
                        ? html`<signal-monitor-audio></signal-monitor-audio>`
                        : ''}
                </div>

                <!-- 2. CENTER: Player & Video QC -->
                <div class="flex-grow flex flex-col min-w-0 relative bg-black">
                    <!-- Player Area (Flex Grow) -->
                    <!-- FIX: Enforce minimum height to prevent squat layout -->
                    <div
                        class="flex-grow relative overflow-hidden group bg-black min-h-[480px] flex flex-col justify-center"
                    >
                        <!-- Header Overlay -->
                        <div
                            class="absolute top-0 left-0 right-0 p-4 z-30 opacity-0 hover:opacity-100 transition-opacity duration-300 bg-gradient-to-b from-black/80 to-transparent pointer-events-none"
                        >
                            <h2
                                class="text-lg font-bold text-white drop-shadow-md"
                            >
                                ${stream.name}
                            </h2>
                        </div>

                        ${videoOverlayContent}
                        ${!isSwitching
                            ? hudOverlayTemplate(
                                  currentStats,
                                  viewState.isHudVisible,
                                  stream,
                                  activeError,
                                  retryCount,
                                  isAutoResetEnabled
                              )
                            : ''}

                        <button
                            @click=${handleToggleHud}
                            class="absolute top-4 right-4 z-40 p-2 rounded-full bg-black/40 hover:bg-black/80 text-slate-300 hover:text-white transition-all backdrop-blur-sm border border-white/10 shadow-lg cursor-pointer pointer-events-auto"
                            title="Toggle HUD"
                        >
                            ${icons.monitor}
                        </button>

                        <div
                            id="video-container-element"
                            class="w-full h-full relative flex items-center justify-center bg-black"
                        >
                            <video
                                id="player-video-element"
                                class="w-full h-full object-contain"
                            ></video>
                        </div>

                        ${isLoaded && !isSwitching && !activeError
                            ? customTransportBarTemplate(playerState)
                            : ''}
                    </div>

                    <!-- Bottom: Video QC (Fixed Height) -->
                    ${isSignalMonitorOpen
                        ? html`
                              <div
                                  class="${videoMonitorHeight} shrink-0 border-t border-slate-800 relative z-10 bg-slate-950"
                              >
                                  <signal-monitor-video></signal-monitor-video>
                              </div>
                          `
                        : ''}
                </div>

                <!-- 3. RIGHT: Telemetry (Sidebar) -->
                <div class="${sidebarClasses}">
                    <div
                        class="px-4 pt-2 bg-slate-900/80 border-b border-slate-800 flex justify-between items-center h-10 shrink-0"
                    >
                        ${connectedTabBar(tabs, activeTab, (t) =>
                            playerActions.setActiveTab(t)
                        )}
                    </div>
                    <div
                        class="grow overflow-y-auto p-4 custom-scrollbar bg-slate-900/30"
                    >
                        ${activeTab === 'telemetry'
                            ? telemetryPanelTemplate(currentStats)
                            : eventLogTemplate(eventLog)}
                    </div>
                </div>
            </div>

            <!-- BOTTOM ROW: Command Deck -->
            <div
                class="shrink-0 bg-slate-900 border-t border-slate-800 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]"
            >
                <player-controls-component></player-controls-component>
            </div>
        </div>
    `;
};

function renderPlayerView() {
    if (!viewState.container) return;
    const { streams, activeStreamId } = useAnalysisStore.getState();
    const activeStream = streams.find((s) => s.id === activeStreamId);
    const playerState = usePlayerStore.getState();
    if (!activeStream) {
        render(
            html`<div class="p-10 text-center text-slate-500">
                No stream loaded.
            </div>`,
            viewState.container
        );
        return;
    }
    render(
        cockpitLayoutTemplate(activeStream, playerState),
        viewState.container
    );
    if (!viewState.videoEl) {
        viewState.videoEl = viewState.container.querySelector(
            '#player-video-element'
        );
        viewState.videoContainer = viewState.container.querySelector(
            '#video-container-element'
        );
        if (viewState.videoEl && !playerService.isInitialized) {
            playerService.initialize(
                viewState.videoEl,
                viewState.videoContainer
            );
        }
    }
}

async function checkAndLoadStream() {
    if (viewState.isSwitching) return;
    const { isLoaded } = usePlayerStore.getState();
    if (!isLoaded) return;
    const { streams, activeStreamId } = useAnalysisStore.getState();
    const activeStream = streams.find((s) => s.id === activeStreamId);
    if (!activeStream) return;
    if (activeStreamId !== viewState.lastLoadedStreamId) {
        viewState.lastLoadedStreamId = activeStreamId;
        viewState.isSwitching = true;
        renderPlayerView();
        try {
            playerService.destroy();
            await new Promise((resolve) => requestAnimationFrame(resolve));
            const videoEl = viewState.container.querySelector(
                '#player-video-element'
            );
            const videoContainer = viewState.container.querySelector(
                '#video-container-element'
            );
            if (videoEl && videoContainer) {
                await playerService.initialize(videoEl, videoContainer);
                await playerService.load(activeStream, true);
            }
        } catch (e) {
            console.error('[PlayerView] Failed to switch stream:', e);
            viewState.lastLoadedStreamId = null;
        } finally {
            viewState.isSwitching = false;
            renderPlayerView();
        }
    }
}

export const playerView = {
    hasContextualSidebar: false,
    activate(stream) {
        playerActions.setPipUnmountState(false);
        playerActions.setActiveTab('telemetry');
        checkAndLoadStream();
    },
    deactivate() {
        const { playbackState, isPictureInPicture } = usePlayerStore.getState();
        const isPlaying =
            playbackState === 'PLAYING' || playbackState === 'BUFFERING';
        if (isPlaying || isPictureInPicture) {
            playerActions.setPipUnmountState(true);
        } else {
            playerService.unload();
            viewState.lastLoadedStreamId = null;
        }
    },
    mount(containerElement, { stream }) {
        viewState.container = containerElement;
        viewState.lastLoadedStreamId = null;
        viewState.isSwitching = false;
        viewState.subscriptions.forEach((unsub) => unsub());
        viewState.subscriptions = [];
        viewState.subscriptions.push(
            usePlayerStore.subscribe(renderPlayerView)
        );
        viewState.subscriptions.push(useUiStore.subscribe(renderPlayerView));
        viewState.subscriptions.push(
            useAnalysisStore.subscribe(() => {
                checkAndLoadStream();
                renderPlayerView();
            })
        );
        renderPlayerView();
        checkAndLoadStream();
    },
    unmount() {
        playerService.destroy();
        viewState.subscriptions.forEach((unsub) => unsub());
        viewState.subscriptions = [];
        if (viewState.container) render(html``, viewState.container);
        viewState.container = null;
        viewState.videoEl = null;
        viewState.videoContainer = null;
        viewState.lastLoadedStreamId = null;
    },
};
