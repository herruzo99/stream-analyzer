/**
 * <staging-sidebar> — source queue list for the staging view.
 *
 * Reconstructed for the port (imported but never committed). The usage
 * contract (`<staging-sidebar class="h-full w-full">`, no props) shows a
 * self-contained element; it reads the staging queue from the analysis
 * store and reuses that store's select/remove actions.
 */
import { html, render } from 'lit-html';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';

const displayName = (input) => {
    if (input.name) return input.name;
    try {
        return new URL(input.url).hostname || 'Local source';
    } catch {
        return 'Local source';
    }
};

class StagingSidebar extends HTMLElement {
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
    }

    render() {
        const { streamInputs, activeStreamInputId } =
            useAnalysisStore.getState();
        render(
            html`
                <div class="flex flex-col h-full min-h-0">
                    <div class="px-4 py-3 border-b border-slate-800 shrink-0">
                        <h2
                            class="text-xs font-bold text-slate-400 uppercase tracking-widest"
                        >
                            Source Queue
                            <span class="ml-1 text-slate-500"
                                >(${streamInputs.length})</span
                            >
                        </h2>
                    </div>
                    <div class="grow min-h-0 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
                        ${streamInputs.length === 0
                            ? html`<p
                                  class="text-xs text-slate-500 text-center py-8"
                              >
                                  Queue is empty.<br />Add a stream to begin.
                              </p>`
                            : streamInputs.map(
                                  (input) => html`
                                      <div
                                          @click=${() =>
                                              analysisActions.setActiveStreamInputId(
                                                  input.id
                                              )}
                                          class="group flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${input.id ===
                                          activeStreamInputId
                                              ? 'bg-blue-500/10 border-blue-500/30'
                                              : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'}"
                                      >
                                          <div class="grow min-w-0">
                                              <div
                                                  class="text-xs font-bold text-slate-200 truncate"
                                                  title="${displayName(input)}"
                                              >
                                                  ${displayName(input)}
                                              </div>
                                              <div
                                                  class="text-[10px] font-mono text-slate-500 truncate"
                                                  title="${input.url}"
                                              >
                                                  ${input.url}
                                              </div>
                                          </div>
                                          <button
                                              @click=${(e) => {
                                                  e.stopPropagation();
                                                  analysisActions.removeStreamInput(
                                                      input.id
                                                  );
                                              }}
                                              class="shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                              title="Remove from queue"
                                          >
                                              ×
                                          </button>
                                      </div>
                                  `
                              )}
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
