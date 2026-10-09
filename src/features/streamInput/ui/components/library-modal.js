import { exampleStreams } from '@/data/example-streams';
import {
    exportWorkspace,
    importWorkspace,
} from '@/infrastructure/persistence/streamStorage';
import { analysisActions } from '@/state/analysisStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';

// ... [Helper functions getBadge, streamCard, workspaceCard remain unchanged] ...
const getBadge = (text, colorClasses) => html`
    <span
        class="text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${colorClasses}"
    >
        ${text}
    </span>
`;

const streamCard = (stream, context, onDelete) => {
    const isDash = stream.protocol === 'dash';
    const protocolColor = isDash
        ? 'text-blue-400 bg-slate-700 border-slate-700'
        : 'text-purple-300 bg-slate-700 border-slate-700';

    const isLive =
        stream.type === 'live' ||
        (stream.manifest && stream.manifest.type === 'dynamic');

    const handleLoad = () => {
        analysisActions.addStreamInputFromPreset(stream);
    };

    return html`
        <div
            @click=${handleLoad}
            class="group relative bg-slate-800 hover:bg-slate-800 border border-slate-800 hover:border-slate-400 rounded-xl p-4 cursor-pointer transition-all duration-200 flex flex-col justify-between hover:shadow-lg hover:-translate-y-0.5 h-full"
        >
            <div>
                <div class="flex justify-between items-start mb-3">
                    <div class="flex gap-2">
                        ${getBadge(stream.protocol || 'UNK', protocolColor)}
                        ${isLive
            ? html`<span
                                  class="text-[9px] font-bold text-red-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-800 flex items-center gap-1"
                                  ><span
                                      class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"
                                  ></span
                                  >LIVE</span
                              >`
            : html`<span
                                  class="text-[9px] font-bold text-[#94a3b8] bg-slate-800 px-1.5 py-0.5 rounded border border-slate-800"
                                  >VOD</span
                              >`}
                    </div>
                    ${context !== 'examples'
            ? html`
                              <button
                                  @click=${(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
                                  class="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1.5 -mr-2 -mt-2 text-[#94a3b8] hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all"
                                  title="Remove"
                              >
                                  ${icons.xCircle}
                              </button>
                          `
            : ''}
                </div>

                <h4
                    class="font-bold text-[#f1f5f9] text-sm mb-1 line-clamp-2 group-hover:text-[#f1f5f9] transition-colors"
                >
                    ${stream.name}
                </h4>

                <div
                    class="bg-slate-800 rounded border border-slate-800 p-1.5 mb-3 group-hover:border-slate-400 transition-colors"
                >
                    <p
                        class="text-[10px] font-mono text-[#94a3b8] truncate select-all"
                        title="${stream.url}"
                    >
                        ${stream.url}
                    </p>
                </div>
            </div>

            <div
                class="pt-3 border-t border-slate-800 flex justify-between items-center mt-auto"
            >
                <div class="flex gap-2">
                    ${stream.auth?.headers?.length > 0
            ? html`<span
                              class="text-xs text-[#94a3b8]"
                              title="Has Auth Headers"
                              >${icons.key}</span
                          >`
            : ''}
                    ${stream.drmAuth?.licenseServerUrl
            ? html`<span
                              class="text-xs text-[#94a3b8]"
                              title="DRM Configured"
                              >${icons.lockClosed}</span
                          >`
            : ''}
                </div>
                <span
                    class="text-[10px] font-bold text-blue-400 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center gap-1"
                >
                    Add ${icons.plusCircle}
                </span>
            </div>
        </div>
    `;
};

const workspaceCard = (workspace, onDelete) => {
    const count = workspace.inputs.length;

    const handleLoad = () => {
        if (
            confirm(
                `Load workspace "${workspace.name}"? This will replace current streams.`
            )
        ) {
            analysisActions.setStreamInputs(workspace.inputs);
            uiActions.setLoadedWorkspaceName(workspace.name);
            uiActions.setLibraryModalOpen(false);
        }
    };

    return html`
        <div
            @click=${handleLoad}
            class="group relative bg-slate-700 hover:bg-slate-700 border border-slate-700 hover:border-slate-700 rounded-xl p-5 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-[#3b82f6] h-full flex flex-col"
        >
            <div class="flex justify-between items-start mb-4">
                <div
                    class="p-2.5 bg-slate-700 text-blue-400 rounded-lg border border-slate-700 group-hover:scale-110 transition-transform duration-300 shadow-inner"
                >
                    ${icons.folder}
                </div>
                <div
                    class="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                >
                    <button
                        @click=${(e) => {
            e.stopPropagation();
            exportWorkspace(workspace.name);
        }}
                        class="p-1.5 text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-slate-800 rounded-lg transition-colors"
                        title="Export JSON"
                    >
                        ${icons.share}
                    </button>
                    <button
                        @click=${(e) => {
            e.stopPropagation();
            onDelete();
        }}
                        class="p-1.5 text-[#94a3b8] hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Delete"
                    >
                        ${icons.xCircle}
                    </button>
                </div>
            </div>

            <h4
                class="font-bold text-[#f1f5f9] text-base mb-1 group-hover:text-[#60a5fa] transition-colors truncate"
            >
                ${workspace.name}
            </h4>
            <p class="text-xs text-[#94a3b8] mb-4">
                ${count} saved streams
            </p>

            <div class="space-y-1.5 mt-auto">
                ${workspace.inputs.slice(0, 3).map(
            (input) => html`
                        <div
                            class="flex items-center gap-2 text-[10px] text-[#94a3b8]/80"
                        >
                            <div
                                class="w-1.5 h-1.5 rounded-full ${input.url.includes(
                '.m3u8'
            )
                    ? 'bg-purple-500'
                    : 'bg-blue-500'}"
                            ></div>
                            <span class="truncate max-w-[200px]"
                                >${input.name ||
                new URL(input.url).hostname}</span
                            >
                        </div>
                    `
        )}
                ${count > 3
            ? html`<div
                          class="text-[9px] text-[#94a3b8] pl-3.5 font-medium"
                      >
                          + ${count - 3} more
                      </div>`
            : ''}
            </div>
        </div>
    `;
};

