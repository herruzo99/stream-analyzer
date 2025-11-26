import { html } from 'lit-html';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import {
    saveWorkspace,
    getLastUsedStreams,
    getPresets
} from '@/infrastructure/persistence/streamStorage';
import { inspectorPanelTemplate } from './inspector-panel.js';
import { eventBus } from '@/application/event-bus';
import { openModalWithContent } from '@/ui/services/modalService';
import * as icons from '@/ui/icons';
import './smart-input.js';
import { classMap } from 'lit-html/directives/class-map.js';

const streamListItem = (streamInput, isActive) => {
    const isDrm = streamInput.detectedDrm && streamInput.detectedDrm.length > 0;
    const hasAuth = streamInput.auth?.headers?.length > 0;

    const handleDelete = (e) => {
        e.stopPropagation();
        analysisActions.removeStreamInput(streamInput.id);
    };

    return html`
        <div
            @click=${() => analysisActions.setActiveStreamInputId(streamInput.id)}
            class="group relative flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${isActive
                ? 'bg-slate-800 border-blue-600 shadow-md'
                : 'bg-slate-900 border-transparent hover:bg-slate-800 hover:border-slate-700'}"
        >
            <div
                class="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-500 border border-slate-700'}"
            >
                ${streamInput.id + 1}
            </div>

            <div class="grow min-w-0">
                <div class="flex items-center justify-between">
                    <span
                        class="font-bold text-sm truncate ${isActive
                            ? 'text-white'
                            : 'text-slate-300'}"
                    >
                        ${streamInput.name || 'Untitled Stream'}
                    </span>
                    <div class="flex gap-1">
                         ${isDrm
                             ? html`<span class="text-amber-400 scale-75" title="DRM Detected">${icons.lockClosed}</span>`
                             : ''}
                         ${hasAuth
                             ? html`<span class="text-purple-400 scale-75" title="Auth Headers">${icons.key}</span>`
                             : ''}
                    </div>
                </div>
                <div
                    class="text-[10px] font-mono text-slate-500 truncate opacity-70"
                >
                    ${new URL(streamInput.url).hostname}
                </div>
            </div>

            <button
                @click=${handleDelete}
                class="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 transition-opacity"
                title="Remove"
            >
                ${icons.xCircle}
            </button>

            ${isActive
                ? html`<div
                      class="absolute -right-[2px] top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-l-full"
                  ></div>`
                : ''}
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
            const urls = text.split(/[\s,]+/).filter(u => u.match(/^https?:\/\//));
            
            if (urls.length > 0) {
                urls.forEach(url => analysisActions.addStreamInputFromPreset({ url }));
                input.value = '';
            }
        }
    };

    const openLibrary = () => {
        uiActions.setStreamLibraryTab('history');
        uiActions.setLibraryModalOpen(true);
    };

    return html`
        <div class="group relative flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-900/30 transition-all duration-200">
            <div class="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 group-hover:text-slate-500 transition-colors bg-slate-800/50">
                ${icons.plusCircle}
            </div>
            <div class="grow min-w-0">
                <input
                    type="text"
                    placeholder="Paste URL (Enter to add)..."
                    class="w-full bg-transparent border-none p-0 text-sm text-slate-300 placeholder-slate-600 focus:ring-0 focus:outline-none font-mono"
                    @keydown=${handleKeyDown}
                />
            </div>
            <button
                @click=${openLibrary}
                class="p-1.5 text-slate-600 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
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
            const name = prompt('Save Workspace As:', `Session ${new Date().toLocaleDateString()}`);
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
        if(confirm('Close workspace? Unsaved changes will be lost.')) {
            uiActions.setLoadedWorkspaceName(null);
            analysisActions.clearAllStreamInputs();
        }
    };

    if (loadedWorkspaceName) {
        return html`
            <div class="px-3 pb-3 shrink-0">
                <div class="rounded-xl bg-slate-900 border border-teal-900/50 relative overflow-hidden shadow-sm group">
                    <div class="absolute inset-0 bg-gradient-to-br from-teal-900/10 to-transparent pointer-events-none"></div>
                    <div class="absolute left-0 top-0 bottom-0 w-1 bg-teal-600"></div>
                    <div class="relative p-3">
                        <div class="flex justify-between items-start mb-3">
                            <div class="flex flex-col min-w-0">
                                <span class="text-[9px] font-bold uppercase tracking-widest text-teal-500 mb-0.5">Active Workspace</span>
                                <div class="flex items-center gap-2 text-teal-100 font-bold text-sm truncate">
                                    ${icons.folder}
                                    <span class="truncate" title="${loadedWorkspaceName}">${loadedWorkspaceName}</span>
                                </div>
                            </div>
                        </div>
                        <div class="flex gap-2">
                            <button @click=${handleSave} class="flex-1 flex items-center justify-center gap-2 py-1.5 px-3 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-teal-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                                ${icons.save} Update
                            </button>
                            <button @click=${handleClose} class="shrink-0 p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-red-300 rounded-lg transition-colors">
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
            <div class="p-3 bg-slate-800/30 border border-slate-700/50 rounded-xl flex items-center justify-between gap-3">
                <div class="flex items-center gap-2 text-slate-500 select-none">
                    <div class="p-1.5 bg-slate-800 rounded-lg border border-slate-700 shadow-sm">${icons.layout}</div>
                    <span class="text-xs font-medium">Draft Session</span>
                </div>
                <div class="flex gap-2">
                    <button @click=${handleLoad} class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-lg transition-all shadow-sm">Load</button>
                    <button @click=${handleSave} ?disabled=${!hasItems} class="px-3 py-1.5 bg-slate-800 hover:bg-blue-600 border border-slate-700 hover:border-blue-500 text-slate-300 hover:text-white text-xs font-bold rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-800 disabled:hover:border-slate-700">Save</button>
                </div>
            </div>
        </div>
    `;
};

