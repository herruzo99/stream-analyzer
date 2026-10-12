/**
 * Suite header: contextual actions for the regression view.
 * Owns suite lifecycle (new/import/export/delete) plus Run/Stop for the
 * active suite against the loaded stream.
 */
import { cancelRegressionRun, startRegressionRun } from '@/features/regression/application/run-regression.js';
import { showToast } from '@/ui/components/toast';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';
import { useTestSuiteStore } from '@/state/testSuiteStore';

let confirmingDeleteId = null;

export const suiteHeaderTemplate = (stream) => {
    const {
        suites,
        activeSuiteId,
        addSuite,
        importSuite,
        deleteSuite,
        exportSuite,
    } = useTestSuiteStore.getState();
    const { runState, runProgress } = useTestSuiteStore.getState();
    const activeSuite = suites.find((s) => s.id === activeSuiteId);
    const ruleCount = Array.isArray(activeSuite?.assertions)
        ? activeSuite.assertions.length
        : 0;
    const canRun = !!activeSuite && ruleCount > 0 && !!stream?.manifest;
    const armed = confirmingDeleteId === activeSuite?.id;

    const btn =
        'px-2.5 py-1.5 rounded-md border text-[12px] font-medium transition-colors flex items-center gap-1.5';
    const quiet =
        'border-white/10 text-slate-300 hover:text-slate-100 hover:border-white/25 hover:bg-white/5';
    const runBtn =
        'border-emerald-400/25 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15 disabled:opacity-40 disabled:cursor-not-allowed';

    return html`
        <div class="flex items-center gap-2 flex-wrap">
            <div class="mr-auto min-w-0">
                <div
                    class="text-[13px] font-medium text-slate-200 truncate"
                    title="Active suite"
                >
                    ${activeSuite ? activeSuite.name : 'No suite selected'}
                </div>
                <div class="mono text-[10px] text-slate-600 truncate">
                    ${stream
                        ? `${(stream.protocol || 'unknown').toLowerCase()} · ${stream.name || stream.id}`
                        : 'no stream loaded'}
                    ${activeSuite ? ` · ${ruleCount} rule${ruleCount === 1 ? '' : 's'}` : ''}
                </div>
            </div>
            ${runState === 'running'
                ? html`
                      <button
                          @click=${() => cancelRegressionRun()}
                          class="${btn} border-red-400/40 bg-red-500/10 text-red-200 hover:bg-red-500/15"
                          title="Stop the running suite"
                      >
                          ${icons.stop} Stop
                          <span class="mono text-[10px]"
                              >${Math.round(runProgress * 100)}%</span
                          >
                      </button>
                  `
                : html`
                      <button
                          @click=${() => startRegressionRun(stream)}
                          ?disabled=${!canRun}
                          class="${btn} ${runBtn}"
                          title=${!activeSuite
                              ? 'Select a suite first'
                              : ruleCount === 0
                                ? 'Add at least one rule first'
                                : !stream?.manifest
                                  ? 'Analyze a stream first'
                                  : `Run ${ruleCount} rules against this stream`}
                      >
                          ${icons.play} Run
                      </button>
                  `}
            <button
                @click=${() =>
                    addSuite({
                        name: `Suite ${suites.length + 1}`,
                        assertions: [],
                    })}
                class="${btn} ${quiet}"
                title="Create a new empty suite"
            >
                ${icons.plusCircle} New
            </button>
            <label
                class="${btn} ${quiet} cursor-pointer"
                title="Import a suite from JSON"
            >
                ${icons.upload} Import
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
                            showToast({
                                message: 'Could not read that file.',
                                type: 'fail',
                            });
                        }
                        e.target.value = '';
                    }}
                />
            </label>
            ${activeSuite
                ? html`
                      <button
                          @click=${() => exportSuite(activeSuite.id)}
                          class="${btn} ${quiet}"
                          title="Download this suite as JSON"
                      >
                          ${icons.download} Export
                      </button>
                      <button
                          @click=${() => {
                              if (!armed) {
                                  confirmingDeleteId = activeSuite.id;
                                  setTimeout(() => {
                                      confirmingDeleteId = null;
                                  }, 4000);
                                  return;
                              }
                              confirmingDeleteId = null;
                              deleteSuite(activeSuite.id);
                              showToast({
                                  message: `Deleted “${activeSuite.name}”.`,
                                  type: 'info',
                              });
                          }}
                          class="${btn} ${armed
                              ? 'border-red-400/40 bg-red-500/10 text-red-200'
                              : `${quiet} hover:!text-red-300`}"
                          title="Delete the active suite"
                      >
                          ${icons.trash} ${armed ? 'Confirm' : 'Delete'}
                      </button>
                  `
                : ''}
        </div>
    `;
};
