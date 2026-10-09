import { eventBus } from '@/application/event-bus';
import {
    getLastUsedStreams,
    getPresets,
    getWorkspaces,
} from '@/infrastructure/persistence/streamStorage';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import { EVENTS } from '@/types/events';
import * as icons from '@/ui/icons';
import { openModalWithContent } from '@/ui/services/modalService';
import { html, render } from 'lit-html';
import './smart-input.js';

class LandingViewComponent extends HTMLElement {
    constructor() {
        super();
        this.unsubs = [];
    }

    connectedCallback() {
        this._render(); // Initial render

        // React to UI store changes (Theme)
        this.unsubs.push(useUiStore.subscribe(() => this._render()));

        // React to Analysis store changes (History updates)
        this.unsubs.push(useAnalysisStore.subscribe(() => this._render()));
    }

    disconnectedCallback() {
        this.unsubs.forEach((unsub) => unsub());
        this.unsubs = [];
    }

    _render() {
        const history = getLastUsedStreams();
        const presets = getPresets();
        const workspaces = getWorkspaces();


        // 0. Styles
        const styles = html`
            <style>
                /* 
                 * Landing Root Override 
                 */
                .landing-root {
                    display: block !important;
                    width: 100%;
                    height: 100%;
                    position: relative;
                    overflow-y: auto;
                    background: transparent;
                    padding: 0 !important;
                    gap: 0 !important;
                }

                landing-view-component {
                    display: block;
                    width: 100%;
                    height: 100%;
                }

                /* Custom Scrollbar */
                ::-webkit-scrollbar {
                    width: 4px; 
                }
                ::-webkit-scrollbar-track {
                    background: transparent;
                }
                ::-webkit-scrollbar-thumb {
                    background: #1e293b;
                    border-radius: 99px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: #3b82f6;
                }

                /* Cinematic Hero Title */
                .hero-title {
                    font-size: 5rem;
                    line-height: 1;
                    letter-spacing: -0.05em;
                    background: linear-gradient(135deg, #fff 0%, #3b82f6 50%, #a855f7 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    filter: drop-shadow(0 0 30px rgba(59, 130, 246, 0.4));
                }

                @media (min-width: 768px) {
                    .hero-title {
                        font-size: 7rem;
                    }
                }

                /* Floating Glass Card */
                .glass-floater {
                    background: #1e293b; /* Use Prism Glass variable */
                    backdrop-filter: blur(40px);
                    -webkit-backdrop-filter: blur(40px);
                    box-shadow: 
                        0 20px 50px -10px rgba(0, 0, 0, 0.5),
                        inset 0 0 0 1px rgba(255, 255, 255, 0.05);
                    transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.4s ease;
                }
                
                .glass-floater:hover {
                    transform: translateY(-5px) scale(1.01);
                    box-shadow: 
                        0 30px 60px -10px rgba(0, 0, 0, 0.6),
                        inset 0 0 0 1px rgba(255, 255, 255, 0.1),
                        0 0 20px rgba(59, 130, 246, 0.2);
                }

                /* Ambient Background Animation */
                .ambient-orb {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(80px);
                    opacity: 0.4;
                    z-index: 0;
                    animation: float 20s infinite ease-in-out;
                }
                
                .orb-1 { width: 600px; height: 600px; background: #3b82f6; top: -20%; left: -10%; animation-delay: 0s; }
                .orb-2 { width: 500px; height: 500px; background: #a855f7; top: 20%; right: -10%; animation-delay: -5s; }
                .orb-3 { width: 300px; height: 300px; background: #14b8a6; bottom: -10%; left: 30%; animation-delay: -10s; }

                @keyframes float {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                }

                /* Entrance Stagger */
                .animate-enter { animation: fadeInUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; opacity: 0; transform: translateY(20px); }
                .delay-100 { animation-delay: 100ms; }
                .delay-200 { animation-delay: 200ms; }
                .delay-300 { animation-delay: 300ms; }
                .delay-400 { animation-delay: 400ms; }

                @keyframes fadeInUp {
                    to { opacity: 1; transform: translateY(0); }
                }
            </style>
        `;

        // 1. Resume Session Card Content
        const latestStream = history.length > 0 ? history[0] : null;

        const resumeContent =
            history.length > 0
                ? html`
                      <div 
                          class="glass-floater rounded-3xl p-6 h-full flex flex-col relative overflow-hidden group cursor-pointer"
                          @click=${() => this._resumeSession(false)}
                      >
                          <!-- Internal Glow -->
                          <div class="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 blur-[60px] rounded-full pointer-events-none group-hover:bg-blue-500/30 transition-colors duration-500"></div>
                          
                          <div class="relative z-10 pointer-events-none">
                              <div class="flex items-start justify-between mb-4">
                                  <div class="p-3 rounded-2xl bg-white/5 text-blue-400">
                                      ${icons.history}
                                  </div>
                                  <span class="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-black/20 px-2 py-1 rounded-lg">Last Active</span>
                              </div>
                              
                              <h3 class="text-2xl font-bold text-white mb-1">Resume Analysis</h3>
                              <p class="text-sm text-slate-400 mb-6">Pick up exactly where you left off.</p>
                              
                              <div class="space-y-3 pointer-events-auto">
                                  ${this._renderStreamItem(latestStream, true)}
                              </div>
                          </div>
                          
                          <div class="mt-auto pt-6 relative z-20 pointer-events-auto flex items-center gap-2">
                               <button
                                  @click=${(e) => {
                        e.stopPropagation();
                        this._resumeSession(true);
                    }}
                                  class="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-bold shadow-[0_0_20px_#3b82f6] hover:shadow-[0_0_30px_#3b82f6] hover:scale-[1.02] active:scale-[0.98] transition-all"
                                  title="Resume Latest"
                              >
                                  ${icons.play} RESUME SESSION
                              </button>
                               <button
                                  @click=${async (e) => {
                        e.stopPropagation();
                        try {
                            const clipboardText = await navigator.clipboard.readText();
                            if (
                                clipboardText &&
                                (clipboardText.startsWith('http') ||
                                    clipboardText.endsWith('.mpd') ||
                                    clipboardText.endsWith('.m3u8'))
                            ) {
                                analysisActions.addStreamInputFromPreset({ url: clipboardText });
                            }
                        } catch {
                            // Permission denied or empty
                        }
                    }}
                                  class="p-3 rounded-xl bg-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                                  title="Manual Input"
                              >
                                  ${icons.plusCircle}
                              </button>
                          </div>
                      </div>
                  `
                : html`
                      <!-- New Analysis Hero Card -->
                      <div class="glass-floater rounded-3xl p-8 h-full flex flex-col items-center justify-center text-center cursor-pointer group relative overflow-hidden" 
                           @click=${() => this._focusInput()}>
                           
                          <div class="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                          <div class="p-6 rounded-full bg-gradient-to-br from-slate-800 to-slate-800 text-blue-400 mb-6 text-5xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 shadow-[0_0_40px_#3b82f6] ring-1 ring-blue-500/30 relative z-10">
                              ${icons.plusCircle}
                          </div>
                          <h3 class="text-3xl font-bold text-white mb-2 tracking-tight relative z-10">Start New Analysis</h3>
                          <p class="text-slate-400 max-w-sm text-base leading-relaxed relative z-10">Inspect manifests, validate streams, and debug playback issues.</p>
                      </div>
                  `;

        // 2. Stats Grid
        const statsContent = html`
             <div class="grid grid-rows-2 gap-2 h-full"> 
                <div 
                    class="glass-floater rounded-3xl p-5 cursor-pointer relative overflow-hidden flex items-center justify-between group"
                    @click=${() => {
                uiActions.setStreamLibraryTab('workspaces');
                uiActions.setLibraryModalOpen(true);
            }}
                >
                    <div>
                        <div class="text-4xl font-black text-white leading-none mb-1 group-hover:scale-110 origin-left transition-transform duration-300 transform">${workspaces.length}</div>
                        <div class="text-[10px] text-teal-300 font-bold uppercase tracking-widest">Workspaces</div>
                    </div>
                    <div class="p-4 rounded-2xl bg-teal-500/10 text-teal-300 ring-1 ring-teal-500/20 shadow-[0_0_20px_rgba(20,184,166,0.2)] group-hover:bg-teal-500 group-hover:text-black transition-colors">
                        ${icons.folder}
                    </div>
                </div>

                <div 
                    class="glass-floater rounded-3xl p-5 cursor-pointer relative overflow-hidden flex items-center justify-between group"
                    @click=${() => {
                uiActions.setStreamLibraryTab('presets');
                uiActions.setLibraryModalOpen(true);
            }}
                >
                    <div>
                        <div class="text-4xl font-black text-white leading-none mb-1 group-hover:scale-110 origin-left transition-transform duration-300 transform">${presets.length}</div>
                        <div class="text-[10px] text-purple-300 font-bold uppercase tracking-widest">Presets</div>
                    </div>
                    <div class="p-4 rounded-2xl bg-purple-500/10 text-purple-300 ring-1 ring-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.2)] group-hover:bg-purple-500 group-hover:text-black transition-colors">
                        ${icons.star}
                    </div>
                </div>
             </div>
        `;

        const template = html`
            ${styles}
            
            <div class="shell-root landing-root overflow-x-hidden">

                <div class="relative z-10 flex flex-col items-center w-full h-full pt-10 px-6 lg:px-8">
                    
                    <!-- Header moved from input-view -->
                    <div class="absolute top-0 left-0 right-0 px-4 pt-2 sm:px-6 sm:pt-4 flex justify-between items-center z-50 pointer-events-none">
                        <div class="pointer-events-auto flex items-center gap-2 sm:gap-3">
                            <div class="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 drop-shadow-[0_0_15px_#3b82f6]" style="mask-image: url(/icon.svg); mask-size: contain; mask-position: center; mask-repeat: no-repeat; -webkit-mask-image: url(/icon.svg); -webkit-mask-size: contain; -webkit-mask-position: center; -webkit-mask-repeat: no-repeat;"></div>
                            <span class="font-bold text-xl sm:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-300 tracking-tight">Stream Analyzer</span>
                        </div>
                        
                        <div class="flex gap-3 pointer-events-auto">
                            <!-- About -->
                            <button 
                                @click=${(e) => {
                e.preventDefault();
                openModalWithContent({
                    title: '',
                    url: '',
                    content: { type: 'about', data: {} },
                });
            }}
                                class="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-2xl text-[10px] sm:text-xs font-bold text-white transition-all hover:scale-105 hover:shadow-[0_0_15px_#3b82f6] group"
                            >
                                <div class="text-blue-400 group-hover:text-white transition-colors">${icons.info}</div>
                                <span class="hidden sm:inline">About</span>
                            </button>

                            <!-- GitHub -->
                            <a href="https://github.com/herruzo99/stream-analyzer" 
                               target="_blank" 
                               rel="noopener noreferrer" 
                               class="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-2xl text-[10px] sm:text-xs font-bold text-white transition-all hover:scale-105 hover:shadow-[0_0_15px_#3b82f6] group">
                                <div class="text-purple-300 group-hover:text-white transition-colors">${icons.github}</div>
                                <span class="hidden sm:inline">GitHub</span>
                            </a>

                        </div>
                    </div>
                    
                    <!-- Hero Section -->
                    <div class="w-full max-w-5xl text-center mb-12 animate-enter">
                        <div class="inline-flex items-center gap-2 px-3 py-2">
                            
                        </div>
                        
                        <h1 class="hero-title font-black mb-8 tracking-tighter">
                            Stream Analyzer
                        </h1>
                        
                        <p class="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed mb-12 text-balance">
                             The advanced toolchain for OTT compliance. Inspect 
                             <strong class="text-white font-bold">MPEG-DASH</strong>, and
                             <strong class="text-white font-bold">HLS</strong> streams with surgical precision.
                        </p>
                        
                        <div class="max-w-2xl mx-auto transform hover:scale-[1.01] transition-transform duration-500 shadow-2xl rounded-full">
                            <smart-input-component variant="hero"></smart-input-component>
                        </div>
                    </div>

                    <!-- Main Dashboard Grid -->
                    <div class="w-full max-w-6xl grid grid-cols-1 md:grid-cols-12 gap-6 mb-20">
                        
                        <!-- Primary Action (Resume/New) -->
                        <div class="md:col-span-8 h-[22rem] animate-enter delay-100">
                            ${resumeContent}
                        </div>

                        <!-- Secondary Stats -->
                        <div class="md:col-span-4 h-[22rem] animate-enter delay-200">
                             ${statsContent}
                        </div>
                        
                        <!-- Quick History Rail -->
                       <div class="md:col-span-12 animate-enter delay-300">
                            <div class="flex items-center justify-between mb-4 px-2">
                                <h3 class="text-sm font-bold text-white/50 uppercase tracking-widest flex items-center gap-2">
                                    ${icons.history} Recent Activity
                                </h3>
                                <button 
                                    @click=${() => { uiActions.setStreamLibraryTab('history'); uiActions.setLibraryModalOpen(true); }}
                                    class="text-xs font-bold text-blue-400 hover:text-white transition-colors"
                                >View All</button>
                            </div>
                            
                            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                ${history.length > 0 ? history.slice(0, 4).map(h => this._renderQuickCard(h)) : html`
                                    <div class="col-span-full py-8 text-center text-white/30 italic text-sm rounded-2xl">
                                        No recent streams found.
                                    </div>
                                `}
                            </div>
                       </div>
                    </div>
                </div>
            </div>
        `;

        render(template, this);
    }

