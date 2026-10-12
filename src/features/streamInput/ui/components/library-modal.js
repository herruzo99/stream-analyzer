import { exampleStreams } from '@/data/example-streams';
import {
    exportWorkspace,
    importWorkspace,
} from '@/infrastructure/persistence/streamStorage';
import { analysisActions } from '@/state/analysisStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import { showToast } from '@/ui/components/toast';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';

function safeHostname(url) {
    if (typeof url !== 'string' || !url) return 'unknown host';
    try {
        const parsed = new URL(url);
        if (parsed.protocol === 'blob:') return 'local file';
        return parsed.hostname || 'unknown host';
    } catch {
        return 'invalid url';
    }
}

function protocolOf(stream) {
    const proto = (stream.protocol || '').toLowerCase();
    if (proto === 'dash' || (stream.url || '').includes('.mpd')) return 'DASH';
    if (proto === 'hls' || (stream.url || '').includes('.m3u8')) return 'HLS';
    if ((stream.url || '').includes('.ism')) return 'MSS';
    return '';
}

const protoChip = (proto) =>
    !proto
        ? html``
        : html`
              <span
                  class="mono shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border text-emerald-200 bg-emerald-500/10 border-emerald-400/25"
                  >${proto}</span
              >
          `;

const liveChip = (isLive) =>
    isLive
        ? html`<span
              class="mono flex items-center gap-1 text-[10px] text-red-300"
              ><span class="w-1.5 h-1.5 rounded-full bg-red-500"></span
              >live</span
          >`
        : html`<span class="mono text-[10px] text-slate-600">vod</span>`;

const streamCard = (stream, context, handlers) => {
    const proto = protocolOf(stream);
    const isLive =
        stream.type === 'live' ||
        (stream.manifest && stream.manifest.type === 'dynamic');

    return html`
        <div
            @click=${() => handlers.stage(stream)}
            class="group relative bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/15 rounded-lg p-4 cursor-pointer transition-colors flex flex-col"
            title="Stage this stream"
        >
            <div class="flex justify-between items-start gap-2 mb-2">
                <div class="flex gap-2 items-center min-w-0">
                    ${protoChip(proto)} ${liveChip(isLive)}
                </div>
                ${context !== 'examples'
                    ? html`
                          <button
                              @click=${(e) => {
                                  e.stopPropagation();
                                  handlers.remove(stream);
                              }}
                              class="shrink-0 p-1 text-slate-600 hover:text-red-300 rounded transition-colors"
                              title="Remove"
                              aria-label="Remove ${stream.name || stream.url}"
                          >
                              ${icons.x}
                          </button>
                      `
                    : ''}
            </div>

            <h4
                class="font-medium text-slate-100 text-sm mb-1 truncate"
                title="${stream.name || ''}"
            >
                ${stream.name || safeHostname(stream.url)}
            </h4>

            <p
                class="mono text-[10px] text-slate-600 truncate mb-3"
                title="${stream.url}"
            >
                ${safeHostname(stream.url)}
            </p>

            <div class="pt-2 border-t border-white/5 flex justify-between items-center mt-auto">
                <span class="flex gap-2 text-slate-600">
                    ${stream.auth?.headers?.length > 0
                        ? html`<span title="Has auth headers"
                              >${icons.key}</span
                          >`
                        : ''}
                    ${stream.drmAuth?.licenseServerUrl
                        ? html`<span title="DRM configured"
                              >${icons.lockClosed}</span
                          >`
                        : ''}
                </span>
                <span
                    class="mono text-[11px] font-medium text-emerald-300 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
                >
                    Stage
                </span>
            </div>
        </div>
    `;
};

