import { cancelRegressionRun, startRegressionRun } from '@/features/regression/application/run-regression.js';
import { testSuiteActions, useTestSuiteStore } from '@/state/testSuiteStore';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';
import { testSuiteManagerTemplate } from './test-suite-manager.js';

const resultCard = (res) => {
    const passed = res.passed === true;
    const errored = res.classification === 'error';
    const name = res.name || 'Unnamed rule';

    if (passed && !errored) {
        return html`
            <div
                class="flex items-center justify-between gap-3 px-3 py-2.5 rounded-md border border-white/5 bg-white/[0.02]"
            >
                <span class="flex items-center gap-2.5 min-w-0">
                    <span class="text-emerald-300 shrink-0"
                        >${icons.checkCircle}</span
                    >
                    <span class="min-w-0">
                        <span
                            class="block text-[13px] font-medium text-slate-200 truncate"
                            title="${name}"
                            >${name}</span
                        >
                        <span
                            class="mono block text-[10px] text-slate-600 truncate"
                            title="${res.actual ?? ''}"
                            >got ${String(res.actual ?? 'n/a').slice(0, 80)}</span
                        >
                    </span>
                </span>
                <span class="mono shrink-0 text-[10px] text-emerald-300/80"
                    >pass</span
                >
            </div>
        `;
    }

    // FAIL / ERROR: expanded terminal-style block
    return html`
        <div
            class="rounded-md border ${errored ? 'border-amber-400/30 bg-amber-500/[0.04]' : 'border-red-400/30 bg-red-500/[0.04]'} overflow-hidden"
        >
            <div class="flex items-start justify-between gap-3 px-3 py-2.5">
                <span class="flex items-center gap-2.5 min-w-0">
                    <span
                        class="${errored ? 'text-amber-300' : 'text-red-300'} shrink-0 mt-0.5"
                        >${errored ? icons.alertTriangle : icons.xCircle}</span
                    >
                    <span class="min-w-0">
                        <span
                            class="block text-[13px] font-medium text-slate-100 truncate"
                            title="${name}"
                            >${name}</span
                        >
                        <span
                            class="mono block text-[10px] ${errored ? 'text-amber-300/80' : 'text-red-300/80'} mt-0.5"
                            >${errored ? 'error' : 'failed'}</span
                        >
                    </span>
                </span>
            </div>
            <div
                class="mx-3 mb-3 rounded bg-black/40 border border-white/5 p-2.5 font-mono text-[11px] leading-relaxed break-words"
            >
                <p class="text-slate-400">
                    expected
                    <span class="text-slate-200">${String(res.expected ?? 'n/a').slice(0, 200)}</span>
                </p>
                <p class="text-slate-400 mt-1">
                    actual
                    <span class="${errored ? 'text-amber-200' : 'text-red-200'}">${String(res.actual ?? 'n/a').slice(0, 200)}</span>
                </p>
                ${res.details
                    ? html`<p class="text-slate-500 mt-1">
                          ${String(res.details).slice(0, 300)}
                      </p>`
                    : ''}
            </div>
        </div>
    `;
};

