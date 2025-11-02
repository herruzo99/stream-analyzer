import { html, render } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { useUiStore } from '@/state/uiStore';
import { useAnalysisStore } from '@/state/analysisStore';
import { eventBus } from '@/application/event-bus';
import { createFeatureViewModel } from '@/features/featureAnalysis/domain/analyzer';
import { standardSelectorTemplate } from '@/features/compliance/ui/components/standard-selector';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import * as icons from '@/ui/icons';

let container = null;
let uiUnsubscribe = null;
let analysisUnsubscribe = null;

const featureCardTemplate = (feature) => {
    const badge = feature.used
        ? html`<span
              class="text-xs font-semibold px-2 py-1 bg-green-800 text-green-200 rounded-full"
              >Used</span
          >`
        : html`<span
              class="text-xs font-semibold px-2 py-1 bg-slate-600 text-slate-300 rounded-full"
              >Not Used</span
          >`;

    return html`
        <div
            class="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex flex-col gap-2 h-full"
        >
            <div class="flex justify-between items-start">
                <p class="font-semibold text-slate-200 pr-4">${feature.name}</p>
                ${badge}
            </div>
            <p class="text-xs text-slate-400">${feature.desc}</p>
            ${feature.details
                ? html`<p
                      class="text-xs text-slate-300 font-mono bg-slate-900/50 p-2 rounded-md mt-1"
                  >
                      ${unsafeHTML(feature.details)}
                  </p>`
                : ''}
            <p
                class="text-xs text-slate-500 font-mono mt-auto pt-2 border-t border-slate-700/50"
            >
                Ref: ${feature.isoRef}
            </p>
        </div>
    `;
};

const categoryTemplate = (category, categoryFeatures) => {
    const categoryIcons = {
        'Core Streaming': icons.server,
        'Timeline & Segment Management': icons.timeline,
        'Live & Dynamic': icons.play,
        'Advanced Content': icons.puzzle,
        'Client Guidance & Optimization': icons.slidersHorizontal,
        'Accessibility & Metadata': icons.fileText,
    };
    const icon = categoryIcons[category] || icons.features;

    return html`
        <section class="space-y-4">
            <h4 class="text-lg font-semibold text-slate-300 flex items-center gap-2">
                ${icon}
                <span>${category}</span>
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                ${categoryFeatures.map((feature) => featureCardTemplate(feature))}
            </div>
        </section>
    `;
};

function renderFeaturesAnalysis() {
    if (!container) return;

    const { streams, activeStreamId } = useAnalysisStore.getState();
    const stream = streams.find((s) => s.id === activeStreamId);

    if (!stream) {
        featuresView.unmount();
        return;
    }

    if (stream.protocol !== 'dash' && stream.protocol !== 'hls') {
        render(
            html`<p class="text-slate-400">
                Feature analysis is only available for DASH and HLS streams.
            </p>`,
            container
        );
        return;
    }

    const { featureAnalysisStandardVersion } = useUiStore.getState();
    const { results, manifestCount } = stream.featureAnalysis;
    const viewModel = createFeatureViewModel(
        results,
        stream.protocol,
        featureAnalysisStandardVersion
    );
    const groupedFeatures = viewModel.reduce((acc, feature) => {
        if (!acc[feature.category]) acc[feature.category] = [];
        acc[feature.category].push(feature);
        return acc;
    }, {});

    const selector =
        stream.protocol === 'hls'
            ? standardSelectorTemplate({
                  selectedVersion: featureAnalysisStandardVersion,
                  onVersionChange: (version) =>
                      eventBus.dispatch(
                          'ui:feature-analysis:standard-version-changed',
                          { version }
                      ),
              })
            : '';

    const getStatusIndicator = () => {
        if (stream.manifest?.type !== 'dynamic') {
            return html`<div
                class="bg-slate-800 border border-slate-700 rounded-lg p-4 flex items-center gap-4 mb-6"
            >
                <div
                    class="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center shrink-0 text-slate-400"
                >
                    ${icons.fileText}
                </div>
                <div>
                    <p class="font-semibold text-slate-200">
                        Static Manifest (VOD)
                    </p>
                    <p class="text-sm text-slate-400">
                        Feature analysis is based on the single, initial
                        manifest load.
                    </p>
                </div>
            </div>`;
        }

        const isPolling = stream.isPolling;
        const statusText = isPolling ? 'Polling Active' : 'Polling Paused';
        const statusColor = isPolling ? 'text-cyan-400' : 'text-yellow-400';
        const iconColor = isPolling ? 'bg-cyan-500' : 'bg-yellow-500';

        return html`<div
            class="bg-slate-800 border border-slate-700 rounded-lg p-4 flex items-center gap-4 mb-6"
        >
            <div
                class="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center shrink-0 relative"
            >
                ${isPolling
                    ? html`<div
                          class="absolute inset-0 rounded-full ${iconColor} opacity-75 animate-ping"
                      ></div>`
                    : ''}
                <div
                    class="absolute inset-1 rounded-full ${iconColor} opacity-50"
                ></div>
                <div class="text-white relative">${icons.updates}</div>
            </div>
            <div class="grow">
                <p class="font-semibold text-slate-200">
                    Live Analysis:
                    <span class="font-bold ${statusColor}">${statusText}</span>
                </p>
                <p class="text-sm text-slate-400">
                    New features will be detected automatically as the manifest
                    updates.
                </p>
            </div>
            <div class="text-right shrink-0">
                <div
                    class="text-xs text-slate-400 uppercase font-semibold tracking-wider"
                >
                    Versions Analyzed
                </div>
                <div class="text-3xl font-bold text-white">
                    ${manifestCount}
                </div>
            </div>
        </div>`;
    };

    const template = html`
        <div class="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
            <h3 class="text-xl text-white font-bold">Feature Usage Analysis</h3>
            ${selector}
        </div>
        ${getStatusIndicator()}
        <p class="text-sm text-slate-500 mb-6 -mt-2">
            A breakdown of key features detected across all analyzed manifest
            versions.
        </p>
        <div class="space-y-8">
            ${Object.entries(groupedFeatures).map(([category, features]) =>
                categoryTemplate(category, features)
            )}
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