const workspaceCard = (workspace, handlers, ui) => {
    const count = workspace.inputs?.length ?? 0;
    const confirming = ui.confirmingWorkspace === workspace.name;

    return html`
        <div
            class="group relative bg-white/[0.02] border border-white/5 rounded-lg p-4 flex flex-col transition-colors ${confirming
                ? 'border-amber-400/40'
                : 'hover:border-white/15'}"
        >
            <div class="flex justify-between items-start gap-2 mb-2">
                <span class="p-2 rounded-md bg-white/5 text-slate-400"
                    >${icons.folder}</span
                >
                <span class="flex gap-1">
                    <button
                        @click=${() => handlers.exportWorkspace(workspace)}
                        class="p-1.5 text-slate-600 hover:text-slate-200 rounded transition-colors"
                        title="Export JSON"
                        aria-label="Export workspace ${workspace.name}"
                    >
                        ${icons.share}
                    </button>
                    <button
                        @click=${() => handlers.removeWorkspace(workspace)}
                        class="p-1.5 text-slate-600 hover:text-red-300 rounded transition-colors"
                        title="Delete workspace"
                        aria-label="Delete workspace ${workspace.name}"
                    >
                        ${icons.x}
                    </button>
                </span>
            </div>

            <h4
                class="font-medium text-slate-100 text-[15px] mb-0.5 truncate"
                title="${workspace.name}"
            >
                ${workspace.name}
            </h4>
            <p class="mono text-[11px] text-slate-600 mb-3">
                ${count} saved stream${count === 1 ? '' : 's'}
            </p>

            <div class="flex flex-col gap-1 mb-3">
                ${workspace.inputs?.slice(0, 3).map(
                    (input) => html`
                        <div
                            class="flex items-center gap-2 mono text-[10px] text-slate-500"
                        >
                            <span
                                class="w-1 h-1 rounded-full bg-slate-600 shrink-0"
                            ></span>
                            <span class="truncate"
                                >${input.name ||
                                safeHostname(input.url)}</span
                            >
                        </div>
                    `
                )}
                ${count > 3
                    ? html`<div class="mono text-[10px] text-slate-600 pl-3">
                          + ${count - 3} more
                      </div>`
                    : ''}
            </div>

            ${confirming
                ? html`<div class="mt-auto pt-3 border-t border-amber-400/20">
                      <p class="text-xs text-slate-300 mb-2">
                          Replace the current queue with these ${count}
                          stream${count === 1 ? '' : 's'}?
                      </p>
                      <div class="flex gap-2">
                          <button
                              @click=${() => handlers.loadWorkspace(workspace)}
                              class="grow py-2 rounded-md bg-amber-400 text-slate-950 text-[13px] font-bold hover:bg-amber-300 transition-colors"
                          >
                              Replace queue
                          </button>
                          <button
                              @click=${() => handlers.cancelConfirm()}
                              class="px-3 py-2 rounded-md border border-white/10 text-[13px] text-slate-400 hover:text-slate-100 transition-colors"
                          >
                              Keep
                          </button>
                      </div>
                  </div>`
                : html`<button
                      @click=${() => handlers.askLoadWorkspace(workspace)}
                      class="mt-auto w-full py-2 rounded-md border border-white/10 text-[13px] font-medium text-slate-200 hover:border-white/25 hover:bg-white/5 transition-colors"
                  >
                      Load workspace
                  </button>`}
        </div>
    `;
};

export class LibraryModalComponent extends HTMLElement {
    constructor() {
        super();
        this._confirmingWorkspace = null;
        this._lastFocus = null;
    }

    connectedCallback() {
        this.render();
        this.unsubscribe = useUiStore.subscribe(() => this.render());
        this.addEventListener('close', () => this.close());
        document.addEventListener('keydown', this._onKeyDown, true);
    }

    disconnectedCallback() {
        if (this.unsubscribe) this.unsubscribe();
        document.removeEventListener('keydown', this._onKeyDown, true);
    }

    _onKeyDown = (e) => {
        if (e.key === 'Escape' && useUiStore.getState().isLibraryModalOpen) {
            e.stopPropagation();
            this.close();
        }
    };

    get confirmingWorkspace() {
        return this._confirmingWorkspace;
    }

    close() {
        this._confirmingWorkspace = null;
        uiActions.setLibraryModalOpen(false);
        if (this._lastFocus?.isConnected) {
            this._lastFocus.focus({ preventScroll: true });
        }
        this._lastFocus = null;
    }

    async handleImport(e) {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        try {
            const imported = await importWorkspace(file);
            uiActions.loadWorkspaces();
            showToast({
                message: `Imported workspace "${imported.name}".`,
                type: 'pass',
            });
        } catch (err) {
            showToast({
                message: `Import failed: ${err?.message || 'invalid file'}.`,
                type: 'fail',
            });
        }
    }

    _stageAndClose(stream, label) {
        if (!stream || typeof stream.url !== 'string' || !stream.url.trim()) {
            showToast({
                message: 'That entry has no URL to stage.',
                type: 'fail',
            });
            return;
        }
        analysisActions.addStreamInputFromPreset(stream);
        this.close();
        showToast({
            message: `Staged "${stream.name || safeHostname(stream.url)}"${label ? ` — ${label}` : ''}.`,
            type: 'pass',
        });
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
            this._renderedOpen = false;
            render(html``, this);
            return;
        }

