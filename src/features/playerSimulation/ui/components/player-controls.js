import { useAnalysisStore } from '@/state/analysisStore';
import { usePlayerStore } from '@/state/playerStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { toggleDropdown } from '@/ui/services/dropdownService';
import { html, render } from 'lit-html';
import { playerService } from '../../application/playerService.js';
import {
    audioSelectionPanelTemplate,
    textSelectionPanelTemplate,
    videoSelectionPanelTemplate,
} from './track-selection-dropdown.js';

// --- Shared Styles ---
// We use inline styles for the "Region" variables to ensure compliance with the Layout Engine
const regionStyle = `
    
    border-radius: 0.75rem;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    gap: 0.75rem;
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

        // --- Helper: Format Values ---
        const videoValue = isAbrEnabled
            ? `Auto (${activeVideoTrack ? `${activeVideoTrack.height}p` : '...'})`
            : `${activeVideoTrack?.height || '0'}p`;

        const formatLang = (track) => {
            if (track?.label) return track.label;
            if (track?.language) return track.language.toUpperCase();
            return 'DEF';
        };

        const audioValue = formatLang(activeAudioTrack);
        const textValue = activeTextTrack ? formatLang(activeTextTrack) : 'OFF';

        // --- VISUAL ELEMENTS (The Glass Kit) ---

        // 1. The "Floating Orb" Play Button
        const renderOrbButton = () => html`
            <button @click=${handlePlayClick} 
                class="group relative flex items-center justify-center w-14 h-14 rounded-full transition-all duration-300 ml-1
                ${isPlaying
                ? 'bg-slate-800 text-blue-400 shadow-[0_4px_12px_rgba(0,0,0,0.3)] border border-blue-500/20'
                : 'bg-gradient-to-br from-blue-500 to-[#60a5fa] text-slate-100 shadow-[0_0_20px_-4px_#3b82f6] hover:shadow-[0_0_25px_-2px_#3b82f6] hover:scale-105'}">
                
                <!-- Inner gloss -->
                <div class="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 to-transparent opacity-50 pointer-events-none"></div>
                
                <div class="relative z-10 transition-transform duration-300 group-hover:scale-110 group-active:scale-95">
                     ${isPlaying ? icons.pause : icons.play}
                </div>
            </button>
        `;

        // 2. Glass Icon Button (Ghost)
        const renderGhostButton = (icon, label, onClick, isActive, isDanger = false) => html`
            <button @click=${onClick} title="${label}"
                class="relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200
                ${isDanger ? 'text-red-400 hover:bg-red-500/10' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-100/10'}
                ${isActive ? 'bg-slate-100/10 text-slate-100' : ''}">
                <span class="scale-90">${icon}</span>
            </button>
        `;

        // 3. Glass Tile Selector
        const renderGlassTile = (icon, label, value, onClick, isActive) => html`
            <button @click=${onClick}
                class="group relative flex flex-col justify-center px-4 py-1 h-full min-w-[100px] border-r border-slate-800/30 last:border-0 transition-all duration-300
                hover:bg-gradient-to-b hover:from-slate-100/5 hover:to-transparent
                ${isActive ? 'bg-blue-500/10' : ''}">
                
                <div class="flex items-center gap-2 mb-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                    <span class="scale-75 text-slate-400">${icon}</span>
                    <span class="text-[9px] font-bold uppercase tracking-widest text-slate-400">${label}</span>
                </div>
                
                <div class="flex items-center justify-between w-full">
                    <span class="text-sm font-medium font-mono text-slate-100 truncate max-w-[80px]">${value}</span>
                    <span class="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 scale-75 -mr-1">
                        ${icons.chevronDown}
                    </span>
                </div>

                <!-- Active Indicator Line -->
                ${isActive ? html`<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 shadow-[0_-2px_6px_#3b82f6]"></div>` : ''}
            </button>
        `;

        // 4. Utility Toggles
        const renderUtilToggle = (icon, label, onClick, isActive, colorClass = 'text-blue-400') => html`
            <button @click=${onClick} title="${label}"
                class="group relative w-10 h-full flex items-center justify-center transition-colors hover:bg-slate-100/5
                ${isActive ? '' : 'text-slate-400 opacity-70 hover:opacity-100'}">
                <span class="transition-transform duration-200 group-hover:scale-110 ${isActive ? colorClass + ' drop-shadow-md' : ''}">${icon}</span>
                ${isActive ? html`<div class="absolute bottom-1.5 w-1 h-1 rounded-full bg-current ${colorClass}"></div>` : ''}
            </button>
        `;

        const template = html`
            <div class="h-full w-full flex items-center p-4 relative justify-between" style="gap: 0.75rem">
                
                <!-- SINGLE CONTINUOUS BAR -->
                <!-- We remove the "Pane 1/Pane 2" split and the "double div" issue. 
                     The entire control set sits on one glass surface, or we treat them as sibling buttons 
                     on a transparent strip if we want "floating buttons". 
                     
                     Based on "Prism Glass" requests, usually a single floating capsule is best.
                -->
                <div class="flex items-center p-1 bg-slate-800 overflow-hidden relative group grow"
                     style="${regionStyle}">
                    
                    <!-- Transport -->
                    <div class="flex items-center gap-3 shrink-0 pl-1 relative z-10">
                        ${renderOrbButton()}
                        
                        <!-- Ghost buttons directly on the bar, no extra background -->
                        <div class="flex items-center gap-1 ml-2">
                             ${renderGhostButton(icons.stop, 'Stop', () => playerService.destroy(), false, true)}
                             ${renderGhostButton(icons.volumeUp, isMuted ? 'Unmute' : 'Mute', () => playerService.toggleMute(), !isMuted)}
                             ${renderGhostButton(icons.sync, 'Reload', () => playerService.load(streams.find((s) => s.id === activeStreamId) ?? streams[0], true), false)}
                        </div>
                    </div>

                    <!-- Divider -->
                    <div class="w-px h-8 bg-slate-800 opacity-30 mx-4"></div>

                    <!-- Stream Config (Video/Audio/Subs) -->
                    <div class="flex items-stretch h-12 grow relative z-10 mr-4">
                        ${renderGlassTile(
            icons.clapperboard, 'Video', videoValue,
            (e) => toggleDropdown(e.currentTarget, () => videoSelectionPanelTemplate(videoTracks, isAbrEnabled, activeStreamId), e),
            !isAbrEnabled
        )}
                        ${renderGlassTile(
            icons.audioLines, 'Audio', audioValue,
            (e) => toggleDropdown(e.currentTarget, () => audioSelectionPanelTemplate(audioTracks, activeStreamId), e),
            false
        )}
                        ${renderGlassTile(
            icons.fileText, 'Subs', textValue,
            (e) => toggleDropdown(e.currentTarget, () => textSelectionPanelTemplate(textTracks, activeStreamId), e),
            !!activeTextTrack
        )}
                    </div>

                    <!-- Tools (Right Side) -->
                    <div class="flex items-center gap-1 h-12 border-l border-slate-800/30 pl-2">
                         ${renderUtilToggle(
            icons.activity, 'Scope',
            () => uiActions.toggleSignalMonitor(),
            isSignalMonitorOpen,
            'text-emerald-400'
        )}
                        ${renderUtilToggle(
            icons.sidebarRight, 'Telemetry',
            () => {
                const now = performance.now();
                console.log(`[PERF] 1. Click Triggered: ${now.toFixed(2)}ms`);
                console.time('[PERF] Full Toggle Cycle');
                uiActions.togglePlayerTelemetrySidebar();
            },
            playerTelemetrySidebarOpen
        )}
                        ${renderUtilToggle(
            icons.slidersHorizontal, 'Config',
            () => uiActions.setPlayerControlMode(playerControlMode === 'standard' ? 'advanced' : 'standard'),
            playerControlMode === 'advanced'
        )}
                    </div>
                </div>

            </div>
        `;

        render(template, this);
    }
}
customElements.define('player-controls-component', PlayerControlsComponent);
