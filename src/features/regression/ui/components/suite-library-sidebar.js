/**
 * Suite library sidebar for the regression view.
 *
 * Reconstructed for the port (imported but never committed). Lists
 * persisted suites from testSuiteStore; selecting sets the active suite.
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
        const { suites, activeSuiteId, setActiveSuiteId } =
            useTestSuiteStore.getState();
        render(
            html`
                <div class="flex flex-col h-full min-h-0">
                    <div class="px-4 py-3 border-b border-slate-800 shrink-0">
                        <h2
                            class="text-xs font-bold text-slate-400 uppercase tracking-widest"
                        >
                            Test Suites
                            <span class="ml-1 text-slate-500"
                                >(${suites.length})</span
                            >
                        </h2>
                    </div>
                    <div
                        class="grow min-h-0 overflow-y-auto custom-scrollbar p-2 space-y-1.5"
                    >
                        ${suites.length === 0
                            ? html`<p
                                  class="text-xs text-slate-500 text-center py-8"
                              >
                                  No suites yet.<br />Create one to begin.
                              </p>`
                            : suites.map(
                                  (suite) => html`
                                      <button
                                          @click=${() =>
                                              setActiveSuiteId(suite.id)}
                                          class="w-full text-left p-2.5 rounded-xl border transition-all ${suite.id ===
                                          activeSuiteId
                                              ? 'bg-blue-500/10 border-blue-500/30'
                                              : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'}"
                                      >
                                          <div
                                              class="text-xs font-bold text-slate-200 truncate"
                                          >
                                              ${suite.name}
                                          </div>
                                          <div
                                              class="text-[10px] font-mono text-slate-500 mt-0.5"
                                          >
                                              ${suite.assertions?.length || 0}
                                              assertions
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