    _renderStreamItem(stream, isHero = false) {
        let urlObj;
        try {
            urlObj = new URL(stream.url);
        } catch {
            urlObj = { hostname: 'invalid-url', pathname: '' };
        }

        let badgeClass = 'text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider bg-white/5 text-white/50';
        let badgeText = 'STREAM';
        if (stream.url.includes('.m3u8')) {
            badgeClass = 'text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider bg-purple-500/10 text-purple-300';
            badgeText = 'HLS';
        } else if (stream.url.includes('.mpd')) {
            badgeClass = 'text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider bg-blue-500/10 text-blue-400';
            badgeText = 'DASH';
        }

        return html`
              <div
                  class="flex items-center gap-4 p-3 rounded-xl bg-black/20 hover:bg-white/5 transition-colors cursor-pointer group"
                  @click=${() => this._loadStream(stream)}
              >
                  <div
                      class="shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-slate-800 to-black/50 flex items-center justify-center text-white/50 group-hover:text-white transition-colors ring-1 ring-white/10"
                  >
                      ${icons.play}
                  </div>
                  <div class="grow min-w-0">
                      <div class="flex items-center gap-3">
                          <span class="text-sm font-bold text-white truncate w-full">
                              ${stream.name || urlObj.hostname}
                          </span>
                          <span class="${badgeClass}">${badgeText}</span>
                      </div>
                      <div class="text-[10px] font-mono text-white/40 truncate">
                           ${urlObj.hostname}
                      </div>
                  </div>
              </div>
          `;
    }

