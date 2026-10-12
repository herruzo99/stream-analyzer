/**
 * <staging-sidebar> — staged source queue for the workbench.
 * Reads the queue from the analysis store; selection + removal reuse
 * the store's actions. Header owns workbench-level actions:
 * back to start, library, analyze.
 */
import { eventBus } from '@/application/event-bus';
import { saveWorkspace } from '@/infrastructure/persistence/streamStorage';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import { EVENTS } from '@/types/events';
import { showToast } from '@/ui/components/toast';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { inputView } from '../input-view.js';

function displayName(input) {
    if (input.name) return input.name;
    if (typeof input.url !== 'string' || !input.url) return 'Local source';
    try {
        return new URL(input.url).hostname || 'Local source';
    } catch {
        return 'Local source';
    }
}

function isStagedUsable(input) {
    if (!input) return false;
    if (input.file) return true;
    if (typeof input.url !== 'string' || !input.url.trim()) return false;
    try {
        const parsed = new URL(input.url.trim());
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

// Tier-0 preflight badges: quick per-stream readout (reachability,
// protocol, live/vod, encryption, low latency). Mono lowercase to match
// the workbench voice; emerald only for ok/active, red only for errors.
function sniffedProtocol(input) {
    const url = (input.url || '').toLowerCase();
    if (url.includes('.m3u8')) return 'hls';
    if (url.includes('.mpd')) return 'dash';
    if (url.includes('.ism')) return 'mss';
    return '';
}

const preflightBadges = (input) => {
    const chips = [];
    const chip = (text, cls, title) => html`
        <span
            class="mono shrink-0 text-[10px] px-1 py-px rounded border ${cls}"
            title=${title || text}
            >${text}</span
        >
    `;
    const muted =
        'text-slate-500 bg-white/5 border-white/10';
    const ok =
        'text-emerald-200 bg-emerald-500/10 border-emerald-400/25';
    const bad =
        'text-red-300 bg-red-500/10 border-red-400/25';

    if (input.isTier0AnalysisLoading) {
        chips.push(chip('probing', muted, 'Checking stream reachability'));
    } else if (input.tier0) {
        const t = input.tier0;
        if (t.status >= 400 || t.status === 0) {
            chips.push(
                chip(
                    t.status === 0 ? 'unreachable' : `http ${t.status}`,
                    bad,
                    t.error || 'Manifest request failed'
                )
            );
        } else {
            chips.push(chip(`http ${t.status}`, ok, 'Manifest reachable'));
        }
        if (t.protocol && t.protocol !== 'Unknown') {
            chips.push(
                chip(
                    String(t.protocol).toLowerCase(),
                    ok,
                    'Detected protocol'
                )
            );
        }
        if (t.type && t.type !== 'Unknown') {
            const live = String(t.type).toUpperCase() === 'LIVE';
            chips.push(
                chip(
                    String(t.type).toLowerCase(),
                    live ? bad : muted,
                    live ? 'Live stream' : 'Video on demand'
                )
            );
        }
        if (t.isEncrypted) {
            chips.push(chip('drm', muted, 'Encrypted content'));
        }
        if (t.isLowLatency) {
            chips.push(chip('ll', muted, 'Low latency'));
        }
    } else {
        const proto = sniffedProtocol(input);
        if (proto) chips.push(chip(proto, muted, 'Guessed from URL'));
        if (isStagedUsable(input)) {
            chips.push(chip('pending', muted, 'Waiting for preflight check'));
        }
    }
    if (input.auth?.headers?.length > 0) {
        chips.push(chip('auth', muted, 'Custom auth headers attached'));
    }
    return chips.length > 0
        ? html`<span class="flex flex-wrap gap-1 mt-1">${chips}</span>`
        : html``;
};

class StagingSidebar extends HTMLElement {
    constructor() {
        super();
        this._confirmingClear = false;
        this._clearTimer = null;
        this._saving = false;
        this._saveName = '';
    }

    connectedCallback() {
        this._unsubscribe?.();
        try {
            this._unsubscribe = useAnalysisStore.subscribe(() => this.render());
        } catch {
            this._unsubscribe = null;
        }
        this.render();
    }

    disconnectedCallback() {
        try {
            this._unsubscribe?.();
        } catch {
            /* ignore */
        }
        this._unsubscribe = null;
        if (this._clearTimer) clearTimeout(this._clearTimer);
        this._saving = false;
        this._saveName = '';
    }

    _persistWorkspace(name, streamInputs) {
        const clean = (name || '').trim();
        if (!clean) {
            showToast({
                message: 'Name the workspace first.',
                type: 'fail',
            });
            return;
        }
        const persistable = streamInputs.map(
            ({ url, name: inputName, auth, drmAuth }) => ({
                url,
                name: inputName,
                auth,
                drmAuth,
            })
        );
        try {
            saveWorkspace({ name: clean, inputs: persistable });
            uiActions.loadWorkspaces();
            uiActions.setLoadedWorkspaceName(clean);
            this._saving = false;
            this._saveName = '';
            this.render();
            showToast({
                message: `Saved workspace "${clean}".`,
                type: 'pass',
            });
        } catch (err) {
            showToast({
                message: `Save failed: ${err?.message || 'storage error'}.`,
                type: 'fail',
            });
        }
    }

    _analyzeAll(validInputs) {
        if (validInputs.length === 0) {
            showToast({
                message:
                    'Nothing valid to analyze. Fix the flagged rows first.',
                type: 'fail',
            });
            return;
        }
        eventBus.dispatch(EVENTS.UI.STREAM_ANALYSIS_REQUESTED, {
            inputs: validInputs,
        });
    }

    _requestClear(count) {
        if (!this._confirmingClear) {
            this._confirmingClear = true;
            if (this._clearTimer) clearTimeout(this._clearTimer);
            this._clearTimer = setTimeout(() => {
                this._confirmingClear = false;
                this.render();
            }, 4000);
            this.render();
            return;
        }
        if (this._clearTimer) clearTimeout(this._clearTimer);
        this._confirmingClear = false;
        analysisActions.clearAllStreamInputs();
        showToast({
            message: `Cleared ${count} staged source${count === 1 ? '' : 's'}.`,
            type: 'pass',
        });
    }

    render() {
        const { streamInputs, activeStreamInputId } =
            useAnalysisStore.getState();
        const { loadedWorkspaceName } = useUiStore.getState();
        const usable = streamInputs.filter(isStagedUsable);
        const blocked = streamInputs.length - usable.length;

        render(
            html`
                <div class="flex flex-col h-full min-h-0">
                    <div
                        class="px-4 pt-4 pb-3 shrink-0 border-b border-white/5"
                    >
                        <div class="flex items-center gap-1 mb-3">
                            <button
                                @click=${() => inputView.showLanding()}
                                class="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-200 transition-colors"
                                title="Back to start (keeps the queue)"
                            >
                                ${icons.arrowLeft} Start
                            </button>
                            <span
                                class="mono text-[11px] text-slate-600 truncate"
                                >${loadedWorkspaceName
                                    ? `· ${loadedWorkspaceName}`
                                    : ''}</span
                            >
                            <span class="grow"></span>
                            <button
                                @click=${() => {
                                    uiActions.setStreamLibraryTab(
                                        'workspaces'
                                    );
                                    uiActions.setLibraryModalOpen(true);
                                }}
                                class="p-1.5 text-slate-500 hover:text-slate-200 transition-colors"
                                title="Open library"
                                aria-label="Open library"
                            >
                                ${icons.library}
                            </button>
                        </div>
                        <h2
                            class="mono text-xs font-medium text-slate-400"
                        >
                            Queue
                            <span class="text-slate-600"
                                >(${streamInputs.length})</span
                            >
                        </h2>
                    </div>
                    <div
                        class="grow min-h-0 overflow-y-auto custom-scrollbar p-2"
                    >
                        ${streamInputs.length === 0
                            ? html`<p
                                  class="mono text-[11px] text-slate-600 text-center py-8"
                              >
                                  Queue is empty.<br />Add a stream below to
                                  begin.
                              </p>`
                            : streamInputs.map(
                                  (input) => html`
                                      <div
                                          @click=${() =>
                                              analysisActions.setActiveStreamInputId(
                                                  input.id
                                              )}
                                          class="group flex items-center gap-2 px-2.5 py-2 rounded-md border cursor-pointer transition-colors mb-1 ${input.id ===
                                          activeStreamInputId
                                              ? 'bg-emerald-500/5 border-emerald-500/30'
                                              : 'bg-transparent border-transparent hover:bg-white/5'}"
                                      >
                                          <div class="grow min-w-0">
                                              <div
                                                  class="text-[13px] font-medium text-slate-200 truncate"
                                                  title="${displayName(input)}"
                                              >
                                                  ${displayName(input)}
                                              </div>
                                              <div
                                                  class="mono text-[10px] ${isStagedUsable(
                                                      input
                                                  )
                                                      ? 'text-slate-600'
                                                      : 'text-red-300/80'} truncate"
                                                  title="${input.url || ''}"
                                              >
                                                  ${input.url ||
                                                  'no URL yet — select to edit'}
                                              </div>
                                              ${preflightBadges(input)}
                                          </div>
                                          <button
                                              @click=${(e) => {
                                                  e.stopPropagation();
                                                  analysisActions.removeStreamInput(
                                                      input.id
                                                  );
                                              }}
                                              class="shrink-0 p-1.5 rounded text-slate-600 hover:text-red-300 transition-colors"
                                              title="Remove from queue"
                                              aria-label="Remove from queue"
                                          >
                                              ${icons.x}
                                          </button>
                                      </div>
                                  `
                              )}
                    </div>
                    <div
                        class="shrink-0 p-3 border-t border-white/5 flex flex-col gap-2"
                    >
                        ${blocked > 0
                            ? html`<p
                                  class="mono text-[10px] text-red-300/80"
                              >
                                  ${blocked} row${blocked === 1
                                      ? ' needs'
                                      : 's need'} a valid https URL before
                                  analyze.
                              </p>`
                            : ''}
                        <button
                            @click=${() => this._analyzeAll(usable)}
                            ?disabled=${usable.length === 0}
                            class="w-full py-2.5 rounded-md bg-emerald-400 text-slate-950 text-sm font-bold hover:bg-emerald-300 active:scale-[0.99] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Analyze
                            ${usable.length > 0
                                ? `(${usable.length})`
                                : ''}
                        </button>
                        ${this._saving
                            ? html`<div class="flex gap-1">
                                  <input
                                      type="text"
                                      placeholder="Workspace name..."
                                      aria-label="Workspace name"
                                      .value=${this._saveName}
                                      @input=${(e) => {
                                          this._saveName = e.target.value;
                                      }}
                                      @keydown=${(e) => {
                                          if (e.key === 'Enter')
                                              this._persistWorkspace(
                                                  this._saveName,
                                                  streamInputs
                                              );
                                          if (e.key === 'Escape') {
                                              this._saving = false;
                                              this._saveName = '';
                                              this.render();
                                          }
                                      }}
                                      class="grow min-w-0 bg-[#06090f] border border-white/10 rounded-md text-[13px] text-slate-100 placeholder-slate-600 px-2.5 py-1.5 outline-none focus:border-emerald-400/60 transition-colors"
                                  />
                                  <button
                                      @click=${() =>
                                          this._persistWorkspace(
                                              this._saveName,
                                              streamInputs
                                          )}
                                      class="px-3 py-1.5 rounded-md bg-emerald-400 text-slate-950 text-xs font-bold hover:bg-emerald-300 transition-colors shrink-0"
                                  >
                                      Save
                                  </button>
                              </div>`
                            : ''}
                        <div class="flex gap-1">
                            <button
                                @click=${() => {
                                    uiActions.setStreamLibraryTab('history');
                                    uiActions.setLibraryModalOpen(true);
                                }}
                                class="grow py-1.5 rounded-md text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-colors"
                            >
                                Add from library
                            </button>
                            ${streamInputs.length > 0 && !this._saving
                                ? html`<button
                                      @click=${() => {
                                          this._saving = true;
                                          this._saveName =
                                              loadedWorkspaceName || '';
                                          this.render();
                                          queueMicrotask(() =>
                                              this.querySelector(
                                                  'input[aria-label="Workspace name"]'
                                              )?.focus()
                                          );
                                      }}
                                      class="px-3 py-1.5 rounded-md text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-colors shrink-0"
                                      title="${loadedWorkspaceName
                                          ? `Update "${loadedWorkspaceName}" or save as new`
                                          : 'Save queue as workspace'}"
                                  >
                                      ${loadedWorkspaceName
                                          ? 'Update workspace'
                                          : 'Save'}
                                  </button>`
                                : ''}
                            ${streamInputs.length > 0
                                ? html`<button
                                      @click=${() =>
                                          this._requestClear(
                                              streamInputs.length
                                          )}
                                      class="px-3 py-1.5 rounded-md mono text-[11px] ${this
                                          ._confirmingClear
                                          ? 'text-red-300 bg-red-500/10'
                                          : 'text-slate-600 hover:text-red-300'} transition-colors"
                                  >
                                      ${this._confirmingClear
                                          ? 'Confirm clear'
                                          : 'Clear'}
                                  </button>`
                                : ''}
                        </div>
                    </div>
                </div>
            `,
            this
        );
    }
}

if (!customElements.get('staging-sidebar')) {
    customElements.define('staging-sidebar', StagingSidebar);
}
