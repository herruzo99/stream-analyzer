import { useAnalysisStore } from '@/state/analysisStore';
import { playerActions, usePlayerStore } from '@/state/playerStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import { html, render } from 'lit-html';
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
import './components/connected-right-sidebar.js';
import { telemetryPanelTemplate } from './components/telemetry-panel.js';
// Imports for Config Forms
import {
    abrFormTemplate,
    autoRestartFormTemplate,
    bufferFormTemplate,
    latencyFormTemplate,
} from './components/advanced-config-forms.js';


class PlayerSimulationView {
    // Port note: was `extends BaseView` (never committed). Plain class
    // with inlined mount/unmount/subscribe; slots composed in-container
    // (no shell slots/padding helpers in 1.2.0).
    constructor() {
        this.hasContextualSidebar = true;
        this._unsubs = [];
        this.container = null;
        this.stream = null;

        // View State
        this.viewState = {
            videoEl: null,
            videoContainer: null,
            isHudVisible: true,
            lastLoadedStreamId: null,
            isSwitching: false,
            _cachedSidebarOpenState: undefined,
            _cachedBottomBarState: undefined,
            _cachedSubNavState: undefined,
        };
    }

    // =========================================================================
    // LIFECYCLE HOOKS
    // =========================================================================

    subscribe(store, listener) {
        const unsubscribe = store.subscribe(listener);
        this._unsubs.push(unsubscribe);
        return unsubscribe;
    }

    /**
     * @param {HTMLElement} containerElement
     * @param {{ stream?: any }} [args]
     */
    mount(containerElement, { stream } = {}) {
        this.container = containerElement;
        this.stream = stream || null;
        this.onMount();
    }

    unmount() {
        this.onUnmount();
        for (const unsubscribe of this._unsubs.splice(0)) {
            try {
                unsubscribe();
            } catch {
                /* ignore late unsubscribe errors */
            }
        }
        if (this.container) render(html``, this.container);
        this.container = null;
        this.stream = null;
    }

    onMount() {
        // Subscribe to Stores
        this.subscribe(usePlayerStore, () => this.render());

        this.subscribe(useUiStore, (state, prevState) => {
            const relevantKeys = ['isSignalMonitorOpen', 'pendingPlayerRequest', 'activeTab'];
            // Side Effects Only (Logic, not Rendering)
            // BaseView now handles the re-render for us.
            if (!prevState || relevantKeys.some(key => state[key] !== prevState[key])) {
                this.checkAndLoadStream();
            }
        });

        this.subscribe(useAnalysisStore, () => {
            this.checkAndLoadStream();
            this.render();
        });

        // Initial Load
        this.checkAndLoadStream();
    }

    onUnmount() {
        this.viewState.videoEl = null;
        this.viewState.videoContainer = null;
        // BaseView calls cleanupShellSlots() and cleanupSubscriptions() 
        // AND restores main padding automatically.
    }

    onActivate(stream) {
        playerActions.setPipUnmountState(false);
        playerActions.setActiveTab('telemetry');

        // --- SHELL LAYOUT ACTIVATION ---
        uiActions.setActiveSidebar('contextual');

        this.render();
        this.checkAndLoadStream();
    }

    onDeactivate() {
        const { playbackState, isPictureInPicture } = usePlayerStore.getState();
        const isPlaying =
            playbackState === 'PLAYING' || playbackState === 'BUFFERING';

        if (isPlaying || isPictureInPicture) {
            playerActions.setPipUnmountState(true);
        } else {
            playerService.unload();
            this.viewState.lastLoadedStreamId = null;
        }

        // (Port: no shell slots in 1.2.0; the next mount renders fresh.)
        this.viewState._cachedSidebarOpenState = undefined;
        this.viewState._cachedBottomBarState = undefined;
        this.viewState._cachedSubNavState = undefined;
    }

    // =========================================================================
    // LOGIC
    // =========================================================================

