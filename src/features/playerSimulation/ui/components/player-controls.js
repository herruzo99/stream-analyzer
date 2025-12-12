import { useAnalysisStore } from '@/state/analysisStore';
import { usePlayerStore } from '@/state/playerStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { toggleDropdown } from '@/ui/services/dropdownService';
import { formatBitrate } from '@/ui/shared/format';
import { html, render } from 'lit-html';
import { playerService } from '../../application/playerService.js';
import {
    abrFormTemplate,
    bufferFormTemplate,
    latencyFormTemplate,
} from './advanced-config-forms.js';
import {
    audioSelectionPanelTemplate,
    textSelectionPanelTemplate,
    videoSelectionPanelTemplate,
} from './track-selection-dropdown.js';

const actionButton = (
    icon,
    label,
    onClick,
    isActive = false,
    colorClass = 'text-slate-400'
) => html`
    <button
        @click=${onClick}
        class="flex flex-col items-center justify-center w-16 h-14 rounded-lg border transition-all ${isActive
            ? 'bg-blue-600/20 border-blue-500 text-blue-200 shadow-[0_0_10px_rgba(37,99,235,0.2)]'
            : `bg-slate-800 border-slate-700 ${colorClass} hover:text-slate-200 hover:bg-slate-700 hover:border-slate-500`}"
        title="${label}"
    >
        <span class="scale-90 mb-1">${icon}</span>
        <span class="text-[9px] font-bold uppercase tracking-wider"
            >${label}</span
        >
    </button>
`;

const trackPill = (icon, label, value, onClick, isActive = false) => html`
    <button
        @click=${onClick}
        class="flex items-center gap-3 px-3 py-2 rounded-lg border transition-all min-w-[180px] ${isActive
            ? 'bg-slate-800 border-blue-500/50 text-white'
            : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:border-slate-700'}"
    >
        <div class="p-1.5 rounded bg-slate-950 text-slate-500">${icon}</div>
        <div class="flex flex-col items-start text-left overflow-hidden">
            <span
                class="text-[9px] font-bold uppercase tracking-wider opacity-60"
                >${label}</span
            >
            <span class="text-xs font-mono truncate w-full">${value}</span>
        </div>
        <span class="ml-auto text-slate-600 scale-75"
            >${icons.chevronDown}</span
        >
    </button>
`;

class PlayerControlsComponent extends HTMLElement {
    connectedCallback() {
        this.render();
        this.unsub = usePlayerStore.subscribe(() => this.render());
        this.unsubUi = useUiStore.subscribe(() => this.render());
    }

    disconnectedCallback() {
        if (this.unsub) this.unsub();
        if (this.unsubUi) this.unsubUi();
    }

