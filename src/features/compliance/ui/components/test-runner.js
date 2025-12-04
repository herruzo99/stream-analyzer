import { runTestSuite } from '@/features/compliance/domain/test-engine';
import { testSuiteActions, useTestSuiteStore } from '@/state/testSuiteStore';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';
import { testSuiteManagerTemplate } from './test-suite-manager.js';

const resultCard = (res) => {
    const icon = res.passed ? icons.checkCircle : icons.xCircleRed;
    const borderColor = res.passed
        ? 'border-emerald-500/30'
        : 'border-red-500/40';
    const bgGradient = res.passed
        ? 'from-emerald-900/10 to-transparent'
        : 'from-red-900/10 to-transparent';
    const textColor = res.passed ? 'text-emerald-400' : 'text-red-400';

    return html`
        <div
            class="group bg-gradient-to-r ${bgGradient} border-l-4 ${borderColor} bg-slate-900/40 rounded-r-lg p-4 mb-2 transition-all hover:bg-slate-800/50"
        >
            <div class="flex items-start justify-between gap-4">
                <div class="flex items-center gap-3">
                    <div class="shrink-0 ${textColor} scale-110 mt-0.5">
                        ${icon}
                    </div>
                    <div>
                        <h4
                            class="font-bold text-sm text-slate-200 leading-tight"
                        >
                            ${res.assertion.name}
                        </h4>
                        <div
                            class="text-[10px] font-mono text-slate-500 mt-1 flex items-center gap-2"
                        >
                            <span
                                class="bg-slate-900 px-1.5 rounded border border-slate-700"
                                >${res.assertion.path}</span
                            >
                            <span class="text-slate-600"
                                >${res.assertion.operator}</span
                            >
                            <span class="text-blue-300/80"
                                >${res.assertion.value}</span
                            >
                        </div>
                    </div>
                </div>

                <div class="text-right">
                    <span
                        class="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${res.passed
                            ? 'bg-emerald-900/20 text-emerald-400'
                            : 'bg-red-900/20 text-red-400'}"
                    >
                        ${res.passed ? 'PASS' : 'FAIL'}
                    </span>
                </div>
            </div>

            ${!res.passed
                ? html`
                      <div
                          class="mt-3 pt-2 border-t border-white/5 flex items-start gap-2"
                      >
                          <span class="text-red-400 scale-75 mt-0.5"
                              >${icons.alertTriangle}</span
                          >
                          <p
                              class="text-xs font-mono text-red-200/80 leading-relaxed break-all"
                          >
                              ${res.details}
                          </p>
                      </div>
                  `
                : ''}
        </div>
    `;
};

