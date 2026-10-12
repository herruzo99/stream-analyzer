/**
 * Suite library sidebar for the regression view.
 * Lists persisted suites from testSuiteStore; selecting sets the
 * active suite. Includes an inline New action so the empty state and
 * mobile (no sidebar chrome elsewhere) are never dead ends.
 */
import { html, render } from 'lit-html';
import { useTestSuiteStore } from '@/state/testSuiteStore';

class SuiteLibrarySidebar extends HTMLElement {
    connectedCallback() {
        this._unsubscribe?.();
        try {
            this._unsubscribe = useTestSuiteStore.subscribe(() =>
                this.render()
            );
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
        const { suites, activeSuiteId, setActiveSuiteId, addSuite } =
            useTestSuiteStore.getState();
        const list = Array.isArray(suites) ? suites : [];
        render(
            html`
                <div class="flex flex-col h-full min-h-0">
                    <div
                        class="px-4 pt-4 pb-3 shrink-0 border-b border-white/5 flex items-center justify-between gap-2"
                    >
                        <h2 class="mono text-xs font-medium text-slate-400">
                            suites
                            <span class="text-slate-600"
                                >(${list.length})</span
                            >
                        </h2>
                        <button
                            @click=${() =>
                                addSuite({
                                    name: `Suite ${list.length + 1}`,
                                    assertions: [],
                                })}
                            class="mono text-[11px] text-slate-500 hover:text-emerald-300 transition-colors"
                            title="Create a new empty suite"
                        >
                            + new
                        </button>
                    </div>
                    <div class="grow min-h-0 overflow-y-auto custom-scrollbar p-2">
                        ${list.length === 0
                            ? html`<div class="py-8 px-3 text-center">
                                  <p
                                      class="text-[13px] text-slate-300 mb-1"
                                  >
                                      No suites yet.
                                  </p>
                                  <p
                                      class="mono text-[11px] text-slate-600 mb-3"
                                  >
                                      Start from a preset or build your own.
                                  </p>
                                  <button
                                      @click=${() =>
                                          addSuite({
                                              name: 'Suite 1',
                                              assertions: [],
                                          })}
                                      class="px-3 py-1.5 rounded-md border border-white/10 text-[12px] font-medium text-slate-200 hover:border-white/25 hover:bg-white/5 transition-colors"
                                  >
                                      New suite
                                  </button>
                              </div>`
                            : list.map(
                                  (suite) => html`
                                      <button
                                          @click=${() =>
                                              setActiveSuiteId(suite.id)}
                                          aria-current=${suite.id ===
                                          activeSuiteId}
                                          class="w-full text-left px-2.5 py-2 rounded-md border transition-colors mb-1 ${suite.id ===
                                          activeSuiteId
                                              ? 'bg-emerald-500/5 border-emerald-500/30'
                                              : 'bg-transparent border-transparent hover:bg-white/5'}"
                                      >
                                          <div
                                              class="text-[13px] font-medium text-slate-200 truncate"
                                          >
                                              ${suite.name || 'Untitled suite'}
                                          </div>
                                          <div
                                              class="mono text-[10px] text-slate-600 mt-0.5"
                                          >
                                              ${(suite.assertions || []).length}
                                              rule${(suite.assertions || []).length === 1 ? '' : 's'}
                                          </div>
                                      </button>
                                  `
                              )}
                    </div>
                </div>
            `,
            this
        );
    }
}

export const suiteLibrarySidebarTemplate = () =>
    html`<suite-library-sidebar
        class="h-full w-full block"
    ></suite-library-sidebar>`;

if (!customElements.get('suite-library-sidebar')) {
    customElements.define('suite-library-sidebar', SuiteLibrarySidebar);
}