export class LibraryModalComponent extends HTMLElement {
    connectedCallback() {
        this.render();
        this.unsubscribe = useUiStore.subscribe(() => this.render());

        // Handle close from Frame
        this.addEventListener('close', () => this.close());
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
            history,
        } = useUiStore.getState();

        if (!isLibraryModalOpen) {
            render(html``, this);
            return;
        }

        const tabs = [
            {
                key: 'workspaces',
                label: 'Workspaces',
                count: workspaces.length,
                icon: icons.folder,
            },
            {
                key: 'presets',
                label: 'Presets',
                count: presets.length,
                icon: icons.star,
            },
            {
                key: 'history',
                label: 'History',
                count: history.length,
                icon: icons.history,
            },
            {
                key: 'examples',
                label: 'Examples',
                count: exampleStreams.length,
                icon: icons.library,
            },
        ];

        const searchLower = streamLibrarySearchTerm.toLowerCase();
        const filter = (items) =>
            items.filter(
                (i) =>
                    i.name?.toLowerCase().includes(searchLower) ||
                    i.url?.toLowerCase().includes(searchLower)
            );

        let content;

        if (streamLibraryActiveTab === 'workspaces') {
            const filtered = filter(workspaces);
            content =
                filtered.length > 0
                    ? html`<div
                          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max"
                      >
                          ${filtered.map((w) =>
                        workspaceCard(w, () =>
                            uiActions.deleteAndReloadWorkspace(w.name)
                        )
                    )}
                      </div>`
                    : html` <div
                          class="flex flex-col items-center justify-center h-full text-[#94a3b8] border-2 border-dashed border-slate-800 rounded-2xl bg-slate-800/20 min-h-[200px]"
                      >
                          <div class="scale-150 mb-4 opacity-50">
                              ${icons.folder}
                          </div>
                          <p>No workspaces found.</p>
                          <label
                              class="mt-4 px-4 py-2 bg-[#60a5fa] hover:bg-blue-500 text-slate-100 text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-lg shadow-[#3b82f6]"
                          >
                              Import JSON
                              <input
                                  type="file"
                                  accept=".json"
                                  class="hidden"
                                  @change=${this.handleImport}
                              />
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
                if (context === 'history')
                    uiActions.deleteAndReloadHistoryItem(url);
                if (context === 'presets') uiActions.deleteAndReloadPreset(url);
            };

            content =
                filtered.length > 0
                    ? html`<div
                          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-max"
                      >
                          ${filtered.map((s) =>
                        streamCard(s, context, () => handleDelete(s.url))
                    )}
                      </div>`
                    : html` <div
                          class="flex flex-col items-center justify-center h-full text-[#94a3b8] italic min-h-[200px]"
                      >
                          <div class="mb-2 opacity-50">${icons.search}</div>
                          No streams match your search
                      </div>`;
        }

        // Use plain standard modal frame but reimplement internal structure
        const template = html`
            <div class="flex flex-col h-full min-h-0">
                <!-- Modal Window Internal -->
                <div class="relative w-full h-[85vh] flex flex-col bg-slate-800 backdrop-filter backdrop-blur-[blur(12px)] border border-slate-800 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
                    
                    <!-- Ambient Glows -->
                    <div
                        class="absolute top-0 right-0 w-64 h-64 bg-slate-700 rounded-full blur-[100px] pointer-events-none"
                    ></div>
                    <div
                        class="absolute bottom-0 left-0 w-64 h-64 bg-slate-700 rounded-full blur-[100px] pointer-events-none"
                    ></div>

                    <!-- Header / Toolbar -->
                    <div class="shrink-0 p-5 border-b border-slate-800 bg-transparent z-10 flex flex-col gap-5 relative">
                        <div class="flex justify-between items-center">
                            <div class="flex items-center gap-4">
                                <div class="p-2.5 bg-slate-800 rounded-xl border border-slate-800 text-blue-400 shadow-[0_0_15px_#3b82f6]">
                                    ${icons.inbox}
                                </div>
                                <div>
                                    <h2 class="text-2xl font-bold text-[#f1f5f9] tracking-tight">
                                        The Vault
                                    </h2>
                                    <p class="text-xs text-[#94a3b8] font-medium">
                                        Manage your saved environments and streams.
                                    </p>
                                </div>
                            </div>
                            <!-- Close button is also provided by ModalFrame via backdrop click, but keeping explicit one here -->
                            <button
                                @click=${() => this.close()}
                                class="text-[#94a3b8] hover:text-[#f1f5f9] transition-all p-2 hover:bg-slate-800 rounded-full hover:rotate-90 duration-300"
                            >
                                ${icons.xCircle}
                            </button>
                        </div>

                        <div class="flex flex-col md:flex-row gap-4">
                            <!-- Tabs -->
                            <div class="flex p-1.5 bg-slate-800 rounded-xl border border-slate-800 self-start overflow-x-auto w-full md:w-auto max-w-full scrollbar-hide backdrop-blur-md">
                                ${tabs.map((tab) => {
            const isActive = streamLibraryActiveTab === tab.key;
            return html`
                                        <button
                                            @click=${() => uiActions.setStreamLibraryTab(tab.key)}
                                            class="px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${isActive
                    ? 'bg-gradient-to-r from-slate-700 to-slate-700 text-[#f1f5f9] shadow-[0_0_15px_#3b82f6] border border-slate-700'
                    : 'text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-slate-800'}"
                                        >
                                            ${tab.icon} ${tab.label}
                                            <span class="opacity-60 text-[9px] bg-slate-800 px-1.5 py-0.5 rounded-md border border-slate-800">
                                                ${tab.count}
                                            </span>
                                        </button>
                                    `;
        })}
                            </div>

                            <!-- Search -->
                            <div class="relative grow">
                                <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[#94a3b8]">
                                    ${icons.search}
                                </div>
                                <input
                                    type="text"
                                    placeholder="Filter library..."
                                    class="w-full bg-slate-800 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-[#f1f5f9] placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-slate-800 transition-all shadow-inner"
                                    .value=${streamLibrarySearchTerm}
                                    @input=${(e) => uiActions.setStreamLibrarySearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <!-- Scrollable Content Area -->
                    <div class="grow overflow-y-auto custom-scrollbar p-4 md:p-6 bg-slate-800 relative z-0">
                        ${content}
                    </div>

                    <!-- Footer for Workspaces -->
                    ${streamLibraryActiveTab === 'workspaces'
                ? html`
                              <div class="shrink-0 p-4 bg-slate-800 border-t border-slate-800 flex justify-between items-center backdrop-blur-xl relative z-10">
                                  <div class="text-[10px] text-[#94a3b8] font-medium">
                                      Workspaces persist your session queue, custom headers, and DRM settings.
                                  </div>
                                  <label class="cursor-pointer flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-[#94a3b8] hover:text-[#f1f5f9] transition-all hover:shadow-lg hover:border-slate-800">
                                      ${icons.upload} Import Workspace
                                      <input
                                          type="file"
                                          accept=".json"
                                          class="hidden"
                                          @change=${this.handleImport}
                                      />
                                  </label>
                              </div>
                          `
                : ''}
                </div>
            </div>
        `;

        render(template, this);
    }
}

if (!customElements.get('library-modal-component')) {
    customElements.define('library-modal-component', LibraryModalComponent);
}
