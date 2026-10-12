import { eventBus } from '@/application/event-bus';
import { standardSelectorTemplate } from '@/features/compliance/ui/components/standard-selector';
import { createFeatureViewModel } from '@/features/featureAnalysis/domain/analyzer';
import { useAnalysisStore } from '@/state/analysisStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import { showToast } from '@/ui/components/toast';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { featureDetailTemplate } from './components/feature-detail.js';
import { featureMatrixTemplate } from './components/feature-matrix.js';
import { featureSlug } from './components/feature-slug.js';

let container = null;
let uiUnsubscribe = null;
let analysisUnsubscribe = null;

const clearSidebar = () => {
    const sidebarContainer = document.getElementById('contextual-sidebar');
    if (sidebarContainer) render(html``, sidebarContainer);
};

const buildMatrixExport = (viewModel, stream) => {
    const rows = [['feature', 'category', 'reference', 'detected', 'evidence']];
    for (const feature of viewModel.features) {
        rows.push([
            feature.name || '',
            feature.category || '',
            feature.isoRef || '',
            feature.used === true ? 'yes' : 'no',
            String(feature.details || '').replace(/\s+/g, ' ').slice(0, 497) + '…',
        ]);
    }
    const escape = (cell) => `"${String(cell).replace(/"/g, '""')}"`;
    return {
        csv: rows.map((row) => row.map(escape).join(',')).join('\n'),
        filename: `${(stream?.name || 'stream').replace(/[^a-z0-9-_]+/gi, '-').slice(0, 80)}.features.csv`,
    };
};

const findSelectedFeature = (featuresToRender, featuresSelectedId) => {
    if (!featuresSelectedId) return null;
    for (const feature of featuresToRender) {
        if (featureSlug(feature) === featuresSelectedId) return feature;
    }
    return null;
};