        if (!this._renderedOpen) {
            this._lastFocus =
                document.activeElement instanceof HTMLElement
                    ? document.activeElement
                    : null;
            this._renderedOpen = true;
            queueMicrotask(() => {
                this.querySelector('[data-vault-search]')?.focus({
                    preventScroll: true,
                });
            });
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

        const searchLower = (streamLibrarySearchTerm || '').toLowerCase();
        const filter = (items) =>
            (items || []).filter(
                (i) =>
                    i.name?.toLowerCase().includes(searchLower) ||
                    i.url?.toLowerCase().includes(searchLower)
            );

        const handlers = {
            stage: (s) => this._stageAndClose(s),
            remove: (s) => {
                if (streamLibraryActiveTab === 'history') {
                    uiActions.deleteAndReloadHistoryItem(s.url);
                    showToast({ message: 'Removed from history.', type: 'pass' });
                } else if (streamLibraryActiveTab === 'presets') {
                    uiActions.deleteAndReloadPreset(s.url);
                    showToast({ message: 'Preset removed.', type: 'pass' });
                }
            },
            exportWorkspace: (w) => {
                try {
                    exportWorkspace(w.name);
                    showToast({
                        message: `Exported "${w.name}".`,
                        type: 'pass',
                    });
                } catch (err) {
                    showToast({
                        message: `Export failed: ${err?.message || 'unknown error'}.`,
                        type: 'fail',
                    });
                }
            },
            removeWorkspace: (w) => {
                uiActions.deleteAndReloadWorkspace(w.name);
                showToast({
                    message: `Deleted workspace "${w.name}".`,
                    type: 'pass',
                });
            },
            askLoadWorkspace: (w) => {
                this._confirmingWorkspace = w.name;
                this.render();
            },
            cancelConfirm: () => {
                this._confirmingWorkspace = null;
                this.render();
            },
            loadWorkspace: (w) => {
                analysisActions.setStreamInputs(w.inputs || []);
                uiActions.setLoadedWorkspaceName(w.name);
                this._confirmingWorkspace = null;
                this.close();
                showToast({
                    message: `Loaded workspace "${w.name}" into the queue.`,
                    type: 'pass',
                });
            },
        };

        let content;
        if (streamLibraryActiveTab === 'workspaces') {
            const filtered = filter(workspaces);
            content =
                filtered.length > 0
                    ? html`<div
                          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                      >
                          ${filtered.map((w) =>
                              workspaceCard(w, handlers, this)
                          )}
                      </div>`
                    : html`<div
                          class="flex flex-col items-center justify-center text-slate-500 border border-dashed border-white/10 rounded-lg bg-white/[0.02] min-h-[180px] p-8 text-center"
                      >
                          <div class="mb-3 text-slate-600">${icons.folder}</div>
                          <p class="text-sm text-slate-400 mb-1">
                              No workspaces yet
                          </p>
                          <p
                              class="mono text-[11px] text-slate-600 mb-4 max-w-sm"
                          >
                              Stage some streams, then save the queue to
                              reuse it later.
                          </p>
                          <label
                              class="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-[13px] font-bold rounded-md cursor-pointer transition-colors"
                          >
                              Import JSON
                              <input
                                  type="file"
                                  accept=".json,application/json"
                                  class="hidden"
                                  @change=${this.handleImport}
                              />
                          </label>
                      </div>`;
        } else {
            const sourceList =
                streamLibraryActiveTab === 'presets'
                    ? presets
                    : streamLibraryActiveTab === 'history'
                      ? history
                      : exampleStreams;
            const filtered = filter(sourceList);
            content =
                filtered.length > 0
                    ? html`<div
                          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
                      >
                          ${filtered.map((s) =>
                              streamCard(
                                  s,
                                  streamLibraryActiveTab,
                                  handlers
                              )
                          )}
                      </div>`
                    : html`<div
                          class="flex flex-col items-center justify-center text-slate-500 min-h-[180px] p-8 text-center"
                      >
                          <div class="mb-3 text-slate-600">${icons.search}</div>
                          <p class="text-sm text-slate-400">
                              ${searchLower
                                  ? 'Nothing matches that filter.'
                                  : streamLibraryActiveTab === 'examples'
                                    ? 'No examples found.'
                                    : `No ${streamLibraryActiveTab} yet. Analyze a stream and it will show up here.`}
                          </p>
                          ${searchLower
                              ? html`<button
                                    @click=${() =>
                                        uiActions.setStreamLibrarySearchTerm(
                                            ''
                                        )}
                                    class="mono mt-3 text-[11px] text-emerald-300 hover:text-emerald-200 transition-colors"
                                >
                                    Clear filter
                                </button>`
                              : ''}
                      </div>`;
        }

        const template = html`
            <div
                class="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-8"
                role="dialog"
                aria-modal="true"
                aria-label="Stream library"
            >
                <div
                    class="absolute inset-0 bg-black/70"
                    @click=${() => this.close()}
                ></div>
                <div
                    class="relative w-full max-w-5xl max-h-[85vh] flex flex-col bg-[#0b111c] border border-white/10 rounded-lg overflow-hidden"
                >
                    <div
                        class="shrink-0 px-5 pt-4 pb-3 border-b border-white/5 flex flex-col gap-3"
                    >
                        <div class="flex justify-between items-center gap-3">
                            <div>
                                <h2
                                    class="text-lg font-bold text-slate-100 tracking-tight"
                                >
                                    Library
                                </h2>
                                <p class="mono text-[11px] text-slate-500">
                                    workspaces · presets · history ·
                                    examples
                                </p>
                            </div>
                            <button
                                @click=${() => this.close()}
                                class="p-2 text-slate-500 hover:text-slate-100 hover:bg-white/5 rounded-md transition-colors"
                                aria-label="Close library"
                            >
                                ${icons.x}
                            </button>
                        </div>

                        <div class="flex flex-col md:flex-row gap-2">
                            <div
                                class="flex p-1 bg-black/30 rounded-md border border-white/5 self-start overflow-x-auto max-w-full"
                                role="tablist"
                            >
                                ${tabs.map((tab) => {
                                    const isActive =
                                        streamLibraryActiveTab === tab.key;
                                    return html`
                                        <button
                                            role="tab"
                                            aria-selected=${isActive}
                                            @click=${() => {
                                                this._confirmingWorkspace =
                                                    null;
                                                uiActions.setStreamLibraryTab(
                                                    tab.key
                                                );
                                            }}
                                            class="px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${isActive
                                                ? 'bg-white/10 text-slate-100'
                                                : 'text-slate-500 hover:text-slate-200'}"
                                        >
                                            ${tab.label}
                                            <span
                                                class="mono text-[10px] text-slate-600"
                                                >${tab.count}</span
                                            >
                                        </button>
                                    `;
                                })}
                            </div>

                            <div class="relative grow">
                                <div
                                    class="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-600"
                                >
                                    ${icons.search}
                                </div>
                                <input
                                    data-vault-search
                                    type="search"
                                    placeholder="Filter..."
                                    aria-label="Filter library"
                                    class="w-full bg-[#06090f] border border-white/10 rounded-md py-2 pl-9 pr-8 text-sm text-slate-100 placeholder-slate-600 focus:border-emerald-400/60 outline-none transition-colors"
                                    .value=${streamLibrarySearchTerm || ''}
                                    @input=${(e) =>
                                        uiActions.setStreamLibrarySearchTerm(
                                            e.target.value
                                        )}
                                />
                                ${searchLower
                                    ? html`<button
                                          @click=${() =>
                                              uiActions.setStreamLibrarySearchTerm(
                                                  ''
                                              )}
                                          class="absolute inset-y-0 right-2 flex items-center text-slate-600 hover:text-slate-200"
                                          aria-label="Clear filter"
                                      >
                                          ${icons.x}
                                      </button>`
                                    : ''}
                            </div>
                        </div>
                    </div>

                    <div class="grow overflow-y-auto custom-scrollbar p-4">
                        ${content}
                    </div>

                    ${streamLibraryActiveTab === 'workspaces'
                        ? html`
                              <div
                                  class="shrink-0 px-4 py-3 bg-black/20 border-t border-white/5 flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center"
                              >
                                  <p class="mono text-[10px] text-slate-600">
                                      Workspaces keep the queue, headers,
                                      and DRM settings.
                                  </p>
                                  <label
                                      class="cursor-pointer flex items-center justify-center gap-2 px-3 py-2 border border-white/10 rounded-md text-xs font-medium text-slate-300 hover:border-white/25 hover:bg-white/5 transition-colors"
                                  >
                                      ${icons.upload} Import workspace
                                      <input
                                          type="file"
                                          accept=".json,application/json"
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
