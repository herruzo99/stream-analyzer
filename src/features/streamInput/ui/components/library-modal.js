import { html, render } from 'lit-html';
import { uiActions, useUiStore } from '@/state/uiStore';
import { analysisActions } from '@/state/analysisStore';
import {
    exportWorkspace,
    importWorkspace,
} from '@/infrastructure/persistence/streamStorage';
import { exampleStreams } from '@/data/example-streams';
import * as icons from '@/ui/icons';

// ... [Helper functions getBadge, streamCard, workspaceCard remain unchanged from previous correct iteration] ...
const getBadge = (text, colorClasses) => html`
    <span class="text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${colorClasses}">
        ${text}
    </span>
`;

const streamCard = (stream, context, onDelete) => {
    const isDash = stream.protocol === 'dash';
    const protocolColor = isDash
        ? 'text-blue-400 bg-blue-400/10 border-blue-400/20'
        : 'text-purple-400 bg-purple-400/10 border-purple-400/20';
    
    const isLive = stream.type === 'live' || (stream.manifest && stream.manifest.type === 'dynamic');

    const handleLoad = () => {
        analysisActions.addStreamInputFromPreset(stream);
    };

    return html`
        <div 
            @click=${handleLoad}
            class="group relative bg-slate-800/30 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-xl p-4 cursor-pointer transition-all duration-200 flex flex-col justify-between hover:shadow-lg hover:-translate-y-0.5 h-full"
        >
            <div>
                <div class="flex justify-between items-start mb-3">
                    <div class="flex gap-2">
                        ${getBadge(stream.protocol || 'UNK', protocolColor)}
                        ${isLive 
                            ? html`<span class="text-[9px] font-bold text-red-400 bg-red-900/20 px-1.5 py-0.5 rounded border border-red-900/30 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>LIVE</span>` 
                            : html`<span class="text-[9px] font-bold text-slate-500 bg-slate-700/30 px-1.5 py-0.5 rounded border border-slate-700/50">VOD</span>`
                        }
                    </div>
                    ${context !== 'examples' ? html`
                        <button 
                            @click=${(e) => { e.stopPropagation(); onDelete(); }}
                            class="opacity-0 group-hover:opacity-100 p-1.5 -mr-2 -mt-2 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all"
                            title="Remove"
                        >
                            ${icons.xCircle}
                        </button>
                    ` : ''}
                </div>

                <h4 class="font-bold text-slate-200 text-sm mb-1 line-clamp-2 group-hover:text-white transition-colors">
                    ${stream.name}
                </h4>
                
                <div class="bg-black/20 rounded border border-white/5 p-1.5 mb-3 group-hover:border-white/10 transition-colors">
                    <p class="text-[10px] font-mono text-slate-500 truncate select-all" title="${stream.url}">
                        ${stream.url}
                    </p>
                </div>
            </div>

            <div class="pt-3 border-t border-white/5 flex justify-between items-center mt-auto">
                <div class="flex gap-2">
                    ${stream.auth?.headers?.length > 0 
                        ? html`<span class="text-xs text-slate-500" title="Has Auth Headers">${icons.key}</span>` 
                        : ''}
                    ${stream.drmAuth?.licenseServerUrl 
                        ? html`<span class="text-xs text-slate-500" title="DRM Configured">${icons.lockClosed}</span>` 
                        : ''}
                </div>
                <span class="text-[10px] font-bold text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    Add ${icons.plusCircle}
                </span>
            </div>
        </div>
    `;
};

const workspaceCard = (workspace, onDelete) => {
    const count = workspace.inputs.length;

    const handleLoad = () => {
        if (confirm(`Load workspace "${workspace.name}"? This will replace current streams.`)) {
            analysisActions.setStreamInputs(workspace.inputs);
            uiActions.setLoadedWorkspaceName(workspace.name);
            uiActions.setLibraryModalOpen(false);
        }
    };

    return html`
        <div 
            @click=${handleLoad}
            class="group relative bg-teal-900/10 hover:bg-teal-900/20 border border-teal-500/20 hover:border-teal-500/40 rounded-xl p-5 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-teal-900/10 h-full flex flex-col"
        >
            <div class="flex justify-between items-start mb-4">
                <div class="p-2.5 bg-teal-500/10 text-teal-400 rounded-lg border border-teal-500/20 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                    ${icons.folder}
                </div>
                <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        @click=${(e) => { e.stopPropagation(); exportWorkspace(workspace.name); }}
                        class="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        title="Export JSON"
                    >
                        ${icons.share}
                    </button>
                    <button 
                        @click=${(e) => { e.stopPropagation(); onDelete(); }}
                        class="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete"
                    >
                        ${icons.xCircle}
                    </button>
                </div>
            </div>

            <h4 class="font-bold text-slate-200 text-base mb-1 group-hover:text-teal-300 transition-colors truncate">
                ${workspace.name}
            </h4>
            <p class="text-xs text-slate-500 mb-4">${count} saved streams</p>
            
            <div class="space-y-1.5 mt-auto">
                ${workspace.inputs.slice(0, 3).map(input => html`
                    <div class="flex items-center gap-2 text-[10px] text-slate-400/80">
                        <div class="w-1.5 h-1.5 rounded-full ${input.url.includes('.m3u8') ? 'bg-purple-500/50' : 'bg-blue-500/50'}"></div>
                        <span class="truncate max-w-[200px]">${input.name || new URL(input.url).hostname}</span>
                    </div>
                `)}
                ${count > 3 ? html`<div class="text-[9px] text-slate-600 pl-3.5 font-medium">+ ${count - 3} more</div>` : ''}
            </div>
        </div>
    `;
};

export class LibraryModalComponent extends HTMLElement {
    connectedCallback() {
        this.render();
        this.unsubscribe = useUiStore.subscribe(() => this.render());
    }

    disconnectedCallback() {
        if (this.unsubscribe) this.unsubscribe();
    }

    close() {
        uiActions.setLibraryModalOpen(false);
    }

    handleImport(e) {
        if (e.target.files.length > 0) {
            importWorkspace(e.target.files[0]);
            e.target.value = '';
        }
    }

    render() {
        const { 
            isLibraryModalOpen, 
            streamLibraryActiveTab, 
            streamLibrarySearchTerm,
            workspaces, 
            presets, 
            history 
        } = useUiStore.getState();

        if (!isLibraryModalOpen) {
            render(html``, this);
            return;
        }

        const tabs = [
            { key: 'workspaces', label: 'Workspaces', count: workspaces.length, icon: icons.folder },
            { key: 'presets', label: 'Presets', count: presets.length, icon: icons.star },
            { key: 'history', label: 'History', count: history.length, icon: icons.history },
            { key: 'examples', label: 'Examples', count: exampleStreams.length, icon: icons.library },
        ];

        const searchLower = streamLibrarySearchTerm.toLowerCase();
        const filter = (items) => items.filter(i => 
            (i.name?.toLowerCase().includes(searchLower)) || 
            (i.url?.toLowerCase().includes(searchLower))
        );

        let content;
        
        // We use absolute positioning on the grid containers inside a scroll view to ensure stable heights
        if (streamLibraryActiveTab === 'workspaces') {
            const filtered = filter(workspaces);
            content = filtered.length > 0
                ? html`<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">${filtered.map(w => workspaceCard(w, () => uiActions.deleteAndReloadWorkspace(w.name)))}</div>`
                : html`
                    <div class="flex flex-col items-center justify-center h-full text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/20 min-h-[200px]">
                        <div class="scale-150 mb-4 opacity-50">${icons.folder}</div>
                        <p>No workspaces found.</p>
                        <label class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-lg shadow-blue-900/20">
                            Import JSON
                            <input type="file" accept=".json" class="hidden" @change=${this.handleImport} />
                        </label>
                    </div>`;
        } else {
            let sourceList = [];
            let context = streamLibraryActiveTab;
            if (streamLibraryActiveTab === 'presets') sourceList = presets;
            else if (streamLibraryActiveTab === 'history') sourceList = history;
            else sourceList = exampleStreams;

            const filtered = filter(sourceList);
            const handleDelete = (url) => {
                if (context === 'history') uiActions.deleteAndReloadHistoryItem(url);
                if (context === 'presets') uiActions.deleteAndReloadPreset(url);
            };

            content = filtered.length > 0
                ? html`<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-max">${filtered.map(s => streamCard(s, context, () => handleDelete(s.url)))}</div>`
                : html`
                    <div class="flex flex-col items-center justify-center h-full text-slate-500 italic min-h-[200px]">
                        <div class="mb-2 opacity-50">${icons.search}</div>
                        No streams match your search
                    </div>`;
        }

        const backdropTemplate = html`
            <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
                <!-- Backdrop -->
                <div class="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" @click=${() => this.close()}></div>

                <!-- Modal Window with FIXED height using h-[85vh] instead of max-h -->
                <div class="relative w-full max-w-6xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col h-[85vh] animate-scaleIn overflow-hidden">
                    
                    <!-- Header / Toolbar -->
                    <div class="shrink-0 p-5 border-b border-slate-800 bg-slate-900/80 backdrop-blur z-10 flex flex-col gap-4">
                        <div class="flex justify-between items-center">
                            <div class="flex items-center gap-3">
                                <div class="p-2 bg-slate-800 rounded-lg border border-slate-700 text-slate-400">${icons.inbox}</div>
                                <div>
                                    <h2 class="text-xl font-bold text-white">The Vault</h2>
                                    <p class="text-xs text-slate-500">Manage your saved environments and streams.</p>
                                </div>
                            </div>
                            <button @click=${() => this.close()} class="text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg">
                                ${icons.xCircle}
                            </button>
                        </div>

                        <div class="flex flex-col md:flex-row gap-4">
                            <!-- Tabs -->
                            <div class="flex p-1 bg-slate-950 rounded-lg border border-slate-800 self-start overflow-x-auto max-w-full scrollbar-hide">
                                ${tabs.map(tab => {
                                    const isActive = streamLibraryActiveTab === tab.key;
                                    return html`
                                        <button 
                                            @click=${() => uiActions.setStreamLibraryTab(tab.key)}
                                            class="px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                                                isActive 
                                                    ? 'bg-slate-800 text-white shadow-sm ring-1 ring-white/10' 
                                                    : 'text-slate-500 hover:text-slate-300'
                                            }"
                                        >
                                            ${tab.icon} ${tab.label}
                                            <span class="opacity-50 text-[9px] bg-black/20 px-1.5 rounded-full">${tab.count}</span>
                                        </button>
                                    `;
                                })}
                            </div>

                            <!-- Search -->
                            <div class="relative grow">
                                <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
                                    ${icons.search}
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="Filter library..." 
                                    class="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                    .value=${streamLibrarySearchTerm}
                                    @input=${(e) => uiActions.setStreamLibrarySearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <!-- Scrollable Content Area -->
                    <div class="grow overflow-y-auto custom-scrollbar p-6 bg-slate-950/30">
                        ${content}
                    </div>

                    <!-- Footer for Workspaces -->
                    ${streamLibraryActiveTab === 'workspaces' ? html`
                        <div class="shrink-0 p-4 bg-slate-900 border-t border-slate-800 flex justify-between items-center">
                            <div class="text-[10px] text-slate-500">
                                Workspaces persist your session queue, custom headers, and DRM settings.
                            </div>
                            <label class="cursor-pointer flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold text-slate-300 hover:text-white transition-colors">
                                ${icons.upload} Import Workspace
                                <input type="file" accept=".json" class="hidden" @change=${this.handleImport} />
                            </label>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        render(backdropTemplate, this);
    }
}

if (!customElements.get('library-modal-component')) {
    customElements.define('library-modal-component', LibraryModalComponent);
}