    async checkAndLoadStream() {
        if (this.viewState.isSwitching) return;

        const { streams, activeStreamId } = useAnalysisStore.getState();
        const { pendingPlayerRequest } = useUiStore.getState();
        const { playbackState } = usePlayerStore.getState();

        const activeStream = streams.find((s) => s.id === activeStreamId) ?? streams[0];
        if (!activeStream) return;

        const isPlayerActive =
            playbackState !== 'IDLE' && playbackState !== 'ENDED';
        const shouldLoad = isPlayerActive || !!pendingPlayerRequest;

        if (!shouldLoad) return;

        const startTime = pendingPlayerRequest?.startTime || null;
        const autoPlay = pendingPlayerRequest?.autoPlay || false;

        // 1. Same Stream
        if (activeStreamId === this.viewState.lastLoadedStreamId) {
            if (pendingPlayerRequest) {
                const player = playerService.getPlayer();
                if (player && playerService.isInitialized) {
                    const { isLoaded } = usePlayerStore.getState();
                    if (!isLoaded) {
                        await playerService.load(activeStream, autoPlay, startTime);
                    } else {
                        if (startTime !== null) playerService.seek(startTime);
                        if (autoPlay) {
                            const video = player.getMediaElement();
                            if (video) video.play().catch(() => { });
                        }
                    }
                }
                uiActions.clearPendingPlayerRequest();
            }
            return;
        }

        // 2. New Stream
        if (activeStreamId !== this.viewState.lastLoadedStreamId) {
            this.viewState.lastLoadedStreamId = activeStreamId;
            this.viewState.isSwitching = true;
            this.render(); // Show spinner

            try {
                playerService.destroy();
                // Wait for render cycle potentially?
                await new Promise((resolve) => requestAnimationFrame(resolve));

                // Re-query elements as they might have been re-rendered
                const videoEl = this.container.querySelector('#player-video-element');
                const videoContainer = this.container.querySelector('#video-container-element');

                if (videoEl && videoContainer) {
                    await playerService.initialize(videoEl, videoContainer);
                    await playerService.load(activeStream, autoPlay, startTime);
                    if (pendingPlayerRequest) uiActions.clearPendingPlayerRequest();
                }
            } catch (e) {
                console.error('[PlayerView] Failed to switch stream:', e);
                this.viewState.lastLoadedStreamId = null;
            } finally {
                this.viewState.isSwitching = false;
                this.render();
            }
        }
    }

    // =========================================================================
    // RENDERING
    // =========================================================================

    /**
     * Override main render to handle specific slot logic and active tab guards.
     */
    render() {
        if (!this.container) return;

        const { streams, activeStreamId } = useAnalysisStore.getState();
        const activeStream = streams.find((s) => s.id === activeStreamId) ?? streams[0];
        const playerState = usePlayerStore.getState();
        const { isSignalMonitorOpen, activeTab, playerTelemetrySidebarOpen, playerControlMode } = useUiStore.getState();

        // --- Empty State ---
        if (!activeStream) {
            render(
                html`<div class="p-10 text-center text-slate-400">No stream loaded.</div>`,
                this.container
            );
            return;
        }

        // --- Guard: Background Playback ---
        // If not active tab, ONLY render content, DO NOT touch global slots
        if (activeTab !== 'player-simulation') {
            render(
                this.renderPlayerContent(activeStream, playerState),
                this.container
            );
            return;
        }

        // --- Active Tab: Render Everything ---

        // 1-4. Composed layout (1.2.0 has no shell slots): player content
        // with telemetry sidebar, config shelf and signal monitors.

        // 2. Right Sidebar (Telemetry & Logs)
        // Optimization: Only update the slot if the open state has changed.
        // We do typically want to update if it opens. If it is already open, we rely on the CONNECTED component to update itself.

        // Sidebar panel (was rightSidebar slot). The connected component
        // handles its own data subscriptions.
        const showSidebar = playerTelemetrySidebarOpen;
        const sidebarElement = showSidebar
            ? html`<connected-right-sidebar class="w-full h-full block"></connected-right-sidebar>`
            : null;

        // 3. Bottom Bar (Dynamic Config Shelf, was bottomBar slot)
        const isAdvancedMode = playerControlMode === 'advanced';
        const bottomElement = isAdvancedMode ? this.renderBottomConfig() : null;

        // 4. Signal monitors (was subNav slot)
        const isSignalOpen = isSignalMonitorOpen;
        const monitorElement = isSignalOpen
            ? html`
                    <div class="h-full flex flex-col overflow-hidden bg-slate-800"
                         style=" border-radius: 0.75rem; backdrop-filter: blur(12px); box-shadow: 0 8px 30px rgb(0 0 0 / 0.35);">
                         <div class="flex items-center gap-2 p-4 border-b border-slate-800"
                              style="padding: 1rem;">
                            <h3 class="font-bold text-slate-100 text-sm flex items-center gap-2">
                                 ${icons.activity} Signal Monitor
                            </h3>
                         </div>
                         <div class="grow min-h-0 relative border-b border-slate-800">
                              <signal-monitor-video class="absolute inset-0"></signal-monitor-video>
                         </div>
                         <div class="h-24 shrink-0 relative">
                              <signal-monitor-audio class="absolute inset-0"></signal-monitor-audio>
                         </div>
                    </div>
                `
            : null;

        render(
            html`
            <div class="flex flex-col h-full w-full overflow-hidden">
                <div class="grow min-h-0 flex overflow-hidden">
                    <div class="grow min-h-0 overflow-hidden">
                        ${this.renderPlayerContent(activeStream, playerState)}
                    </div>
                    ${sidebarElement
                        ? html`<div
                              class="w-80 shrink-0 border-l border-slate-800 overflow-y-auto custom-scrollbar hidden xl:block"
                          >
                              ${sidebarElement}
                          </div>`
                        : ''}
                </div>
                ${bottomElement
                    ? html`<div
                          class="shrink-0 h-64 min-h-0 border-t border-slate-800 overflow-hidden"
                      >
                          ${bottomElement}
                      </div>`
                    : ''}
                ${monitorElement
                    ? html`<div
                          class="shrink-0 h-56 min-h-0 border-t border-slate-800 overflow-hidden"
                      >
                          ${monitorElement}
                      </div>`
                    : ''}
            </div>
        `,
            this.container
        );

        // --- Post-Render Init ---
        // Ensure player is initialized if elements exist and stream is ready
        if (!this.viewState.videoEl) {
            this.viewState.videoEl = this.container.querySelector('#player-video-element');
            this.viewState.videoContainer = this.container.querySelector('#video-container-element');

            if (this.viewState.videoEl && !playerService.isInitialized) {
                // Defer init slightly to ensure DOM is ready
                setTimeout(() => {
                    if (this.viewState.videoEl && !playerService.isInitialized) {
                        playerService.initialize(this.viewState.videoEl, this.viewState.videoContainer);
                    }
                }, 0);
            }
        }
    }