export const testRunnerTemplate = (stream) => {
    const { suites, activeSuiteId, lastRunResult } =
        useTestSuiteStore.getState();
    const activeSuite = suites.find((s) => s.id === activeSuiteId);

    const handleRun = () => {
        if (!activeSuite) return;
        const result = runTestSuite(stream, activeSuite);
        testSuiteActions.setLastRunResult(result);
    };

    const handleCreate = () => {
        testSuiteActions.addSuite({ name: 'New Test Suite', assertions: [] });
    };

    const handleExport = (e) => {
        e.stopPropagation();
        if (!activeSuite) return;
        const dataStr = JSON.stringify(activeSuite, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeSuite.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const result = event.target?.result;
                if (typeof result === 'string') {
                    const json = JSON.parse(result);
                    testSuiteActions.importSuite(json);
                }
            } catch (err) {
                console.error('Import failed', err);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const triggerImport = () =>
        document.getElementById('suite-import-input')?.click();

    const suiteListItem = (suite) => {
        const isActive = activeSuiteId === suite.id;
        return html`
            <button
                @click=${() => testSuiteActions.setActiveSuiteId(suite.id)}
                class="w-full text-left p-3 rounded-xl transition-all flex items-center justify-between group border ${isActive
                    ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-900/20'
                    : 'bg-slate-800/30 border-transparent hover:bg-slate-800 hover:border-slate-700'}"
            >
                <div class="min-w-0">
                    <div
                        class="font-bold text-sm truncate ${isActive
                            ? 'text-white'
                            : 'text-slate-300 group-hover:text-white'}"
                    >
                        ${suite.name}
                    </div>
                    <div
                        class="text-[10px] truncate ${isActive
                            ? 'text-blue-200'
                            : 'text-slate-500 group-hover:text-slate-400'}"
                    >
                        ${suite.description || 'No description'}
                    </div>
                </div>
                <div
                    class="shrink-0 w-6 h-6 flex items-center justify-center rounded-full ${isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-900 text-slate-600'}"
                >
                    ${icons.chevronRight}
                </div>
            </button>
        `;
    };

    return html`
        <div class="flex h-full bg-slate-950 overflow-hidden">
            <!-- Sidebar -->
            <div
                class="w-72 flex flex-col shrink-0 border-r border-slate-800 bg-slate-950/50"
            >
                <div class="p-4 border-b border-slate-800">
                    <div class="flex justify-between items-center mb-3">
                        <h3
                            class="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"
                        >
                            ${icons.library} Test Library
                        </h3>
                        <button
                            @click=${handleCreate}
                            class="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors shadow-md"
                            title="New Suite"
                        >
                            ${icons.plusCircle}
                        </button>
                    </div>
                    <input
                        id="suite-import-input"
                        type="file"
                        accept=".json"
                        class="hidden"
                        @change=${handleImport}
                    />
                    <div class="flex gap-2">
                        <button
                            @click=${triggerImport}
                            class="flex-1 py-1.5 text-[10px] font-bold bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 text-slate-300 rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                            ${icons.upload} Import
                        </button>
                        <button
                            @click=${() => testSuiteActions.resetDefaults()}
                            class="px-2 py-1.5 text-[10px] font-bold bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 text-slate-400 hover:text-white rounded-lg transition-colors"
                            title="Reset Factory Defaults"
                        >
                            ${icons.refresh}
                        </button>
                    </div>
                </div>

                <div
                    class="grow overflow-y-auto custom-scrollbar p-3 space-y-2"
                >
                    ${suites.map(suiteListItem)}
                </div>
            </div>

            <!-- Main Content -->
            <div class="grow flex flex-col min-w-0 bg-slate-900">
                ${!activeSuite
                    ? html`
                          <div
                              class="flex flex-col items-center justify-center h-full text-slate-600 opacity-60"
                          >
                              <div
                                  class="scale-150 mb-4 p-6 bg-slate-800 rounded-full shadow-inner"
                              >
                                  ${icons.beaker}
                              </div>
                              <p class="text-sm font-medium">
                                  Select or create a test suite
                              </p>
                          </div>
                      `
                    : html`
                          ${lastRunResult &&
                          lastRunResult.suiteId === activeSuite.id
                              ? html`
                                    <!-- Results View -->
                                    <div class="flex flex-col h-full">
                                        <!-- Report Header -->
                                        <div
                                            class="shrink-0 p-6 border-b border-slate-800 bg-slate-900 shadow-sm z-10"
                                        >
                                            <div
                                                class="flex items-center justify-between mb-6"
                                            >
                                                <button
                                                    @click=${() =>
                                                        testSuiteActions.setLastRunResult(
                                                            null
                                                        )}
                                                    class="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800"
                                                >
                                                    ${icons.arrowLeft} Edit
                                                    Rules
                                                </button>
                                                <h2
                                                    class="text-lg font-bold text-white"
                                                >
                                                    ${activeSuite.name}
                                                </h2>
                                                <button
                                                    @click=${handleRun}
                                                    class="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-700 flex items-center gap-2 transition-colors"
                                                >
                                                    ${icons.refresh} Rerun
                                                </button>
                                            </div>

                                            <div
                                                class="flex items-stretch gap-4"
                                            >
                                                <!-- Score Card -->
                                                <div
                                                    class="flex items-center gap-6 px-6 py-4 rounded-xl border ${lastRunResult.status ===
                                                    'pass'
                                                        ? 'bg-emerald-900/10 border-emerald-500/30'
                                                        : 'bg-red-900/10 border-red-500/30'}"
                                                >
                                                    <div class="text-center">
                                                        <div
                                                            class="text-3xl font-black ${lastRunResult.status ===
                                                            'pass'
                                                                ? 'text-emerald-400'
                                                                : 'text-red-400'} leading-none"
                                                        >
                                                            ${lastRunResult.status ===
                                                            'pass'
                                                                ? 'PASSED'
                                                                : 'FAILED'}
                                                        </div>
                                                        <div
                                                            class="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1"
                                                        >
                                                            Status
                                                        </div>
                                                    </div>
                                                    <div
                                                        class="w-px h-10 bg-white/10"
                                                    ></div>
                                                    <div
                                                        class="text-sm font-mono"
                                                    >
                                                        <div
                                                            class="text-emerald-400 flex justify-between gap-4"
                                                        >
                                                            <span>Passing</span>
                                                            <b
                                                                >${lastRunResult.passedCount}</b
                                                            >
                                                        </div>
                                                        <div
                                                            class="text-red-400 flex justify-between gap-4"
                                                        >
                                                            <span>Failing</span>
                                                            <b
                                                                >${lastRunResult.totalCount -
                                                                lastRunResult.passedCount}</b
                                                            >
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- List -->
                                        <div
                                            class="grow overflow-y-auto p-6 custom-scrollbar bg-slate-950/30"
                                        >
                                            <h4
                                                class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4"
                                            >
                                                Assertion Details
                                            </h4>
                                            ${lastRunResult.results.map(
                                                resultCard
                                            )}
                                        </div>
                                    </div>
                                `
                              : html`
                                    <!-- Editor Mode -->
                                    <div class="flex flex-col h-full">
                                        <div
                                            class="shrink-0 p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 z-10"
                                        >
                                            <div
                                                class="flex gap-2 text-xs font-mono text-slate-500 bg-black/20 px-2 py-1 rounded border border-white/5"
                                            >
                                                <span
                                                    >ID:
                                                    ${activeSuite.id.slice(
                                                        0,
                                                        8
                                                    )}...</span
                                                >
                                            </div>
                                            <div class="flex gap-2">
                                                <button
                                                    @click=${handleExport}
                                                    class="p-2 text-slate-400 hover:text-blue-300 hover:bg-blue-900/20 rounded-lg transition-colors"
                                                    title="Export JSON"
                                                >
                                                    ${icons.download}
                                                </button>
                                                <button
                                                    @click=${handleRun}
                                                    class="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg shadow-emerald-900/20 transition-all hover:scale-[1.02] active:scale-95"
                                                >
                                                    ${icons.play} Run Suite
                                                </button>
                                            </div>
                                        </div>

                                        <div class="grow min-h-0">
                                            ${testSuiteManagerTemplate(
                                                activeSuite
                                            )}
                                        </div>
                                    </div>
                                `}
                      `}
            </div>
        </div>
    `;
};