const quickLibraryCard = (item, type) => {
    const isPreset = type === 'preset';
    const icon = isPreset ? icons.star : icons.history;
    const color = isPreset ? 'text-yellow-400' : 'text-blue-400';

    return html`
        <button 
            @click=${() => analysisActions.addStreamInputFromPreset(item)}
            class="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 transition-all group text-left w-full"
        >
            <div class="shrink-0 p-2 rounded-lg bg-slate-900 border border-slate-800 ${color}">
                ${icon}
            </div>
            <div class="grow min-w-0">
                <div class="text-xs font-bold text-slate-300 group-hover:text-white truncate">${item.name}</div>
                <div class="text-[10px] font-mono text-slate-500 truncate opacity-60">${new URL(item.url).hostname}</div>
            </div>
            <div class="text-slate-600 group-hover:text-slate-400">${icons.plusCircle}</div>
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

    return html`
        <div class="h-full flex flex-col items-center justify-center bg-slate-950 relative p-8 overflow-y-auto custom-scrollbar">
            <div class="absolute inset-0 bg-[url('/assets/grid.svg')] opacity-[0.02] pointer-events-none"></div>
            <div class="max-w-2xl w-full flex flex-col items-center relative z-10">
                <div class="w-full mb-12">
                    <div class="text-center mb-6">
                        <div class="inline-flex p-3 bg-blue-600/10 text-blue-500 rounded-2xl mb-3 shadow-inner border border-blue-500/20">${icons.plusCircle}</div>
                        <h2 class="text-2xl font-bold text-white mb-2">Add Stream Source</h2>
                        <p class="text-slate-400 text-sm">Paste URL, drop file, or select from library.</p>
                    </div>
                    <div class="animate-scaleIn">
                        <smart-input-component mode="add" variant="hero"></smart-input-component>
                    </div>
                </div>
                <div class="w-full border-t border-slate-800/50 pt-8 animate-fadeIn" style="animation-delay: 100ms;">
                    <div class="flex justify-between items-center mb-4 px-1">
                        <h3 class="text-xs font-bold text-slate-500 uppercase tracking-widest">Quick Import</h3>
                        <button @click=${openLibrary} class="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                            ${icons.library} Open Full Library
                        </button>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        ${history.length > 0 ? history.map(h => quickLibraryCard(h, 'history')) : html`<div class="col-span-2 text-center text-slate-600 text-xs italic py-4">No recent history.</div>`}
                        ${presets.length > 0 ? presets.map(p => quickLibraryCard(p, 'preset')) : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
};

export const stagingViewTemplate = () => {
    const { streamInputs, activeStreamInputId } = useAnalysisStore.getState();
    const { loadedWorkspaceName } = useUiStore.getState();

    const handleAnalyze = () => {
        eventBus.dispatch('ui:stream-analysis-requested', {
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
        if(confirm('Are you sure you want to remove all streams from the staging queue?')) {
            analysisActions.clearAllStreamInputs();
        }
    };

    const handleBackToList = () => {
        analysisActions.setActiveStreamInputId(null);
    };

    const isStreamSelected = activeStreamInputId !== null && streamInputs.some(s => s.id === activeStreamInputId);
    const showInspector = isStreamSelected;

    const sidebarClasses = classMap({
        'w-full md:w-80 lg:w-140': true,
        'flex': true,
        'flex-col': true,
        'border-r': true,
        'border-slate-800': true,
        'bg-slate-950/50': true,
        'shrink-0': true,
        'z-30': true,
        'shadow-2xl': true,
        'h-full': true, 
        'min-h-0': true, 
        'hidden': isStreamSelected, 
        'md:flex': true,
    });

    const mainClasses = classMap({
        'grow': true,
        'min-w-0': true,
        'bg-slate-950': true,
        'relative': true,
        'z-0': true,
        'flex': true,
        'flex-col': true,
        'h-full': true,
        'min-h-0': true,
        'overflow-hidden': true,
        'hidden': !isStreamSelected,
        'md:flex': true,
    });

    return html`
        <div class="h-full flex flex-col md:flex-row bg-slate-950 overflow-hidden">
            
            <!-- LEFT SIDEBAR (Queue) -->
            <div class="${sidebarClasses}">
                <div class="p-4 flex justify-between items-center gap-4 bg-slate-900/90 backdrop-blur border-b border-slate-800 shrink-0">
                    <h2 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        ${icons.list} Queue
                        <span class="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full text-[10px] border border-slate-700 font-mono">${streamInputs.length}</span>
                    </h2>
                    <button
                        @click=${handleAddStream}
                        class="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase tracking-wide rounded-lg transition-all shadow-lg shadow-blue-900/20 hover:scale-105 active:scale-95"
                        title="Add New Stream"
                    >
                        ${icons.plusCircle} Add
                    </button>
                </div>
                ${sessionControlDeck(loadedWorkspaceName, streamInputs)}
                <div class="grow overflow-y-auto px-2 py-2 space-y-2 custom-scrollbar bg-slate-950/30 border-t border-slate-800/50 min-h-0">
                    ${streamInputs.map((input) =>
                        streamListItem(input, input.id === activeStreamInputId)
                    )}
                    ${streamInputs.length === 0 ? html`
                        <div class="h-32 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-800/50 rounded-xl m-2 bg-slate-900/20 opacity-60">
                            <div class="text-slate-500 mb-2 scale-110">${icons.layers}</div>
                            <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Queue Empty</p>
                        </div>
                    ` : ''}
                    
                    ${quickAddStreamRow()}
                </div>
                <div class="p-4 border-t border-slate-800 bg-slate-900/95 space-y-3 backdrop-blur z-10 shrink-0">
                    <button
                        @click=${handleAnalyze}
                        class="w-full py-3.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none group"
                        ?disabled=${streamInputs.length === 0}
                    >
                        ${icons.play} 
                        <span class="text-sm">Start Analysis</span>
                        <span class="opacity-0 group-hover:opacity-100 transition-opacity -ml-1 group-hover:translate-x-1 transform duration-200">→</span>
                    </button>

                    <button
                        @click=${handleClearAll}
                        class="w-full flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:text-red-200 bg-red-900/5 hover:bg-red-900/20 border border-red-900/10 hover:border-red-900/30 px-3 py-2 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        ?disabled=${streamInputs.length === 0}
                    >
                        ${icons.trash} Clear Queue
                    </button>
                </div>
            </div>

            <!-- RIGHT MAIN AREA -->
            <div class="${mainClasses}">
                <!-- Mobile-Only Navigation Header -->
                ${isStreamSelected ? html`
                    <div class="md:hidden shrink-0 p-3 border-b border-slate-800 bg-slate-900 flex items-center gap-3 shadow-sm z-20 relative">
                        <button @click=${handleBackToList} class="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1">
                            ${icons.arrowLeft} <span class="text-xs font-bold">Back</span>
                        </button>
                        <div class="h-4 w-px bg-slate-800"></div>
                        <span class="text-sm font-bold text-slate-200 truncate">Stream Settings</span>
                    </div>
                ` : ''}
                
                <div class="grow min-h-0 flex flex-col overflow-hidden">
                    ${showInspector
                        ? html`<div class="h-full flex flex-col min-h-0 overflow-hidden">${inspectorPanelTemplate()}</div>`
                        : html`<div class="h-full hidden md:flex flex-col min-h-0 overflow-hidden">${addStreamDashboard()}</div>`
                    }
                </div>
            </div>
        </div>
    `;
};