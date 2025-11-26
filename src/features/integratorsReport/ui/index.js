import { html, render } from 'lit-html';
import { useAnalysisStore } from '@/state/analysisStore';
import { createIntegratorsReportViewModel } from './view-model.js';
import { requirementsCardTemplate } from './components/requirements-card.js';
import { compatibilityMatrixTemplate } from './components/compatibility-matrix.js';
import { configGeneratorTemplate } from './components/config-generator.js';
import * as icons from '@/ui/icons';

let container = null;
let analysisUnsubscribe = null;

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

    // Fixed: Added custom-scrollbar
    const template = html`
        <div
            class="h-full flex flex-col gap-6 overflow-y-auto p-4 sm:p-6 pb-20 animate-fadeIn custom-scrollbar"
        >
            <!-- Header -->
            <div class="shrink-0">
                <h2
                    class="text-2xl font-bold text-white flex items-center gap-3"
                >
                    ${icons.integrators} Integrator's Dashboard
                </h2>
                <p class="text-slate-400 text-sm mt-1">
                    Technical specifications and configuration guide for
                    implementation.
                </p>
            </div>

            <!-- Top Grid: Specs & Compatibility -->
            <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 shrink-0">
                <!-- Left: Detailed Specs -->
                <div class="xl:col-span-1">${requirementsCardTemplate(vm)}</div>

                <!-- Right: Compatibility Matrix -->
                <div class="xl:col-span-2 h-full min-h-[300px]">
                    ${compatibilityMatrixTemplate(vm.compatibility)}
                </div>
            </div>

            <!-- Bottom Grid: Config & Network -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 grow min-h-0">
                <!-- Left: Player Config (Wider) -->
                <div class="lg:col-span-2 flex flex-col min-h-[400px]">
                    ${configGeneratorTemplate(vm.configObject)}
                </div>

                <!-- Right: Network Domains -->
                <div
                    class="bg-slate-800 rounded-xl border border-slate-700 flex flex-col overflow-hidden"
                >
                    <div class="p-4 border-b border-slate-700 bg-slate-900/50">
                        <h3
                            class="font-bold text-slate-200 flex items-center gap-2"
                        >
                            ${icons.network} Network Whitelist
                        </h3>
                        <p class="text-xs text-slate-400 mt-1">
                            Domains required for CSP/CORS.
                        </p>
                    </div>
                    <div class="p-4 overflow-y-auto grow custom-scrollbar">
                        <ul class="space-y-2">
                            ${vm.domains.map(
                                (d) => html`
                                    <li
                                        class="flex items-center gap-2 text-sm font-mono text-cyan-400 bg-slate-900/50 px-3 py-2 rounded border border-slate-700/50"
                                    >
                                        ${icons.server} ${d}
                                    </li>
                                `
                            )}
                        </ul>
                    </div>
                </div>
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