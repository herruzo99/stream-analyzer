/**
 * Suite header: contextual actions for the regression view.
 *
 * Reconstructed for the port (imported but never committed). Contract,
 * derived from the index call site: `suiteHeaderTemplate(stream)`.
 * New/Import/Delete operate on testSuiteStore; running happens in the
 * test runner against the active suite.
 */
import { html } from 'lit-html';
import { useTestSuiteStore } from '@/state/testSuiteStore';

export const suiteHeaderTemplate = (stream) => {
    const { suites, activeSuiteId, addSuite, importSuite, deleteSuite } =
        useTestSuiteStore.getState();
    const activeSuite = suites.find((s) => s.id === activeSuiteId);
    return html`
        <div class="flex items-center gap-2 flex-wrap">
            <div class="mr-auto min-w-0">
                <div
                    class="text-xs font-bold text-slate-200 truncate"
                    title="Active suite"
                >
                    ${activeSuite ? activeSuite.name : 'No suite selected'}
                </div>
                <div class="text-[10px] font-mono text-slate-500 truncate">
                    ${stream
                        ? `${stream.protocol?.toUpperCase() || ''} · ${
                              stream.name || stream.id
                          }`
                        : 'No stream loaded'}
                </div>
            </div>
            <button
                @click=${() =>
                    addSuite({
                        name: `Suite ${suites.length + 1}`,
                        assertions: [],
                    })}
                class="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 text-[11px] font-bold transition-all"
                title="Create a new empty suite"
            >
                + New
            </button>
            <label
                class="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 text-[11px] font-bold transition-all cursor-pointer"
                title="Import a suite from JSON"
            >
                Import
                <input
                    type="file"
                    accept="application/json,.json"
                    class="hidden"
                    @change=${async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                            importSuite(JSON.parse(await file.text()));
                        } catch {
                            /* invalid JSON: store reports it */
                        }
                        e.target.value = '';
                    }}
                />
            </label>
            ${activeSuite
                ? html`<button
                      @click=${() => {
                          if (
                              confirm(
                                  `Delete "${activeSuite.name}"?`
                              )
                          ) {
                              deleteSuite(activeSuite.id);
                          }
                      }}
                      class="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-red-400 hover:border-red-500/30 text-[11px] font-bold transition-all"
                      title="Delete the active suite"
                  >
                      Delete
                  </button>`
                : ''}
        </div>
    `;
};
