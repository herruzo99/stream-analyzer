import { eventBus } from '@/application/event-bus';
import {
    getLastUsedStreams,
    getPresets,
    saveWorkspace,
} from '@/infrastructure/persistence/streamStorage';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import { EVENTS } from '@/types/events';
import * as icons from '@/ui/icons';
import { openModalWithContent } from '@/ui/services/modalService';
import { urlStateManager } from '@/application/url-state-manager';
import { showToast } from '@/ui/components/toast.js';
import { html, render } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map.js';
import { inspectorPanelTemplate } from './inspector-panel.js';
import './smart-input.js';

const badge = (text, colorClasses, icon = null) => html`
    <span
        class="text-[9px] font-black px-1.5 py-0.5 rounded-[4px] uppercase tracking-widest flex items-center gap-1 shadow-sm ${colorClasses}"
    >
        ${icon ? html`<span class="scale-75">${icon}</span>` : ''} ${text}
    </span>
`;

const streamListItem = (streamInput, isActive) => {
    const { tier0, isTier0AnalysisLoading } = streamInput;
    const hasAuth = streamInput.auth?.headers?.length > 0;
    // Port: no themes in 1.2.0; solid styling throughout.
    const isSolid = true;

    const handleDelete = (e) => {
        e.stopPropagation();
        analysisActions.removeStreamInput(streamInput.id);
    };

    // --- Tier 0 Badge Logic ---
    let statusBadge = null;
    let protocolBadge = null;
    let typeBadge = null;
    let drmBadge = null;
    let llBadge = null;

    if (isTier0AnalysisLoading) {
        statusBadge = badge(
            'SCANNING',
            'text-blue-400 bg-blue-500/10 border border-blue-500/20',
            html`<span class="animate-spin">${icons.spinner}</span>`
        );
    } else if (tier0) {
        // Status
        if (tier0.status >= 400 || tier0.status === 0) {
            statusBadge = badge(
                tier0.status === 0 ? 'ERR' : `${tier0.status}`,
                'text-red-400 bg-red-500/10',
                icons.alertTriangle
            );
        } else {
            statusBadge = badge(
                'OK',
                'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
            );
        }

        // Protocol
        if (tier0.protocol !== 'Unknown') {
            protocolBadge = badge(
                tier0.protocol,
                tier0.protocol === 'HLS'
                    ? 'text-purple-300 bg-purple-500/10'
                    : 'text-blue-400 bg-blue-500/10'
            );
        }

        // Type
        if (tier0.type !== 'Unknown') {
            typeBadge = badge(
                tier0.type,
                tier0.type === 'LIVE'
                    ? 'text-red-400 bg-red-500/10'
                    : 'text-slate-400 bg-white/5',
                tier0.type === 'LIVE' ? icons.broadcast : null
            );
        }

        // DRM
        if (tier0.isEncrypted) {
            drmBadge = badge(
                'DRM',
                'text-amber-400 bg-amber-500/10 border border-amber-500/20',
                icons.lockClosed
            );
        }

        // LL
        if (tier0.isLowLatency) {
            llBadge = badge(
                'LL',
                'text-[#f43f5e] bg-rose-500/10 border border-rose-500/20',
                icons.zap
            );
        }
    } else {
        // Fallback Logic (Smart Badges from URL)
        const urlLower = (streamInput.url || '').toLowerCase();
        if (urlLower.includes('.m3u8')) {
            protocolBadge = badge(
                'HLS',
                'text-purple-300 bg-purple-500/10'
            );
        } else if (urlLower.includes('.mpd')) {
            protocolBadge = badge(
                'DASH',
                'text-blue-400 bg-blue-500/10'
            );
        } else if (urlLower.includes('.ism')) {
            protocolBadge = badge(
                'MSS',
                'text-teal-300 bg-teal-500/10'
            );
        }

        statusBadge = badge(
            'PENDING',
            'text-slate-400 bg-slate-800'
        );
    }

    // CAPSULE DESIGN
    return html`
        <div
            @click=${() =>
            analysisActions.setActiveStreamInputId(streamInput.id)}
            class="group relative flex flex-col gap-2 p-3 rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden ${isActive
            ? 'bg-blue-500/10 shadow-[0_0_30px_rgba(59, 130, 246,0.2)]'
            : 'bg-slate-800 hover:bg-slate-800 hover:shadow-[0_0_20px_rgba(59, 130, 246,0.1)]'} ${isSolid ? 'border border-slate-800' : 'border border-transparent'}"
        >
            <!-- Active Indicator Bar -->
            ${isActive ? html`<div class="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_10px_#3b82f6]"></div>` : ''}

            <div class="flex items-center gap-3 relative z-10 pl-2">
                 <div
                    class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-colors ${isActive
            ? 'bg-blue-500 text-white shadow-[0_0_15px_#3b82f6]'
            : 'bg-slate-900/20 text-slate-400 group-hover:text-slate-100'}"
                >
                    ${streamInput.id + 1}
                </div>

                <div class="grow min-w-0">
                    <div class="flex items-center justify-between">
                        <span
                            class="font-bold text-sm truncate transition-colors ${isActive
            ? 'text-white'
            : 'text-slate-100 group-hover:text-[#60a5fa]'}"
                        >
                            ${streamInput.name || 'Untitled Stream'}
                        </span>
                        ${hasAuth
            ? html`<span
                                  class="text-purple-300 scale-75"
                                  title="Auth Headers"
                                  >${icons.key}</span
                              >`
            : ''}
                    </div>
                    <div
                        class="text-[10px] font-mono text-slate-400 truncate opacity-60 group-hover:opacity-100 transition-opacity"
                    >
                        ${streamInput.url ? (() => { try { return new URL(streamInput.url).hostname; } catch { return 'Invalid URL'; } })() : 'No URL Set'}
                    </div>
                </div>

                <button
                    @click=${handleDelete}
                    class="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-900/20 rounded-full transition-all"
                    title="Remove"
                >
                    ${icons.xCircle}
                </button>
            </div>

            <!-- Tier 0 Badges Row -->
            <div class="flex flex-wrap gap-2 pl-12 relative z-10 mt-1">
                ${statusBadge} ${protocolBadge} ${typeBadge} ${drmBadge}
                ${llBadge}
            </div>
        </div>
    `;
};

