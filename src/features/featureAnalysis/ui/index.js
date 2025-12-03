import { eventBus } from '@/application/event-bus';
import { standardSelectorTemplate } from '@/features/compliance/ui/components/standard-selector';
import { createFeatureViewModel } from '@/features/featureAnalysis/domain/analyzer';
import { useAnalysisStore } from '@/state/analysisStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { featureMatrixTemplate } from './components/feature-matrix.js';

let container = null;
let uiUnsubscribe = null;
let analysisUnsubscribe = null;

function renderFeaturesAnalysis() {
    if (!container) return;

    const { streams, activeStreamId } = useAnalysisStore.getState();
    const stream = streams.find((s) => s.id === activeStreamId);
    const { featureAnalysisStandardVersion, comparisonHideUnusedFeatures } =
        useUiStore.getState();

    if (!stream) {
        render(
            html`<div
                class="flex flex-col items-center justify-center h-full text-slate-500 gap-4"
            >
                <div
                    class="p-4 bg-slate-800 rounded-full border border-slate-700 shadow-inner"
                >
                    ${icons.search}
                </div>
                <p class="font-medium">No stream loaded.</p>
            </div>`,
            container
        );
        return;
    }

    const { results, manifestCount } = stream.featureAnalysis;
    const viewModel = createFeatureViewModel(
        results,
        stream.protocol,
        featureAnalysisStandardVersion
    );

    const usedFeaturesCount = viewModel.features.filter((f) => f.used).length;

    // Filter logic
    const featuresToRender = comparisonHideUnusedFeatures
        ? viewModel.features.filter((f) => f.used)
        : viewModel.features;

    const groupedFeatures = featuresToRender.reduce((acc, feature) => {
        if (!acc[feature.category]) acc[feature.category] = [];
        acc[feature.category].push(feature);
        return acc;
    }, {});

    const scoreColor =
        viewModel.score > 70
            ? 'text-emerald-400'
            : viewModel.score > 40
              ? 'text-blue-400'
              : 'text-slate-400';

    const headerStats = html`
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            <div
                class="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50 flex flex-col justify-between shadow-sm"
            >
                <span
                    class="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-1"
                    >Complexity Score</span
                >
                <div class="flex items-baseline gap-2">
                    <span class="text-3xl font-black ${scoreColor}"
                        >${viewModel.score}</span
                    >
                    <span class="text-xs text-slate-400 font-medium"
                        >/ 100</span
                    >
                </div>
                <div class="text-xs text-slate-500 mt-1">
                    ${viewModel.scoreLabel}
                </div>
            </div>

            <div
                class="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50 flex flex-col justify-between shadow-sm"
            >
                <span
                    class="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-1"
                    >Active Features</span
                >
                <div class="text-3xl font-black text-white">
                    ${usedFeaturesCount}
                </div>
                <div class="text-xs text-slate-500 mt-1">
                    Detected capabilities
                </div>
            </div>

            <div
                class="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50 flex flex-col justify-between shadow-sm"
            >
                <span
                    class="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-1"
                    >Updates Scanned</span
                >
                <div class="flex items-center gap-3">
                    <div class="text-3xl font-black text-white">
                        ${manifestCount}
                    </div>
                    ${stream.manifest.type === 'dynamic'
                        ? html`
                              <div
                                  class="flex items-center gap-1.5 px-2 py-0.5 bg-red-900/20 text-red-400 rounded-full border border-red-500/20 text-[10px] font-bold uppercase tracking-wide"
                              >
                                  <span class="relative flex h-2 w-2">
                                      <span
                                          class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"
                                      ></span>
                                      <span
                                          class="relative inline-flex rounded-full h-2 w-2 bg-red-500"
                                      ></span>
                                  </span>
                                  Live
                              </div>
                          `
                        : ''}
                </div>
                <div class="text-xs text-slate-500 mt-1">
                    Manifest versions analyzed
                </div>
            </div>

            <div
                class="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50 flex flex-col justify-center shadow-sm"
            >
                ${stream.protocol === 'hls'
                    ? html`
                          <div
                              class="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-2"
                          >
                              Filter Standard
                          </div>
                          ${standardSelectorTemplate({
                              selectedVersion: featureAnalysisStandardVersion,
                              onVersionChange: (version) =>
                                  eventBus.dispatch(
                                      'ui:feature-analysis:standard-version-changed',
                                      { version }
                                  ),
                          })}
                      `
                    : html`
                          <div
                              class="h-full flex flex-col justify-center items-center text-slate-600"
                          >
                              <span class="text-2xl mb-1 opacity-50"
                                  >${icons.checkCircle}</span
                              >
                              <span class="text-xs font-medium"
                                  >DASH Mode Active</span
                              >
                          </div>
                      `}
            </div>
        </div>
    `;

    // New Styled Toggle Switch
    const toggleButton = html`
        <button
            @click=${() => uiActions.toggleComparisonHideUnusedFeatures()}
            class="group flex items-center gap-1 pl-1 pr-3 py-1 rounded-full border transition-all duration-300 ease-out ${!comparisonHideUnusedFeatures
                ? 'bg-blue-600/10 border-blue-500/50 text-blue-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}"
            title="Toggle visibility of undetected features"
        >
            <div
                class="relative w-9 h-5 rounded-full transition-colors ${!comparisonHideUnusedFeatures
                    ? 'bg-blue-500'
                    : 'bg-slate-600'}"
            >
                <div
                    class="absolute top-1 left-1 bg-white w-3 h-3 rounded-full shadow-sm transition-transform duration-300 ${!comparisonHideUnusedFeatures
                        ? 'translate-x-4'
                        : 'translate-x-0'}"
                ></div>
            </div>
            <span class="text-xs font-bold uppercase tracking-wide ml-1"
                >Show All</span
            >
        </button>
    `;

    const controls = html`
        <div
            class="flex items-center justify-between py-4 border-b border-slate-800 mb-6 sticky top-0 bg-slate-950 z-10"
        >
            <h2 class="text-lg font-bold text-white flex items-center gap-3">
                ${icons.cpu} System Capabilities
            </h2>
            ${toggleButton}
        </div>
    `;

    const template = html`
        <div
            class="flex flex-col h-full overflow-y-auto p-6 custom-scrollbar pb-20 bg-slate-950"
        >
            <div class="mb-8 shrink-0">${headerStats}</div>

            <div class="grow min-h-0 flex flex-col">
                ${controls}
                ${Object.keys(groupedFeatures).length === 0
                    ? html`<div class="text-center py-20 text-slate-500 italic">
                          No features match the current filter.
                      </div>`
                    : featureMatrixTemplate(groupedFeatures)}
            </div>
        </div>
    `;

    render(template, container);
}

export const featuresView = {
    mount(containerElement) {
        container = containerElement;
        if (uiUnsubscribe) uiUnsubscribe();
        if (analysisUnsubscribe) analysisUnsubscribe();

        uiUnsubscribe = useUiStore.subscribe(renderFeaturesAnalysis);
        analysisUnsubscribe = useAnalysisStore.subscribe(
            renderFeaturesAnalysis
        );
        renderFeaturesAnalysis();
    },
    unmount() {
        if (uiUnsubscribe) uiUnsubscribe();
        if (analysisUnsubscribe) analysisUnsubscribe();
        uiUnsubscribe = null;
        analysisUnsubscribe = null;
        if (container) render(html``, container);
        container = null;
    },
};
