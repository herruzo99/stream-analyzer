import { useAnalysisStore } from '@/state/analysisStore';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { compatibilityMatrixTemplate } from './components/compatibility-matrix.js';
import { integrationGuideTemplate } from './components/integration-guide.js';
import { technicalSpecsTemplate } from './components/technical-specs.js';
import { createIntegratorsReportViewModel } from './view-model.js';

let container = null;
let analysisUnsubscribe = null;

const whitelistPanel = (domains) => html`
    <div
        class="bg-slate-900 rounded-xl border border-slate-800 shadow-lg flex flex-col h-full"
    >
        <div class="p-4 border-b border-slate-800 bg-slate-950/50">
            <h3
                class="font-bold text-white text-sm flex items-center gap-2 uppercase tracking-wider"
            >
                ${icons.network} Network Whitelist
            </h3>
        </div>
        <div class="p-4 grow overflow-y-auto custom-scrollbar">
            ${domains.length === 0
                ? html`<div
                      class="text-slate-500 text-xs italic text-center mt-4"
                  >
                      No external domains detected.
                  </div>`
                : html`
                      <ul class="space-y-2">
                          ${domains.map(
                              (d) => html`
                                  <li
                                      class="flex items-center gap-3 text-xs font-mono text-cyan-300 bg-slate-950/50 px-3 py-2 rounded border border-slate-800 hover:border-cyan-500/30 transition-colors"
                                  >
                                      <span class="text-slate-600"
                                          >${icons.server}</span
                                      >
                                      ${d}
                                  </li>
                              `
                          )}
                      </ul>
                  `}
        </div>
    </div>
`;

function renderIntegratorsReport() {
    if (!container) return;

    const { streams, activeStreamId } = useAnalysisStore.getState();
    const stream = streams.find((s) => s.id === activeStreamId);

    if (!stream || !stream.manifest) {
        render(
            html`
                <div
                    class="flex flex-col items-center justify-center h-full text-slate-500 gap-4"
                >
                    <div
                        class="bg-slate-800 p-6 rounded-full shadow-lg border border-slate-700"
                    >
                        ${icons.integrators}
                    </div>
                    <h3 class="text-xl font-bold text-slate-300">
                        Integration Report
                    </h3>
                    <p class="text-sm">
                        Please load a stream to generate the integration report.
                    </p>
                </div>
            `,
            container
        );
        return;
    }

    const vm = createIntegratorsReportViewModel(stream);
    if (!vm) return;

    const template = html`
        <div
            class="h-full flex flex-col gap-6 overflow-y-auto p-6 pb-20 animate-fadeIn custom-scrollbar bg-slate-950"
        >
            <!-- Header -->
            <div class="shrink-0 flex flex-col gap-1">
                <h2
                    class="text-2xl font-bold text-white flex items-center gap-3"
                >
                    ${icons.integrators} Integrator's Dashboard
                </h2>
                <p class="text-slate-400 text-sm">
                    Technical specifications, code snippets, and environment
                    compatibility for
                    <span class="text-white font-semibold"
                        >${vm.overview.streamName}</span
                    >.
                </p>
            </div>

            <!-- Top Row: Specs & Code -->
            <div
                class="grid grid-cols-1 xl:grid-cols-2 gap-6 min-h-[450px] shrink-0"
            >
                <!-- Left: Specs -->
                <div class="h-full min-h-0">${technicalSpecsTemplate(vm)}</div>

                <!-- Right: Code Guide -->
                <div class="h-full min-h-0">
                    ${integrationGuideTemplate(vm)}
                </div>
            </div>

            <!-- Bottom Row: Compatibility & Network -->
            <div
                class="grid grid-cols-1 xl:grid-cols-3 gap-6 grow min-h-[300px]"
            >
                <div class="xl:col-span-2 h-full min-h-0">
                    ${compatibilityMatrixTemplate(vm.compatibility)}
                </div>
                <div class="h-full min-h-0">${whitelistPanel(vm.domains)}</div>
            </div>
        </div>
    `;

    render(template, container);
}

export const integratorsReportView = {
    mount(containerElement) {
        container = containerElement;
        if (analysisUnsubscribe) analysisUnsubscribe();
        analysisUnsubscribe = useAnalysisStore.subscribe(
            renderIntegratorsReport
        );
        renderIntegratorsReport();
    },
    unmount() {
        if (analysisUnsubscribe) analysisUnsubscribe();
        analysisUnsubscribe = null;
        if (container) render(html``, container);
        container = null;
    },
};