export const testRunnerTemplate = (stream) => {
    const { suites, activeSuiteId, lastRunResult, runState, runProgress } =
        useTestSuiteStore.getState();
    const list = Array.isArray(suites) ? suites : [];
    const activeSuite = list.find((s) => s.id === activeSuiteId);
    const results = Array.isArray(lastRunResult?.results)
        ? lastRunResult.results
        : [];
    // Prefer the local suiteId attached at run time; the contract's
    // suite.id is a derived content hash, not the store id.
    const resultSuiteId =
        lastRunResult?.suiteId ?? lastRunResult?.suite?.id ?? null;
    const showingResults =
        !!lastRunResult &&
        resultSuiteId !== null &&
        resultSuiteId === activeSuite?.id;

    // Empty state - No suite selected
    if (!activeSuite) {
        return html`
            <div
                class="flex flex-col items-center justify-center h-full p-8 text-center"
            >
                <p class="text-[15px] font-medium text-slate-200 mb-1">
                    No suite selected.
                </p>
                <p class="mono text-[11px] text-slate-600 mb-4">
                    Pick a suite from the library or start a new one.
                </p>
                <button
                    @click=${() =>
                        testSuiteActions.addSuite({
                            name: `Suite ${list.length + 1}`,
                            assertions: [],
                        })}
                    class="px-4 py-2 rounded-md bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-[13px] font-medium transition-colors flex items-center gap-2"
                >
                    ${icons.plusCircle} New suite
                </button>
            </div>
        `;
    }

    const ruleCount = Array.isArray(activeSuite.assertions)
        ? activeSuite.assertions.length
        : 0;

    // Running state
    if (runState === 'running') {
        const pct = Math.round((runProgress || 0) * 100);
        return html`
            <div
                class="flex flex-col items-center justify-center h-full p-8 text-center"
            >
                <p class="mono text-[11px] text-slate-500 mb-2">
                    running ${ruleCount} rule${ruleCount === 1 ? '' : 's'}…
                </p>
                <div
                    class="w-56 h-1 rounded-sm bg-white/5 overflow-hidden mb-2"
                    role="progressbar"
                    aria-valuenow=${pct}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-label="Regression run progress"
                >
                    <div
                        class="h-full bg-emerald-400"
                        style="width: ${pct}%"
                    ></div>
                </div>
                <p class="mono text-[11px] text-slate-600 mb-4">${pct}%</p>
                <button
                    @click=${() => cancelRegressionRun()}
                    class="px-4 py-2 rounded-md border border-red-400/40 bg-red-500/10 text-red-200 text-[13px] font-medium hover:bg-red-500/15 transition-colors"
                >
                    Stop run
                </button>
            </div>
        `;
    }

    // Results View
    if (showingResults) {
        const total = lastRunResult.totalCount ?? results.length;
        const passed = lastRunResult.passedCount ?? 0;
        const failed = total - passed;
        const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
        return html`
            <div class="flex flex-col h-full min-h-0">
                <div
                    class="shrink-0 px-4 py-3 border-b border-white/5 flex items-center gap-4 flex-wrap"
                >
                    <div class="flex items-baseline gap-2">
                        <span class="text-2xl tabular-nums ${failed === 0 ? 'text-emerald-300' : 'text-slate-100'}"
                            >${pct}<span class="mono text-[11px] text-slate-600">%</span></span
                        >
                        <span class="mono text-[11px] text-slate-500">
                            ${passed}/${total} passed
                        </span>
                    </div>
                    <span class="grow"></span>
                    <button
                        @click=${() => startRegressionRun(stream)}
                        class="px-3 py-1.5 rounded-md border border-emerald-400/25 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15 text-[12px] font-medium transition-colors flex items-center gap-1.5"
                        title="Run the suite again"
                    >
                        ${icons.refresh} Re-run
                    </button>
                    <button
                        @click=${() =>
                            testSuiteActions.setLastRunResult(null)}
                        class="px-3 py-1.5 rounded-md border border-white/10 text-[12px] font-medium text-slate-400 hover:text-slate-100 hover:border-white/25 transition-colors flex items-center gap-1.5"
                    >
                        ${icons.arrowLeft} Rules
                    </button>
                </div>
                <div
                    class="grow min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-1.5"
                >
                    ${results.length === 0
                        ? html`<p
                              class="mono text-[11px] text-slate-600 p-6 text-center"
                          >
                              No rule results recorded.
                          </p>`
                        : results.map((r) => resultCard(r || {}))}
                </div>
            </div>
        `;
    }

    // Default Editor View
    return html`
        <div class="h-full flex flex-col min-h-0">
            ${ruleCount === 0
                ? html`<p
                      class="mono text-[11px] text-slate-600 px-4 pt-3 shrink-0"
                  >
                      Add rules below, then press Run in the header.
                  </p>`
                : ''}
            <div class="grow min-h-0">
                ${testSuiteManagerTemplate(activeSuite)}
            </div>
        </div>
    `;
};