    _loadStream(stream) {
        analysisActions.setStreamInputs([stream]);
        const { streamInputs } = useAnalysisStore.getState();
        eventBus.dispatch(EVENTS.UI.STREAM_ANALYSIS_REQUESTED, {
            inputs: streamInputs,
        });
    }

    _resumeSession(startAnalysis = false) {
        // Load the entire history into the staging view
        const history = getLastUsedStreams() || [];
        if (history.length === 0) return;

        analysisActions.setStreamInputs(history);

        if (startAnalysis) {
            eventBus.dispatch(EVENTS.UI.STREAM_ANALYSIS_REQUESTED, {
                inputs: history,
            });
        }
        // If not starting analysis, simply populating streamInputs triggers mainRenderer
        // to switch to Staging Mode (Input View + Shell).
    }

    _focusInput() {
        const input = /** @type {HTMLElement} */ (this.querySelector('smart-input-component'));
        if (input) input.focus();
    }

    _renderQuickCard(item) {
        return html`
            <div 
                class="glass-floater p-4 rounded-xl cursor-pointer bg-white/5 hover:bg-white/10 transition-colors"
                @click=${() => this._loadStream(item)}
            >
                <div class="flex items-center justify-between mb-2">
                    <span class="text-[10px] font-mono text-white/40 truncate max-w-[100px]">${new URL(item.url || '').hostname}</span>
                    <div class="text-blue-400 scale-75">${icons.play}</div>
                </div>
                <div class="font-bold text-sm text-white truncate">${item.name}</div>
            </div>
         `;
    }
}

customElements.define('landing-view-component', LandingViewComponent);

export const landingViewTemplate = () => html`<landing-view-component></landing-view-component>`;
