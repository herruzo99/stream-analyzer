import { useAnalysisStore } from '@/state/analysisStore';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { html, render } from 'lit-html';
import { findingCardTemplate } from './components/finding-card';
import {
    countManifestNodes,
    manifestViewTemplate,
} from './components/manifest-view';
import { statsSectionTemplate } from './components/stats-section';

let container = null;
let currentStreamId = null;
let analysisUnsubscribe = null;

// --- Main Render Function ---

function renderParserCoverage() {
    if (!container || currentStreamId === null) return;

    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === currentStreamId);

    if (!stream || !stream.manifest) {
        render(html``, container);
        return;
    }

    const handleDebugCopy = () => {
        const report = stream.coverageReport || [];
        const issueText = report
            .map((finding) => {
                return `[${finding.status.toUpperCase()}] ${finding.type}: ${
                    finding.name
                }\nLocation: ${finding.pathOrLine}\nDetails: ${
                    finding.details
                }\n---`;
            })
            .join('\n\n');
        const debugString = `--- MANIFEST ---\n${stream.rawManifest}\n\n--- COVERAGE ISSUES (${report.length}) ---\n${issueText}`;
        copyTextToClipboard(debugString, 'Debug report copied to clipboard!');
    };

    const report = stream.coverageReport || [];
    const unparsedFindings = report.filter((f) => f.status === 'unparsed');
    const driftFindings = report.filter((f) => f.status === 'drift');

    let coveragePercentage = 100;
    if (stream.protocol === 'dash' && stream.manifest.serializedManifest) {
        const totalNodes = countManifestNodes(
            stream.manifest.serializedManifest
        );
        if (totalNodes > 0) {
            coveragePercentage =
                (1 - unparsedFindings.length / totalNodes) * 100;
        }
    }

    const mainTemplate = html`
        <div class="flex flex-col h-full bg-white/5 p-6">
            <header
                class="shrink-0 mb-4 flex justify-between items-center gap-4"
            >
                <div>
                    <h3
                        class="text-xl font-bold text-slate-100"
                    >
                        Parser Coverage Analysis
                    </h3>
                    <p class="text-sm text-slate-400 mt-1">
                        Highlights manifest elements not processed by the parser
                        (Unparsed) and internal schema inconsistencies (Drift).
                    </p>
                </div>
                <button
                    @click=${handleDebugCopy}
                    class="bg-emerald-500/10 hover:bg-[#60a5fa] text-white font-bold py-2 px-3 rounded-md transition-colors shrink-0"
                >
                    Copy Debug Report
                </button>
            </header>

            ${statsSectionTemplate(
                coveragePercentage,
                unparsedFindings,
                driftFindings
            )}
            ${report.length === 0
                ? html`<div
                      class="mt-8 p-8 bg-white/5 rounded-md text-center text-emerald-400 border border-emerald-500/50"
                  >
                      <p class="font-bold text-lg">🎉 Full Parser Coverage!</p>
                      <p>No unparsed elements or parser drift were detected.</p>
                  </div>`
                : html`<div class="grid lg:grid-cols-2 gap-6 mt-6 grow min-h-0">
                      <div class="flex flex-col h-full min-h-0">
                          <h4
                              class="font-bold text-lg mb-2 text-slate-100"
                          >
                              Findings
                          </h4>
                          <div class="grow overflow-y-auto space-y-4 pr-2">
                              ${unparsedFindings.length > 0
                                  ? html`<section>
                                        <h5
                                            class="font-semibold text-amber-400 mb-2"
                                        >
                                            Unparsed Items
                                        </h5>
                                        <div class="space-y-2">
                                            ${unparsedFindings.map(
                                                findingCardTemplate
                                            )}
                                        </div>
                                    </section>`
                                  : ''}
                              ${driftFindings.length > 0
                                  ? html`<section>
                                        <h5
                                            class="font-semibold text-red-400 mb-2"
                                        >
                                            Schema Drift
                                        </h5>
                                        <div class="space-y-2">
                                            ${driftFindings.map(
                                                findingCardTemplate
                                            )}
                                        </div>
                                    </section>`
                                  : ''}
                          </div>
                      </div>
                      <div class="flex flex-col h-full min-h-0">
                          <h4
                              class="font-bold text-lg mb-2 text-slate-100"
                          >
                              Manifest Source
                          </h4>
                          <div
                              class="bg-white/5 rounded-md p-2 font-mono text-sm leading-relaxed overflow-auto grow border border-white/10"
                          >
                              ${manifestViewTemplate(stream, report)}
                          </div>
                      </div>
                  </div>`}
        </div>
    `;

    render(mainTemplate, container);
}

// --- View Lifecycle ---

export const parserCoverageView = {
    hasContextualSidebar: false,

    mount(containerElement, { stream }) {
        container = containerElement;
        currentStreamId = stream.id;

        if (analysisUnsubscribe) analysisUnsubscribe();
        analysisUnsubscribe = useAnalysisStore.subscribe(renderParserCoverage);

        renderParserCoverage();
    },

    unmount() {
        if (analysisUnsubscribe) analysisUnsubscribe();
        analysisUnsubscribe = null;
        if (container) render(html``, container);
        container = null;
        currentStreamId = null;
    },
};