const quickAddStreamRow = () => {
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            const input = e.target;
            const text = input.value.trim();
            if (!text) return;

            // Basic batch parsing for space/comma/newline separated URLs
            const urls = text
                .split(/[\s,]+/)
                .filter((u) => u.match(/^https?:\/\//));

            if (urls.length > 0) {
                urls.forEach((url) =>
                    analysisActions.addStreamInputFromPreset({ url })
                );
                input.value = '';
            }
        }
    };

    const openLibrary = () => {
        uiActions.setStreamLibraryTab('history');
        uiActions.setLibraryModalOpen(true);
    };

    return html`
        <div
            class="group relative flex items-center gap-3 p-3 rounded-2xl bg-slate-800 transition-all duration-300"
        >
            <div
                class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 group-hover:text-blue-400 transition-colors bg-slate-900/20"
            >
                ${icons.plusCircle}
            </div>
            <div class="grow min-w-0">
                <input
                    type="text"
                    placeholder="Quick add URL..."
                    class="w-full bg-transparent border-none p-0 text-xs text-slate-100 placeholder-slate-400 focus:ring-0 focus:outline-none font-mono"
                    @keydown=${handleKeyDown}
                />
            </div>
            <button
                @click=${openLibrary}
                class="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                title="Open Library"
            >
                ${icons.library}
            </button>
        </div>
    `;
};

