import { html, render } from 'lit-html';
import { playerService } from '../application/playerService.js';
import { useAnalysisStore } from '@/state/analysisStore';
import { usePlayerStore, playerActions } from '@/state/playerStore';
import 'shaka-player/dist/controls.css';

// Components
import './components/player-controls.js';
import './components/custom-transport-bar.js';
import { customTransportBarTemplate } from './components/custom-transport-bar.js';
import { hudOverlayTemplate } from './components/hud-overlay.js';
import { telemetryPanelTemplate } from './components/telemetry-panel.js';
import { eventLogTemplate } from './components/event-log.js';
import { connectedTabBar } from '@/ui/components/tabs';
import * as icons from '@/ui/icons';

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
    const { currentStats, eventLog, activeTab, isLoaded } = playerState;
    const { isSwitching } = viewState;

    const handleToggleHud = () => {
        viewState.isHudVisible = !viewState.isHudVisible;
        requestAnimationFrame(() => renderPlayerView());
    };

    const handleManualLaunch = () => {
        if (stream) {
            console.log(
                `[PlayerView] User initiated launch for: ${stream.name}`
            );
            viewState.lastLoadedStreamId = stream.id;
            playerService.load(stream, true);
        }
    };

    const tabs = [
        { key: 'telemetry', label: 'Telemetry', icon: icons.activity },
        { key: 'logs', label: 'Event Log', icon: icons.list },
    ];

    // Determine overlay content
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
    } else if (!isLoaded) {
        // Stopped / Idle / Error State -> Show Launch Button
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

    return html`
        <div
            class="flex flex-col h-full bg-slate-950 text-slate-200 overflow-hidden"
        >
            <!-- TOP ROW: Visual Stage & Telemetry -->
            <div
                class="flex-1 flex flex-col lg:flex-row min-h-0 relative border-b border-slate-800"
            >
                <!-- Left: Player Stage -->
                <div
                    class="flex-grow relative bg-black flex items-center justify-center overflow-hidden group"
                >
                    <!-- Header Overlay -->
                    <div
                        class="absolute top-0 left-0 right-0 p-4 z-30 opacity-0 hover:opacity-100 transition-opacity duration-300 bg-gradient-to-b from-black/80 to-transparent pointer-events-none"
                    >
                        <h2 class="text-lg font-bold text-white drop-shadow-md">
                            ${stream.name}
                        </h2>
                        <div class="flex gap-2 mt-1">
                            <span
                                class="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded uppercase"
                                >${stream.protocol}</span
                            >
                            <span
                                class="px-2 py-0.5 bg-slate-700 text-slate-300 text-[10px] font-mono rounded"
                                >${stream.manifest.type}</span
                            >
                        </div>
                    </div>

                    ${videoOverlayContent}

                    <!-- HUD Overlay -->
                    ${isLoaded && !isSwitching
                        ? hudOverlayTemplate(
                              currentStats,
                              viewState.isHudVisible,
                              stream // Pass the full stream object for context
                          )
                        : ''}

                    <!-- HUD Toggle -->
                    <button
                        @click=${handleToggleHud}
                        class="absolute top-4 right-4 z-40 p-2 rounded-full bg-black/40 hover:bg-black/80 text-slate-300 hover:text-white transition-all backdrop-blur-sm border border-white/10 shadow-lg cursor-pointer pointer-events-auto"
                        title="Toggle HUD"
                    >
                        ${icons.monitor}
                    </button>

                    <!-- Video Element -->
                    <div
                        id="video-container-element"
                        class="w-full h-full relative"
                    >
                        <video
                            id="player-video-element"
                            class="w-full h-full object-contain"
                        ></video>
                    </div>

                    <!-- Custom Scrubber -->
                    ${isLoaded && !isSwitching
                        ? customTransportBarTemplate(playerState)
                        : ''}
                </div>

                <!-- Right: Telemetry Sidebar -->
                <div
                    class="w-full lg:w-[350px] xl:w-[400px] flex flex-col border-l border-slate-800 bg-slate-950/50 shrink-0"
                >
                    <div
                        class="px-4 pt-2 bg-slate-900/80 border-b border-slate-800"
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

    // Ensure DOM references are captured after render
    if (!viewState.videoEl) {
        viewState.videoEl = viewState.container.querySelector(
            '#player-video-element'
        );
        viewState.videoContainer = viewState.container.querySelector(
            '#video-container-element'
        );

        // Initialize player if DOM is ready (but DO NOT load stream yet)
        if (viewState.videoEl && !playerService.isInitialized) {
            playerService.initialize(
                viewState.videoEl,
                viewState.videoContainer
            );
        }
    }
}

/**
 * Handles logic for stream switching.
 * This now ONLY acts if the player is currently loaded (hot-swapping).
 * It will NOT auto-start the player if it is in an idle/stopped state.
 */
async function checkAndLoadStream() {
    if (viewState.isSwitching) return;

    const { isLoaded } = usePlayerStore.getState();

    // --- CRITICAL FIX: Do not auto-load if player is not running ---
    if (!isLoaded) return;

    const { streams, activeStreamId } = useAnalysisStore.getState();
    const activeStream = streams.find((s) => s.id === activeStreamId);

    if (!activeStream) return;

    // Check if we need to switch
    if (activeStreamId !== viewState.lastLoadedStreamId) {
        console.log(
            `[PlayerView] Hot-swapping stream to: ${activeStream.name} (ID: ${activeStreamId})`
        );

        // 1. Lock & Update View State
        viewState.lastLoadedStreamId = activeStreamId;
        viewState.isSwitching = true;

        renderPlayerView();

        try {
            // 2. Perform Switch
            // We don't need to full destroy/init for hot-swap, just load new manifest
            // But destroy/init is safer for clean state between different protocols
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

        // We do NOT force load here. We just check if a hot-swap is needed.
        // If player was stopped, this will do nothing (user sees Launch button).
        checkAndLoadStream();
    },

    deactivate() {
        const { playbackState, isPictureInPicture } = usePlayerStore.getState();
        const isPlaying =
            playbackState === 'PLAYING' || playbackState === 'BUFFERING';

        if (isPlaying || isPictureInPicture) {
            playerActions.setPipUnmountState(true);
        } else {
            // If not playing or Pip, we can unload to save resources,
            // but keeping it initialized allows faster resume.
            // Standard behavior: Stop on tab switch unless PiP.
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

        viewState.subscriptions.push(
            useAnalysisStore.subscribe(() => {
                // On analysis store update (e.g. stream switch), check if we need to hot-swap
                checkAndLoadStream();
                renderPlayerView();
            })
        );

        renderPlayerView();
        // Initial check - will only load if player state was somehow persisted as loaded (unlikely on fresh mount)
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