    render() {
        const store = usePlayerStore.getState();
        const {
            playerControlMode,
            isSignalMonitorOpen,
            playerTelemetrySidebarOpen,
        } = useUiStore.getState();
        const { activeStreamId, streams } = useAnalysisStore.getState();

        const {
            isLoaded,
            isAbrEnabled,
            activeVideoTrack,
            activeAudioTrack,
            activeTextTrack,
            videoTracks,
            audioTracks,
            textTracks,
            playbackState,
            isMuted,
        } = store;
        const isPlaying =
            playbackState === 'PLAYING' || playbackState === 'BUFFERING';

        // --- Handle Play/Start Logic ---
        const handlePlayClick = () => {
            if (isLoaded) {
                playerService.togglePlay();
            } else {
                const activeStream = streams.find(
                    (s) => s.id === activeStreamId
                );
                if (activeStream) {
                    playerService.load(activeStream, true);
                }
            }
        };

        // --- Labels ---
        const videoValue = isAbrEnabled
            ? `Auto (${activeVideoTrack ? `${activeVideoTrack.height}p` : '...'})`
            : `${activeVideoTrack?.height}p @ ${formatBitrate(activeVideoTrack?.bandwidth)}`;

        const audioValue =
            activeAudioTrack?.label || activeAudioTrack?.language || 'Default';
        const textValue =
            activeTextTrack?.label || activeTextTrack?.language || 'Off';

        // --- Config Access ---
        const playerConfig = playerService.getConfiguration();

        const template = html`
            <div class="h-full flex flex-col">
                <!-- Main Toolbar -->
                <div
                    class="flex items-center gap-6 p-4 overflow-x-auto scrollbar-hide"
                >
                    <!-- Transport -->
                    <div
                        class="flex gap-2 shrink-0 border-r border-slate-800 pr-6"
                    >
                        ${actionButton(
                            isPlaying ? icons.pause : icons.play,
                            isPlaying ? 'Pause' : isLoaded ? 'Play' : 'Start',
                            handlePlayClick,
                            isPlaying
                        )}
                        ${actionButton(
                            icons.stop,
                            'Stop',
                            () => playerService.destroy(),
                            false,
                            'text-red-400 hover:text-red-300 hover:border-red-900/50'
                        )}
                        ${actionButton(
                            isMuted ? icons.volumeOff : icons.volumeUp,
                            isMuted ? 'Unmute' : 'Mute',
                            () => playerService.toggleMute(),
                            !isMuted
                        )}
                        ${actionButton(icons.sync, 'Reload', () =>
                            playerService.load(
                                streams.find((s) => s.id === activeStreamId),
                                true
                            )
                        )}
                    </div>

                    <!-- Tracks -->
                    <div class="flex gap-3 shrink-0">
                        ${trackPill(
                            icons.clapperboard,
                            'Video Quality',
                            videoValue,
                            (e) =>
                                toggleDropdown(
                                    e.currentTarget,
                                    () =>
                                        videoSelectionPanelTemplate(
                                            videoTracks,
                                            isAbrEnabled,
                                            activeStreamId
                                        ),
                                    e
                                ),
                            !isAbrEnabled
                        )}
                        ${trackPill(
                            icons.audioLines,
                            'Audio Track',
                            audioValue,
                            (e) =>
                                toggleDropdown(
                                    e.currentTarget,
                                    () =>
                                        audioSelectionPanelTemplate(
                                            audioTracks,
                                            activeStreamId
                                        ),
                                    e
                                )
                        )}
                        ${trackPill(
                            icons.fileText,
                            'Subtitles',
                            textValue,
                            (e) =>
                                toggleDropdown(
                                    e.currentTarget,
                                    () =>
                                        textSelectionPanelTemplate(
                                            textTracks,
                                            activeStreamId
                                        ),
                                    e
                                ),
                            !!activeTextTrack
                        )}
                    </div>

                    <div class="grow"></div>

                    <!-- Advanced Toggle -->
                    <div
                        class="flex gap-2 shrink-0 border-l border-slate-800 pl-6"
                    >
                        <!-- QC Toggle -->
                        ${actionButton(
                            icons.activity,
                            'QC Scope',
                            () => uiActions.toggleSignalMonitor(),
                            isSignalMonitorOpen,
                            'text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/30'
                        )}

                        <!-- Sidebar Toggle (Moved here) -->
                        ${actionButton(
                            icons.sidebarRight,
                            'Sidebar',
                            () => uiActions.togglePlayerTelemetrySidebar(),
                            playerTelemetrySidebarOpen,
                            'text-blue-400 hover:text-blue-300 hover:border-blue-500/30'
                        )}
                        ${actionButton(
                            icons.slidersHorizontal,
                            'Config',
                            () =>
                                uiActions.setPlayerControlMode(
                                    playerControlMode === 'standard'
                                        ? 'advanced'
                                        : 'standard'
                                ),
                            playerControlMode === 'advanced'
                        )}
                    </div>
                </div>

                <!-- Advanced Configuration Panel (Slide Down) -->
                ${playerControlMode === 'advanced'
                    ? html`
                          <div
                              class="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 bg-black/20 border-t border-slate-800 shadow-inner animate-slideInUp min-h-0 overflow-y-auto"
                          >
                              ${latencyFormTemplate(playerConfig)}
                              ${bufferFormTemplate(playerConfig)}
                              ${abrFormTemplate(playerConfig)}
                          </div>
                      `
                    : ''}
            </div>
        `;

        render(template, this);
    }
}
customElements.define('player-controls-component', PlayerControlsComponent);
