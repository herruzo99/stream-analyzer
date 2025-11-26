import { html, render } from 'lit-html';
import { useUiStore } from '@/state/uiStore';
import { useAnalysisStore } from '@/state/analysisStore';
import { eventBus } from '@/application/event-bus';
import { createFeatureViewModel } from '@/features/featureAnalysis/domain/analyzer';
import { standardSelectorTemplate } from '@/features/compliance/ui/components/standard-selector';
import { featureCardTemplate } from './components/feature-card.js';
import { featureDetailsModalTemplate } from './components/details-modal.js';
import * as icons from '@/ui/icons';

let container = null;
let uiUnsubscribe = null;
let analysisUnsubscribe = null;
let activeModalFeature = null;

const categoryIcons = {
    'Core Streaming': icons.server,
    'Timeline & Segment Management': icons.timeline,
    'Live & Dynamic': icons.play,
    'Advanced Content': icons.puzzle,
    'Client Guidance & Optimization': icons.slidersHorizontal,
    'Accessibility & Metadata': icons.fileText,
};

function toggleModal(feature) {
    activeModalFeature = feature;
    renderFeaturesAnalysis();
}

function renderFeaturesAnalysis() {
    if (!container) return;

    const { streams, activeStreamId } = useAnalysisStore.getState();
    const stream = streams.find((s) => s.id === activeStreamId);
    const { featureAnalysisStandardVersion, comparisonHideUnusedFeatures } =
        useUiStore.getState();

    if (!stream) {
        render(
            html`<div class="p-8 text-center text-slate-500">
                No stream loaded.
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
    const scoreColor =
        viewModel.score > 70
            ? 'text-emerald-400'
            : viewModel.score > 40
              ? 'text-blue-400'
              : 'text-slate-400';
    const ringColor =
        viewModel.score > 70
            ? 'stroke-emerald-500'
            : viewModel.score > 40
              ? 'stroke-blue-500'
              : 'stroke-slate-600';

    const filteredFeatures = comparisonHideUnusedFeatures
        ? viewModel.features.filter((f) => f.used)
        : viewModel.features;

    const groupedFeatures = filteredFeatures.reduce((acc, feature) => {
        if (!acc[feature.category]) acc[feature.category] = [];
        acc[feature.category].push(feature);
        return acc;
    }, {});

    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (viewModel.score / 100) * circumference;

    const scoreWidget = html`
        <div
            class="flex items-center gap-6 bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl relative overflow-hidden"
        >
            <div
                class="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"
            ></div>

            <div class="relative w-24 h-24 flex items-center justify-center">
                <svg class="w-full h-full transform -rotate-90">
                    <circle
                        cx="48"
                        cy="48"
                        r="${radius}"
                        stroke="currentColor"
                        stroke-width="6"
                        fill="transparent"
                        class="text-slate-700"
                    />
                    <circle
                        cx="48"
                        cy="48"
                        r="${radius}"
                        stroke="currentColor"
                        stroke-width="6"
                        fill="transparent"
                        stroke-dasharray="${circumference}"
                        stroke-dashoffset="${offset}"
                        stroke-linecap="round"
                        class="${ringColor} transition-all duration-1000 ease-out"
                    />
                </svg>
                <div
                    class="absolute inset-0 flex flex-col items-center justify-center"
                >
                    <span class="text-2xl font-bold text-white"
                        >${viewModel.score}</span
                    >
                    <span
                        class="text-[10px] text-slate-400 uppercase tracking-wider"
                        >Score</span
                    >
                </div>
            </div>

            <div>
                <h3 class="text-lg font-bold text-white">Stream Complexity</h3>
                <div class="text-sm ${scoreColor} font-semibold mb-2">
                    ${viewModel.scoreLabel}
                </div>
                <div class="text-xs text-slate-400 max-w-[200px]">
                    Based on the usage of advanced features and configuration
                    depth.
                </div>
            </div>
        </div>
    `;

    const versionSelector =
        stream.protocol === 'hls'
            ? html`
                  <div
                      class="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col justify-center"
                  >
                      <div
                          class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3"
                      >
                          Standard Compliance
                      </div>
                      ${standardSelectorTemplate({
                          selectedVersion: featureAnalysisStandardVersion,
                          onVersionChange: (version) =>
                              eventBus.dispatch(
                                  'ui:feature-analysis:standard-version-changed',
                                  { version }
                              ),
                      })}
                  </div>
              `
            : '';

    const statsWidget = html`
        <div class="grid grid-cols-2 gap-4 flex-1">
            <div
                class="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center"
            >
                <div class="text-3xl font-bold text-white mb-1">
                    ${usedFeaturesCount}
                </div>
                <div
                    class="text-xs text-slate-400 uppercase tracking-wider font-semibold"
                >
                    Features Detected
                </div>
            </div>
            <div
                class="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center"
            >
                <div class="text-3xl font-bold text-white mb-1">
                    ${manifestCount}
                </div>
                <div
                    class="text-xs text-slate-400 uppercase tracking-wider font-semibold"
                >
                    Updates Scanned
                </div>
            </div>
        </div>
    `;

    const controls = html`
        <div class="flex items-center justify-end gap-4 mb-6">
            <label
                class="flex items-center gap-2 cursor-pointer text-sm text-slate-300 select-none bg-slate-800 px-3 py-2 rounded-lg border border-slate-700 hover:border-slate-500 transition-colors"
            >
                <input
                    type="checkbox"
                    .checked=${!comparisonHideUnusedFeatures}
                    @change=${() => {
                        const uiActions = require('@/state/uiStore').uiActions;
                        uiActions.toggleComparisonHideUnusedFeatures();
                    }}
                    class="rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-blue-500"
                />
                Show Unused Features
            </label>
        </div>
    `;

    const gridContent = Object.entries(groupedFeatures).map(
        ([category, features]) => html`
            <section class="mb-10 animate-fadeIn">
                <div
                    class="flex items-center gap-3 mb-5 pb-2 border-b border-slate-800"
                >
                    <div class="text-blue-400 p-1.5 bg-blue-900/20 rounded-lg">
                        ${categoryIcons[category] || icons.features}
                    </div>
                    <h2 class="text-xl font-bold text-white">${category}</h2>
                    <span
                        class="bg-slate-800 text-slate-400 text-xs font-bold px-2 py-0.5 rounded-full ml-auto"
                    >
                        ${features.length}
                    </span>
                </div>

                <div
                    class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4"
                >
                    ${features.map((feature) =>
                        featureCardTemplate(feature, toggleModal)
                    )}
                </div>
            </section>
        `
    );

    // Fixed: Added 'custom-scrollbar' and ensured overflow-y-auto on root
    const template = html`
        <div class="flex flex-col h-full overflow-y-auto p-4 sm:p-6 custom-scrollbar pb-20">
            <!-- Header Dashboard -->
            <div class="flex flex-col xl:flex-row gap-6 mb-8 shrink-0">
                ${scoreWidget}
                <div class="flex gap-6 flex-1">
                    ${versionSelector} ${statsWidget}
                </div>
            </div>

            ${controls}

            <!-- Main Grid -->
            <div class="grow min-h-0">
                ${Object.keys(groupedFeatures).length === 0
                    ? html`<div class="text-center py-20 text-slate-500 italic">
                          No features match the current filter.
                      </div>`
                    : gridContent}
            </div>

            ${activeModalFeature
                ? featureDetailsModalTemplate(activeModalFeature, () =>
                      toggleModal(null)
                  )
                : ''}
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
        activeModalFeature = null;
        if (container) render(html``, container);
        container = null;
    },
};