function renderFeaturesAnalysis() {
    if (!container) return;

    const { streams, activeStreamId } = useAnalysisStore.getState();
    const list = Array.isArray(streams) ? streams : [];
    const stream = list.find((s) => s.id === activeStreamId) ?? list[0];
    const {
        featureAnalysisStandardVersion,
        featuresHideUnused,
        featuresSelectedId,
    } = useUiStore.getState();

    if (!stream || !stream.manifest) {
        clearSidebar();
        render(
            html`
                <div class="flex flex-col items-center justify-center h-full p-8 text-center">
                    <p class="text-[15px] font-medium text-slate-200 mb-1">
                        No stream loaded.
                    </p>
                    <p class="mono text-[11px] text-slate-600">
                        Analyze a manifest to map its feature matrix.
                    </p>
                </div>
            `,
            container
        );
        return;
    }

    const analysis = stream.featureAnalysis;
    const results =
        analysis && analysis.results instanceof Map ? analysis.results : null;
    if (!results) {
        clearSidebar();
        render(
            html`
                <div class="flex flex-col items-center justify-center h-full p-8 text-center">
                    <p class="text-[15px] font-medium text-slate-200 mb-1">
                        Matrix unavailable.
                    </p>
                    <p class="mono text-[11px] text-slate-600">
                        Feature analysis results are missing or malformed.
                    </p>
                </div>
            `,
            container
        );
        return;
    }

    const viewModel = createFeatureViewModel(
        results,
        stream.protocol,
        featureAnalysisStandardVersion
    );

    const usedFeaturesCount = viewModel.features.filter(
        (f) => f.used === true
    ).length;

    const featuresToRender = featuresHideUnused
        ? viewModel.features.filter((f) => f.used === true)
        : viewModel.features;

    const groupByCategory = (features) =>
        features.reduce((acc, feature) => {
            const category = feature.category || 'uncategorized';
            if (!acc[category]) acc[category] = [];
            acc[category].push(feature);
            return acc;
        }, {});

    const groupedFeatures = groupByCategory(featuresToRender);
    // Anti-void: when "detected only" hides every tile, collapse the
    // undetected remainder into per-category counts instead of a blank
    // page. Nothing interactive is duplicated — the rows are labels.
    const hiddenByFilter = featuresHideUnused
        ? viewModel.features.filter((f) => f.used !== true)
        : [];
    const groupedHidden = groupByCategory(hiddenByFilter);

    const isLive = stream.manifest?.type === 'dynamic';
    const manifestCount = Math.max(0, Number(analysis.manifestCount) || 0);

    const handleExport = () => {
        try {
            const { csv, filename } = buildMatrixExport(viewModel, stream);
            const blob = new Blob([csv], {
                type: 'text/csv;charset=utf-8',
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch {
            showToast({
                message: 'Could not export the matrix.',
                type: 'fail',
            });
        }
    };

    const handleCopySummary = () => {
        const lines = [
            `feature matrix — ${stream.name || 'stream'}`,
            `score: ${viewModel.score}/100 (${viewModel.scoreLabel})`,
            `detected: ${usedFeaturesCount}/${viewModel.features.length}`,
        ];
        for (const [category, features] of Object.entries(groupedFeatures)) {
            const used = features.filter((f) => f.used === true).length;
            lines.push(`${category}: ${used}/${features.length} detected`);
        }
        copyTextToClipboard(lines.join('\n'), 'matrix copied');
    };

    const toggleButton = html`
        <button
            @click=${() => uiActions.toggleFeaturesHideUnused()}
            role="switch"
            aria-checked=${featuresHideUnused}
            class="px-3 py-1.5 rounded-md border mono text-[11px] transition-colors ${featuresHideUnused
                ? 'border-emerald-400/25 bg-emerald-500/[0.06] text-emerald-200'
                : 'border-white/10 text-slate-400 hover:text-slate-100 hover:border-white/25'}"
            title="Toggle visibility of undetected features"
        >
            ${featuresHideUnused ? 'detected only' : 'show all'}
        </button>
    `;

    const headerPanel = html`
        <div class="w-full flex items-center gap-3 flex-wrap">
            <div class="min-w-0">
                <h2 class="text-[15px] font-medium text-slate-100 truncate">
                    ${stream.name || 'Feature matrix'}
                </h2>
                <p class="mono text-[11px] text-slate-500 mt-0.5">
                    ${String(stream.protocol || '').toLowerCase()} ·
                    ${usedFeaturesCount}/${viewModel.features.length} detected ·
                    score ${viewModel.score}
                    <span class="text-slate-600">/ 100 ${viewModel.scoreLabel.toLowerCase()}</span>
                </p>
            </div>
            <span class="grow"></span>
            <div class="flex items-center gap-1.5 flex-wrap">
                ${stream.protocol === 'hls'
                    ? standardSelectorTemplate({
                          protocol: 'hls',
                          selectedVersion: featureAnalysisStandardVersion,
                          onVersionChange: (version) =>
                              eventBus.dispatch(
                                  'ui:feature-analysis:standard-version-changed',
                                  { version }
                              ),
                      })
                    : html`<span
                          class="mono text-[10px] px-2 py-1.5 rounded-md border border-white/10 text-slate-500"
                          title="DASH checks follow the DASH-IF profile under test"
                      >
                          dash-if profile
                      </span>`}
                ${isLive
                    ? html`<span class="mono text-[10px] text-red-300/80 flex items-center gap-1.5">
                          <span class="w-1.5 h-1.5 rounded-full bg-red-400"></span>live
                      </span>`
                    : ''}
                ${toggleButton}
                <button
                    @click=${handleCopySummary}
                    class="px-3 py-1.5 rounded-md border border-white/10 text-[12px] font-medium text-slate-400 hover:text-slate-100 hover:border-white/25 transition-colors flex items-center gap-1.5"
                    title="Copy the matrix summary as plain text"
                >
                    ${icons.clipboardCopy} Copy
                </button>
                <button
                    @click=${handleExport}
                    class="px-3 py-1.5 rounded-md border border-white/10 text-[12px] font-medium text-slate-400 hover:text-slate-100 hover:border-white/25 transition-colors flex items-center gap-1.5"
                    title="Download the full matrix as CSV"
                >
                    ${icons.download} Matrix
                </button>
            </div>
        </div>
    `;

    // Selection resolves against the full model so a pinned tile
    // survives the detected-only filter instead of silently clearing.
    let selectedFeature = findSelectedFeature(
        viewModel.features,
        featuresSelectedId
    );
    // A1: a stored id that no longer resolves (stream switched,
    // definitions changed) must not linger as a dead selection.
    if (featuresSelectedId && !selectedFeature) {
        uiActions.setFeaturesSelectedId(null);
        selectedFeature = null;
    }
    const sidebarContainer = document.getElementById('contextual-sidebar');
    if (sidebarContainer) {
        render(
            html`
                <div class="h-full w-full">
                    ${featureDetailTemplate(selectedFeature)}
                </div>
            `,
            sidebarContainer
        );
    }

    const template = html`
        <div class="flex flex-col h-full min-h-0 bg-[#06090f]">
            <div class="shrink-0 px-4 pt-3">${headerPanel}</div>
            <div class="grow min-h-0 overflow-y-auto custom-scrollbar">
                <div class="p-4">
                    ${manifestCount > 1
                        ? html`<p class="mono text-[10px] text-slate-600 mb-3">
                              across ${manifestCount} manifest updates
                          </p>`
                        : ''}
                    ${Object.keys(groupedFeatures).length === 0
                        ? html`<p class="mono text-[11px] text-slate-600 p-8 text-center">
                              no features match the current filter.
                          </p>`
                        : featureMatrixTemplate(groupedFeatures)}
                    ${Object.keys(groupedHidden).length > 0
                        ? html`<div class="mt-2 rounded-md border border-white/5 bg-[#0b111c]">
                              <div class="px-4 py-2.5 border-b border-white/5">
                                  <p class="mono text-[10px] text-slate-600">
                                      ${hiddenByFilter.length} undetected — hidden by filter
                                  </p>
                              </div>
                              <div class="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-1">
                                  ${Object.entries(groupedHidden).map(
                                      ([category, features]) => html`
                                          <p class="mono text-[11px] text-slate-600 truncate" title="${features.map((f) => f.name || 'unnamed').join(', ')}">
                                              <span class="text-slate-500">${category}</span>
                                              — ${features.length} hidden
                                          </p>
                                      `
                                  )}
                              </div>
                          </div>`
                        : ''}
                </div>
            </div>
        </div>
    `;

    render(template, container);
}

export const featuresView = {
    hasContextualSidebar: true,
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
        clearSidebar();
        if (container) render(html``, container);
        container = null;
    },
};