    renderPlayerContent(stream, playerState) {
        const { currentStats, isLoaded, retryCount, isAutoResetEnabled, eventLog } = playerState;
        const { isSwitching, isHudVisible } = this.viewState;

        // Error Logic
        let activeError = null;
        if (eventLog.length > 0) {
            const lastEvent = eventLog[0];
            if (lastEvent.type === 'error') {
                activeError = lastEvent.details;
            } else if (retryCount > 0) {
                const lastError = eventLog.find((e) => e.type === 'error');
                if (lastError) activeError = lastError.details;
            }
        }

        // Manual Launch Handler
        const handleManualLaunch = async () => {
            if (stream) {
                this.viewState.lastLoadedStreamId = stream.id;
                try {
                    if (!playerService.isInitialized && this.viewState.videoEl) {
                        await playerService.initialize(this.viewState.videoEl, this.viewState.videoContainer);
                    }
                    await playerService.load(stream, true);
                } catch (e) { console.error('Manual launch failed:', e); }
            }
        };

        let videoOverlayContent = html``;
        if (isSwitching) {
            videoOverlayContent = html`
            <div class="absolute inset-0 z-50 flex flex-col items-center justify-centertext-blue-500 animate-fadeIn" >
                    <div class="scale-150 mb-4 animate-spin">${icons.spinner}</div>
                    <span class="text-sm font-mono uppercase tracking-widest">Initializing Stream...</span>
                </div >
            `;
        } else if (!isLoaded && !activeError) {
            videoOverlayContent = html`
            <div class="absolute inset-0 z-40 flex flex-col items-center justify-center bg-slate-800 animate-fadeIn" >
                    <div class="p-4 rounded-full bg-slate-800 text-slate-400 mb-4 border border-slate-800 shadow-xl">
                        ${icons.play}
                    </div>
                    <h3 class="text-lg font-bold text-slate-100 mb-1">Player Ready</h3>
                    <p class="text-sm text-slate-400 mb-6 max-w-xs text-center">
                        Stream: <span class="text-slate-100 font-semibold">${stream.name}</span>
                    </p>
                    <button @click=${handleManualLaunch} class="px-8 py-3 bg-blue-500 hover:bg-[#60a5fa] text-slate-100 font-bold rounded-full transition-all flex items-center gap-2 shadow-[0_0_20px_#3b82f6] hover:scale-105 active:scale-95 duration-300" >
            ${icons.play} Launch Stream
                    </button >
                </div >
            `;
        }

        return html`
            <div class="flex flex-col h-full w-full relative overflow-hidden" style = "gap: 0.75rem" >
                <!--Video Area(Pane 1: The Stage)-->
                <!--
            Use a dedicated wrapper for the video to handle the "darker square" issue.
                    The key is ensuring the background is applied to the CONTAINER, while the VIDEO
                    sits cleanly inside, masked by overflow - hidden.
                -->
                <div class="grow relative min-h-0 flex flex-col justify-center rounded-xl overflow-hidden group bg-black">
                     <!-- 
                        Ambient Glow (Optional, for that 'premium' feel behind the video) 
                        Implementation: A subtle radial gradient that is only visible if video has letterboxing
                     -->
                     <div class="absolute inset-0 bg-gradient-to-b from-transparent to-black/50 pointer-events-none z-10"></div>

                     <!-- Header Overlay (Title) -->
                     <div class="absolute top-0 left-0 right-0 p-6 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-b from-black/90 via-black/40 to-transparent pointer-events-none">
                         <h2 class="text-xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wide truncate font-display">${stream.name}</h2>
                         <div class="flex items-center gap-2 mt-1">
                            <span class="text-[10px] uppercase tracking-widest text-white/70 font-mono border border-white/20 px-1.5 py-0.5 rounded">Live</span>
                         </div>
                     </div>

                     ${videoOverlayContent}
                     ${!isSwitching ? hudOverlayTemplate(currentStats, isHudVisible, stream, activeError, retryCount, isAutoResetEnabled) : ''}

                     <div id="video-container-element" class="w-full h-full relative z-0 flex items-center justify-center bg-black">
                         <!-- Video Element: Object Contain ensures aspect ratio is preserved -->
                         <video id="player-video-element" class="w-full h-full object-contain"></video>
                     </div>

                     <!-- Custom Transport Bar (Overlay on Video) -->
                     ${isLoaded && !isSwitching && !activeError ? html`
                        <div class="absolute bottom-0 left-0 right-0 z-40 transition-opacity duration-300 opacity-0 group-hover:opacity-100 pb-2">
                            ${customTransportBarTemplate(playerState)}
                        </div>
                     ` : ''}
                </div>

                <!--
            CONTROLS REGION
        "Be BOLD": The controls component now handles its own "Floating Glass" panes.
                     This container simply positions them at the bottom.
                     We removed the background / border here to prevent the "Double Layer" effect.
                -->
            <div class="shrink-0 relative overflow-visible transition-all duration-300 group/controls z-50">
                <player-controls-component class="w-full h-full block"></player-controls-component>
            </div>

             </div >
            `;
    }

