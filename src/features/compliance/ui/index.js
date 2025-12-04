import { eventBus } from '@/application/event-bus';
import { useAnalysisStore } from '@/state/analysisStore';
import { useTestSuiteStore } from '@/state/testSuiteStore'; // NEW
import { useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { calculateComplianceScore } from '../domain/compliance-scoring';
import './components/compliance-scorecard.js';
import './components/issue-list.js';
import { navigationTemplate } from './components/navigation.js';
import { manifestViewTemplate } from './components/renderer.js';
import { standardSelectorTemplate } from './components/standard-selector.js';
import { testRunnerTemplate } from './components/test-runner.js'; // NEW

// Need to register the manager component for the dynamic import in test-runner to work seamlessly
// although lit-html handles it, ensuring the file is bundled:
import './components/test-suite-manager.js';

let container = null;
let currentStreamId = null;
let uiUnsubscribe = null;
let analysisUnsubscribe = null;
let testSuiteUnsubscribe = null; // NEW

// 'dashboard' | 'source' | 'regression'
let viewMode = 'dashboard';

function renderComplianceView() {
    if (!container || currentStreamId === null) return;

    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === currentStreamId);
    if (!stream || !stream.manifest) {
        render(
            html`<div class="text-slate-500 p-8 text-center">
                No stream loaded.
            </div>`,
            container
        );
        return;
    }

    const { complianceStandardVersion } = useUiStore.getState();
    const { protocol, activeManifestUpdateId } = stream;

    const currentUpdate =
        stream.manifestUpdates.find((u) => u.id === activeManifestUpdateId) ||
        stream.manifestUpdates[0];
    const complianceResults = currentUpdate?.complianceResults || [];
    const scoreData = calculateComplianceScore(complianceResults);

    const toggleView = (mode) => {
        viewMode = mode;
        renderComplianceView();
    };

    const dashboardContent = html`
        <div class="space-y-6 animate-fadeIn">
            <compliance-scorecard .data=${scoreData}></compliance-scorecard>
            <div>
                <h3
                    class="text-lg font-bold text-white mb-4 flex items-center gap-2"
                >
                    ${icons.list} Detailed Findings
                </h3>
                <compliance-issue-list
                    .data=${{ issues: complianceResults, stream }}
                ></compliance-issue-list>
            </div>
        </div>
    `;

    const sourceContent = html`
        <div class="h-full flex flex-col">
            <div
                class="bg-slate-800 rounded-lg p-2 sm:p-4 font-mono text-sm leading-relaxed overflow-auto grow border border-slate-700"
            >
                ${manifestViewTemplate(
                    currentUpdate?.rawManifest || stream.rawManifest,
                    protocol,
                    complianceResults,
                    currentUpdate?.serializedManifest ||
                        stream.manifest.serializedManifest,
                    'all'
                )}
            </div>
        </div>
    `;

    const regressionContent = html`
        <div class="h-full flex flex-col animate-fadeIn">
            ${testRunnerTemplate(stream)}
        </div>
    `;

    const header = html`
        <header
            class="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 shrink-0"
        >
            <div>
                <h2
                    class="text-2xl font-bold text-white flex items-center gap-2"
                >
                    ${icons.shieldCheck} Compliance & Testing
                </h2>
                <p class="text-slate-400 text-sm mt-1">
                    Analyzed against
                    ${protocol === 'hls'
                        ? `HLS v${complianceStandardVersion}`
                        : 'MPEG-DASH'}
                    standards.
                </p>
            </div>

            <div
                class="flex flex-wrap gap-3 items-center bg-slate-800/50 p-1.5 rounded-lg border border-slate-700"
            >
                <div class="flex bg-slate-900 rounded p-0.5">
                    <button
                        @click=${() => toggleView('dashboard')}
                        class="px-3 py-1.5 text-xs font-bold rounded transition-colors flex items-center gap-2 ${viewMode ===
                        'dashboard'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-slate-200'}"
                    >
                        ${icons.layout} Standards
                    </button>
                    <button
                        @click=${() => toggleView('regression')}
                        class="px-3 py-1.5 text-xs font-bold rounded transition-colors flex items-center gap-2 ${viewMode ===
                        'regression'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-slate-200'}"
                    >
                        ${icons.beaker} Regression
                    </button>
                    <button
                        @click=${() => toggleView('source')}
                        class="px-3 py-1.5 text-xs font-bold rounded transition-colors flex items-center gap-2 ${viewMode ===
                        'source'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-slate-200'}"
                    >
                        ${icons.code} Source
                    </button>
                </div>
                <div class="w-px h-6 bg-slate-700 mx-1"></div>
                ${protocol === 'hls'
                    ? standardSelectorTemplate({
                          selectedVersion: complianceStandardVersion,
                          onVersionChange: (version) =>
                              eventBus.dispatch(
                                  'ui:compliance:standard-version-changed',
                                  { version }
                              ),
                      })
                    : ''}
                ${protocol === 'dash' ||
                (protocol === 'hls' && !stream.activeMediaPlaylistUrl)
                    ? navigationTemplate(stream)
                    : ''}
            </div>
        </header>
    `;

    let activeContent = dashboardContent;
    if (viewMode === 'source') activeContent = sourceContent;
    if (viewMode === 'regression') activeContent = regressionContent;

    render(
        html`
            <div class="flex flex-col h-full overflow-y-auto p-4 sm:p-6">
                ${header}
                <div class="grow min-h-0 relative">${activeContent}</div>
            </div>
        `,
        container
    );
}

export const complianceView = {
    mount(containerElement, { stream }) {
        container = containerElement;
        currentStreamId = stream.id;
        if (uiUnsubscribe) uiUnsubscribe();
        if (analysisUnsubscribe) analysisUnsubscribe();
        if (testSuiteUnsubscribe) testSuiteUnsubscribe();

        uiUnsubscribe = useUiStore.subscribe(renderComplianceView);
        analysisUnsubscribe = useAnalysisStore.subscribe(renderComplianceView);
        // Subscribe to test suite changes to trigger re-renders in regression mode
        testSuiteUnsubscribe =
            useTestSuiteStore.subscribe(renderComplianceView);

        renderComplianceView();
    },
    unmount() {
        if (uiUnsubscribe) uiUnsubscribe();
        if (analysisUnsubscribe) analysisUnsubscribe();
        if (testSuiteUnsubscribe) testSuiteUnsubscribe();

        uiUnsubscribe = null;
        analysisUnsubscribe = null;
        testSuiteUnsubscribe = null;
        container = null;
        currentStreamId = null;
    },
};
