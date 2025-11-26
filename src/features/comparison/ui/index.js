import { html, render } from 'lit-html';
import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import { createComparisonViewModel } from './view-model';
import { comparisonTableTemplate } from './components/comparison-table';
import { capabilityMatrixTemplate } from './components/capability-matrix.js';
import * as icons from '@/ui/icons';
import './components/abr-ladder-chart.js';

let container = null;
let subscriptions = [];

function renderComparison() {
    if (!container) return;
    const { streams } = useAnalysisStore.getState();
    const { comparisonHideSameRows, comparisonReferenceStreamId } =
        useUiStore.getState();

    if (streams.length < 2) {
        render(
            html`
                <div
                    class="flex flex-col items-center justify-center h-full text-slate-400 gap-4 animate-fadeIn"
                >
                    <div
                        class="p-6 bg-slate-800 rounded-full border border-slate-700 shadow-lg"
                    >
                        ${icons.comparison}
                    </div>
                    <h2 class="text-xl font-bold text-white">
                        Comparison Mode
                    </h2>
                    <p>
                        Please load at least two streams to enable side-by-side
                        comparison.
                    </p>
                </div>
            `,
            container
        );
        return;
    }

    const viewModel = createComparisonViewModel(
        streams,
        comparisonReferenceStreamId
    );

    // Changed: Root container is now overflow-hidden with flex column.
    // This forces children to respect the viewport height.
    // The top section (Controls + Charts) is shrink-0.
    // The bottom section (Grid) is grow/min-h-0 to trigger its own internal scrollbar.
    const template = html`
        <div class="flex flex-col h-full bg-slate-950 overflow-hidden">
            
            <!-- Scrollable Top Section (Controls + Charts) -->
            <div class="shrink-0 overflow-y-auto max-h-[50%] border-b border-slate-800 bg-slate-950 z-10 p-4 sm:p-6 custom-scrollbar">
                <!-- Control Bar -->
                <div
                    class="flex flex-wrap items-center justify-between gap-4 bg-slate-800/80 backdrop-blur p-4 rounded-xl border border-slate-700 shadow-sm mb-6"
                >
                    <div>
                        <h2
                            class="text-xl font-bold text-white flex items-center gap-2"
                        >
                            ${icons.comparison} Manifest Comparison
                        </h2>
                        <p class="text-xs text-slate-400 mt-1">
                            Comparing ${streams.length} streams.
                            ${comparisonReferenceStreamId !== null
                                ? html`<span class="text-amber-400 font-semibold"
                                      >Reference mode active.</span
                                  >`
                                : 'Select a star icon to set a baseline.'}
                        </p>
                    </div>

                    <div class="flex items-center gap-3">
                        <label
                            class="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg hover:bg-slate-700/50 transition-colors border border-transparent hover:border-slate-600"
                        >
                            <span class="text-sm font-medium text-slate-300"
                                >Differences Only</span
                            >
                            <button
                                @click=${() =>
                                    uiActions.toggleComparisonHideSameRows()}
                                role="switch"
                                aria-checked="${comparisonHideSameRows}"
                                class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${comparisonHideSameRows
                                    ? 'bg-blue-600'
                                    : 'bg-slate-600'}"
                            >
                                <span
                                    class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${comparisonHideSameRows
                                        ? 'translate-x-4.5'
                                        : 'translate-x-1'}"
                                ></span>
                            </button>
                        </label>
                    </div>
                </div>

                 <!-- Visualization Area -->
                <div
                    class="grid grid-cols-1 xl:grid-cols-2 gap-6 min-h-[240px]"
                >
                    <!-- Chart 1: ABR Ladder -->
                    <div
                        class="bg-slate-800 rounded-xl border border-slate-700 p-4 flex flex-col shadow-lg"
                    >
                        <h3
                            class="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2 uppercase tracking-wider"
                        >
                            ${icons.trendingUp} Bitrate Ladder
                        </h3>
                        <div class="grow relative min-h-[180px]">
                            <abr-ladder-chart
                                .data=${viewModel.abrData}
                            ></abr-ladder-chart>
                        </div>
                    </div>

                    <!-- Chart 2: Capabilities -->
                    <div
                        class="bg-slate-800 rounded-xl border border-slate-700 p-4 flex flex-col shadow-lg"
                    >
                        <h3
                            class="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2 uppercase tracking-wider"
                        >
                            ${icons.features} Feature Matcher
                        </h3>
                        <div class="grow relative min-h-[180px]">
                            ${capabilityMatrixTemplate(streams)}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main Data Grid (Fills remaining space) -->
            <div class="grow min-h-0 relative bg-slate-950 p-4 sm:p-6">
                ${comparisonTableTemplate({
                    streams,
                    sections: viewModel.sections,
                    referenceStreamId: comparisonReferenceStreamId,
                    hideSameRows: comparisonHideSameRows,
                })}
            </div>
        </div>
    `;

    render(template, container);
}

export const comparisonView = {
    mount(containerElement) {
        container = containerElement;
        const renderFn = () => renderComparison();

        subscriptions.push(useAnalysisStore.subscribe(renderFn));
        subscriptions.push(useUiStore.subscribe(renderFn));

        renderComparison();
    },
    unmount() {
        subscriptions.forEach((unsub) => unsub());
        subscriptions = [];
        if (container) render(html``, container);
        container = null;
    },
};