    renderRightSidebar(activeTab, currentStats, eventLog) {
        const tabs = [
            { key: 'telemetry', label: 'Telemetry', icon: icons.activity },
            { key: 'logs', label: 'Event Log', icon: icons.list },
        ];

        return html`
            <div class="h-full flex flex-col overflow-hidden bg-slate-800"
        style = " border-radius: 0.75rem; backdrop-filter: blur(12px); box-shadow: 0 8px 30px rgb(0 0 0 / 0.35);" >
                 <div class="flex justify-between items-center p-4 border-b border-slate-800 bg-white/5"
                      style="padding: 1rem;">
                    <span class="font-bold text-sm text-slate-100">Analysis Data</span>
                    ${connectedTabBar(tabs, activeTab, (t) => playerActions.setActiveTab(t))}
                 </div>
                 <div class="grow relative p-0 overflow-y-auto">
                    ${activeTab === 'telemetry'
                ? html`<div class="absolute inset-0 overflow-y-auto p-4 custom-scrollbar">${telemetryPanelTemplate(currentStats)}</div>`
                : html`<div class="absolute inset-0 p-4 overflow-hidden flex flex-col">${eventLogTemplate(eventLog)}</div>`
            }
                </div>
            </div >
            `;
    }

    renderBottomConfig() {
        const playerConfig = playerService.getConfiguration();
        return html`
            <div class="h-full flex flex-col overflow-hidden bg-slate-800"
        style = " border-radius: 0.75rem; backdrop-filter: blur(12px); box-shadow: 0 8px 30px rgb(0 0 0 / 0.35);" >
            <div class="flex justify-between items-center p-4 border-b border-slate-800 bg-white/5"
                style="padding: 1rem;">
                <div class="flex items-center gap-2 text-slate-100 font-bold">
                    ${icons.slidersHorizontal}
                    <span>Stream Configuration</span>
                </div>
                <button @click=${() => uiActions.setPlayerControlMode('standard')}
                          class="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-100">
                ${icons.xCircle}
            </button>
                 </div >
            <div class="grow overflow-y-auto p-6" style="padding: 1rem;">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    ${latencyFormTemplate(playerConfig)}
                    ${bufferFormTemplate(playerConfig)}
                    ${abrFormTemplate(playerConfig)}
                    ${autoRestartFormTemplate()}
                </div>
            </div>
            </div >
            `;
    }
}

// Export Singleton Instance
export const playerView = new PlayerSimulationView();