const sessionControlDeck = (loadedWorkspaceName, streamInputs) => {
    const hasItems = streamInputs.length > 0;

    const handleSave = () => {
        if (loadedWorkspaceName) {
            saveWorkspace({ name: loadedWorkspaceName, inputs: streamInputs });
        } else {
            const name = prompt(
                'Save Workspace As:',
                `Session ${new Date().toLocaleDateString()}`
            );
            if (name) {
                saveWorkspace({ name, inputs: streamInputs });
                uiActions.setLoadedWorkspaceName(name);
            }
        }
    };

    const handleLoad = () => {
        uiActions.setStreamLibraryTab('workspaces');
        uiActions.setLibraryModalOpen(true);
    };

    const handleClose = () => {
        if (confirm('Close workspace? Unsaved changes will be lost.')) {
            uiActions.setLoadedWorkspaceName(null);
            analysisActions.clearAllStreamInputs();
        }
    };

    const handleShare = async () => {
        const url = urlStateManager.getShareableUrl();
        try {
            await navigator.clipboard.writeText(url);
            showToast({
                message: 'Shareable link copied to clipboard!',
                type: 'pass',
            });
        } catch (err) {
            console.error('Failed to copy:', err);
            showToast({ message: 'Failed to copy link', type: 'fail' });
        }
    };

    if (loadedWorkspaceName) {
        return html`
            <div class="px-3 pb-3 shrink-0">
                <div
                    class="rounded-2xl p-4 bg-blue-500/10 relative overflow-hidden shadow-lg shadow-blue-500/5 group"
                >
                    <div class="relative z-10 flex flex-col gap-3">
                        <div class="flex justify-between items-start">
                            <div class="flex flex-col min-w-0">
                                <span
                                    class="text-[9px] font-black uppercase tracking-widest text-blue-400 mb-1"
                                    >Active Workspace</span
                                >
                                <div
                                    class="flex items-center gap-2 text-white font-bold text-sm truncate"
                                >
                                    ${icons.folder}
                                    <span
                                        class="truncate"
                                        title="${loadedWorkspaceName}"
                                        >${loadedWorkspaceName}</span
                                    >
                                </div>
                            </div>
                            <button
                                @click=${handleShare}
                                class="p-1.5 text-blue-400 hover:text-white hover:bg-blue-500 rounded-lg transition-all"
                                title="Share State"
                            >
                                ${icons.share}
                            </button>
                        </div>
                        <div class="flex gap-2">
                            <button
                                @click=${handleSave}
                                class="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-blue-500 hover:bg-[#60a5fa] text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                ${icons.save} UPDATE
                            </button>
                            <button
                                @click=${handleClose}
                                class="shrink-0 p-2 bg-white/5 hover:bg-white/10 text-white/50 hover:text-red-400 rounded-xl transition-colors"
                            >
                                ${icons.power}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    return html`
        <div class="p-3 shrink-0">
            <div
                class="p-4 bg-white/5 rounded-2xl flex flex-col gap-3"
            >
                <div
                    class="flex items-center gap-2 text-slate-400 select-none"
                >
                    <div class="text-blue-400">${icons.layout}</div>
                    <span class="text-xs font-bold uppercase tracking-wider">Draft Session</span>
                </div>
                <div class="flex gap-2">
                    <button
                        @click=${handleLoad}
                        class="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-bold rounded-lg transition-all"
                    >
                        Load
                    </button>
                    <button
                        @click=${handleSave}
                        ?disabled=${!hasItems}
                        class="flex-1 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-white text-xs font-bold rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    `;
};

const quickLibraryCard = (item, type) => {
    const isPreset = type === 'preset';
    const icon = isPreset ? icons.star : icons.history;

    return html`
        <button
            @click=${() => analysisActions.addStreamInputFromPreset(item)}
            class="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group text-left w-full"
        >
            <div
                class="shrink-0 w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center text-white/50 group-hover:text-white"
            >
                ${icon}
            </div>
            <div class="grow min-w-0">
                <div
                    class="text-xs font-bold text-white/80 group-hover:text-white truncate"
                >
                    ${item.name}
                </div>
                <div
                    class="text-[10px] font-mono text-white/40 truncate"
                >
                    ${new URL(item.url).hostname}
                </div>
            </div>
            <div
                class="text-white/20 group-hover:text-blue-400"
            >
                ${icons.plusCircle}
            </div>
        </button>
    `;
};

const addStreamDashboard = () => {
    const history = getLastUsedStreams().slice(0, 3);
    const presets = getPresets().slice(0, 3);
    const openLibrary = () => {
        uiActions.setStreamLibraryTab('history');
        uiActions.setLibraryModalOpen(true);
    };

    // Digital Horizon Background
    const horizonStyle = html`
        <style>
            .digital-horizon {
                background: 
                    linear-gradient(to bottom, transparent 50%, rgba(59, 130, 246, 0.03) 100%),
                    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px),
                    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px);
                background-size: 100% 100%, 40px 40px, 40px 40px;
                perspective: 1000px;
                transform-style: preserve-3d;
                animation: panGrid 60s linear infinite;
            }
            @keyframes panGrid {
                from { background-position: 0 0, 0 0, 0 0; }
                to { background-position: 0 0, 0 1000px, 0 1000px; }
            }
        </style>
    `;

    return html`
        ${horizonStyle}
        <div
            class="h-full flex flex-col items-center justify-center relative p-8 overflow-y-auto custom-scrollbar digital-horizon"
        >
            <div
                class="max-w-2xl w-full flex flex-col items-center relative z-10"
            >
                <div class="w-full mb-16">
                    <div class="text-center mb-10">
                        <div
                            class="inline-flex p-5 bg-gradient-to-br from-slate-700 to-transparent text-blue-400 rounded-3xl mb-6 shadow-[0_0_40px_rgba(59, 130, 246,0.2)] animate-bounce"
                        >
                            <span class="scale-150 drop-shadow-[0_0_15px_#3b82f6]">${icons.plusCircle}</span>
                        </div>
                        <h2
                            class="text-5xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 drop-shadow-sm tracking-tighter"
                        >
                            Add Source
                        </h2>
                        <p class="text-slate-400 text-base font-medium tracking-wide max-w-md mx-auto">
                            Ingest manifest URLs or media files for deep inspection.
                        </p>
                    </div>
                    
                    <div class="transform hover:scale-[1.02] transition-transform duration-500 rounded-full shadow-2xl">
                        <smart-input-component
                            mode="add"
                            variant="hero"
                        ></smart-input-component>
                    </div>
                </div>

                <div
                    class="w-full pt-8 animate-fadeIn"
                    style="animation-delay: 100ms;"
                >
                    <div class="flex justify-between items-center mb-6 px-1">
                        <h3
                            class="text-xs font-black text-white/30 uppercase tracking-widest"
                        >
                            Quick Import
                        </h3>
                        <button
                            @click=${openLibrary}
                            class="text-xs font-bold text-blue-400 hover:text-white flex items-center gap-2 transition-colors"
                        >
                            ${icons.library} FULL LIBRARY
                        </button>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${history.length > 0
            ? history.map((h) => quickLibraryCard(h, 'history'))
            : html`<div class="col-span-2 text-center text-white/20 italic text-xs py-4">No recent history.</div>`}
                        ${presets.length > 0
            ? presets.map((p) => quickLibraryCard(p, 'preset'))
            : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
};

// --- Web Component Definition ---

class StagingViewComponent extends HTMLElement {
    constructor() {
        super();
        this.unsubs = [];
    }

    connectedCallback() {
        this._render();

        // Subscribe to stores
        this.unsubs.push(useAnalysisStore.subscribe(() => this._render()));
        this.unsubs.push(useUiStore.subscribe(() => this._render()));
    }

    disconnectedCallback() {
        this.unsubs.forEach((unsub) => unsub());
        this.unsubs = [];
    }

    _render() {
        const { streamInputs, activeStreamInputId } = useAnalysisStore.getState();
        const { loadedWorkspaceName } = useUiStore.getState();

        const handleAnalyze = () => {
            eventBus.dispatch(EVENTS.UI.STREAM_ANALYSIS_REQUESTED, {
                inputs: streamInputs,
            });
        };

        const handleAddStream = () => {
            const isMobile = window.innerWidth < 768;
            if (isMobile) {
                openModalWithContent({
                    title: 'Add Stream',
                    url: '',
                    content: { type: 'addStream', data: {} },
                    isFullWidth: true,
                });
            } else {
                analysisActions.setActiveStreamInputId(null);
            }
        };

        const handleClearAll = () => {
            if (confirm('Are you sure you want to remove all streams from the staging queue?')) {
                analysisActions.clearAllStreamInputs();
            }
        };

        const handleBackToList = () => {
            analysisActions.setActiveStreamInputId(null);
        };

        const isStreamSelected =
            activeStreamInputId !== null &&
            streamInputs.some((s) => s.id === activeStreamInputId);
        const showInspector = isStreamSelected;

        const sidebarClasses = classMap({
            'staging-sidebar': true,
            'w-full md:w-80 lg:w-[420px]': true, // Significantly wider for comfort
            flex: true,
            'flex-col': true,
            'shrink-0': true,
            'z-30': true,
            'shadow-2xl': true,
            'hidden': isStreamSelected,
            'md:flex': true,
        });

        const mainClasses = classMap({
            grow: true,
            'min-w-0': true,
            relative: true,
            'z-0': true,
            flex: true,
            'flex-col': true,
            'h-full': true,
            'min-h-0': true,
            'overflow-hidden': true,
            hidden: !isStreamSelected,
            'md:flex': true,
        });

        const template = html`
            <style>
                
                :host {
                    display: block;
                    width: 100%;
                    height: 100%;
                }

                /* Sidebar Layout */
                .staging-sidebar {
                    background: #1e293b;
                    backdrop-filter: blur(20px);
                    
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    min-height: 0;
                    width: 100%;
                    transition: all 0.3s ease;
                }

                /* Mobile-specific adjustments are handled via media queries or tailwind classes */
            </style>
            
            <div
                class="h-full flex flex-col md:flex-row overflow-hidden relative"
            >
                <!-- LEFT SIDEBAR (Queue) -->
                <div class="${sidebarClasses} staging-sidebar" style="">
                    <div
                        class="layout-header p-5 flex justify-between items-center gap-4 shrink-0"
                    >
                        <h2
                            class="text-xs font-black text-slate-100 uppercase tracking-widest flex items-center gap-3"
                        >
                            ${icons.list} Stream Queue
                            <span
                                class="bg-blue-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-[0_0_10px_#3b82f6]"
                                >${streamInputs.length}</span
                            >
                        </h2>
                        <button
                            @click=${handleAddStream}
                            class="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-[10px] font-bold uppercase tracking-wide rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                            title="Add New Stream"
                        >
                            ${icons.plusCircle} Add
                        </button>
                    </div>
                    
                    ${sessionControlDeck(loadedWorkspaceName, streamInputs)}
                    
                    <div
                        class="layout-body grow overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar min-h-0"
                    >
                        ${streamInputs.map((input) =>
            streamListItem(input, input.id === activeStreamInputId)
        )}
                        ${streamInputs.length === 0
                ? html`
                                  <div
                                      class="h-40 flex flex-col items-center justify-center text-center rounded-3xl m-2 bg-slate-800"
                                  >
                                      <div
                                          class="text-slate-400 mb-3 scale-125 opacity-50"
                                      >
                                          ${icons.layers}
                                      </div>
                                      <p
                                          class="text-[10px] text-slate-400 font-bold uppercase tracking-widest"
                                      >
                                          Queue Empty
                                      </p>
                                  </div>
                              `
                : ''}
                        ${quickAddStreamRow()}
                    </div>
                    
                    <div
                        class="p-5 bg-slate-800 space-y-3 backdrop-blur-xl z-10 shrink-0"
                    >
                        <button
                            @click=${handleAnalyze}
                            class="w-full py-3.5 bg-gradient-to-r from-teal-500 to-blue-500 text-black font-black uppercase tracking-widest rounded-xl shadow-lg hover:shadow-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                            ?disabled=${streamInputs.length === 0}
                        >
                            ${icons.play}
                            <span>Start Analysis</span>
                        </button>

                        <button
                            @click=${handleClearAll}
                            class="w-full flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:text-white hover:bg-red-500 px-3 py-3 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            ?disabled=${streamInputs.length === 0}
                        >
                            ${icons.trash} Clear Queue
                        </button>
                    </div>
                </div>

                <!-- RIGHT MAIN AREA -->
                <div class="${mainClasses}">
                    <!-- Mobile-Only Navigation Header -->
                    ${isStreamSelected
                ? html`
                              <div
                                  class="md:hidden shrink-0 p-3 bg-slate-800/90 backdrop-blur-md flex items-center gap-3 shadow-sm z-20 relative"
                              >
                                  <button
                                      @click=${handleBackToList}
                                      class="p-2 -ml-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1"
                                  >
                                      ${icons.arrowLeft}
                                      <span class="text-xs font-bold">Back</span>
                                  </button>
                                  <div
                                      class="h-4 w-px bg-white/10"
                                  ></div>
                                  <span
                                      class="text-sm font-bold text-slate-100 truncate"
                                      >Stream Settings</span
                                  >
                              </div>
                          `
                : ''}

                    <div
                        class="grow min-h-0 flex flex-col overflow-hidden relative z-10"
                    >
                        ${showInspector
                ? html`<div
                                  class="h-full flex flex-col min-h-0 overflow-hidden"
                              >
                                  ${inspectorPanelTemplate()}
                              </div>`
                : html`<div
                                  class="h-full hidden md:flex flex-col min-h-0 overflow-hidden"
                              >
                                  ${addStreamDashboard()}
                              </div>`}
                    </div>
                </div>
            </div>
        `;
        render(template, this);
    }
}

if (!customElements.get('staging-view-component')) {
    customElements.define('staging-view-component', StagingViewComponent);
}

// Export for compatibility if needed, though mostly usage will be via tag
export const stagingViewTemplate = () => html`<staging-view-component></staging-view-component>`;
