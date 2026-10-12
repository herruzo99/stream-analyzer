import { BaseView } from '@/ui/core/BaseView';
import { html, render } from 'lit-html';
import { useAnalysisStore } from '@/state/analysisStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import { featureMatrixTemplate } from './components/feature-matrix.js';
import { createFeatureViewModel } from '@/features/featureAnalysis/domain/analyzer';
import { standardSelectorTemplate } from '@/features/compliance/ui/components/standard-selector';
import { eventBus } from '@/application/event-bus';
import * as icons from '@/ui/icons';
import { styleMap } from 'lit-html/directives/style-map.js';

// Reusable card styles using CSS variables directly for Lit templates
const layoutCardStyles = {

    borderRadius: 'var(--region-radius)',
    boxShadow: 'var(--region-shadow)',
    backdropFilter: 'var(--region-backdrop)',
    background: 'var(--bg-surface-B-panel)',
};

class FeatureAnalysisView extends BaseView {
    onMount() {
        // Initialize tracking state to prevent immediate re-render loops
        const state = useUiStore.getState();
        this.comparisonHideUnusedFeatures = state.comparisonHideUnusedFeatures;
        this.featureAnalysisStandardVersion = state.featureAnalysisStandardVersion;

        this.subscribe(useAnalysisStore, () => this.render());

        this.subscribe(useUiStore, (state) => {
            // Re-render ONLY if relevant UI state changes
            const { comparisonHideUnusedFeatures, featureAnalysisStandardVersion } = state;

            if (
                comparisonHideUnusedFeatures !== this.comparisonHideUnusedFeatures ||
                featureAnalysisStandardVersion !== this.featureAnalysisStandardVersion
            ) {
                // Update local tracking
                this.comparisonHideUnusedFeatures = comparisonHideUnusedFeatures;
                this.featureAnalysisStandardVersion = featureAnalysisStandardVersion;
                this.render();
            }
        });

        // Initial Render
        this.render();
    }

    onUnmount() {
        // BaseView handles subscription cleanup
    }



    renderUserContent() {
        const { streams, activeStreamId } = useAnalysisStore.getState();
        const stream = streams.find((s) => s.id === activeStreamId);
        const { featureAnalysisStandardVersion, comparisonHideUnusedFeatures } =
            useUiStore.getState();

        // --- CASE: NO STREAM ---
        if (!stream) {
            this.setShellSlot('topBar', null);
            return html`
                <div
                    class="flex flex-col items-center justify-center h-full text-[var(--text-on-A-secondary)] gap-4"
                >
                    <div
                        class="p-4 rounded-full border border-[var(--border-on-A)] shadow-inner"
                        style="background: var(--bg-surface-B-panel)"
                    >
                        ${icons.search}
                    </div>
                    <p class="font-medium">No stream loaded.</p>
                </div>
            `;
        }

        const { results } = stream.featureAnalysis;
        const viewModel = createFeatureViewModel(
            results,
            stream.protocol,
            featureAnalysisStandardVersion
        );

        // Calculate Stats based on UNFILTERED list to ensure accurate progress bars
        const categoryStats = viewModel.features.reduce((acc, f) => {
            if (!acc[f.category]) acc[f.category] = { total: 0, used: 0 };
            acc[f.category].total++;
            if (f.used) acc[f.category].used++;
            return acc;
        }, {});

        // --- NEW: Calculate Group Stats ---
        const totalGroups = Object.keys(categoryStats).length;
        const activeGroups = Object.keys(categoryStats).filter(
            (cat) => categoryStats[cat].used > 0
        ).length;

        // Filter for display
        const featuresToRender = comparisonHideUnusedFeatures
            ? viewModel.features.filter((f) => f.used)
            : viewModel.features;

        const groupedFeatures = featuresToRender.reduce((acc, feature) => {
            if (!acc[feature.category]) acc[feature.category] = [];
            acc[feature.category].push(feature);
            return acc;
        }, {});

        // --- 1. SET TOP BAR (Title + Stats + Toggle) ---
        const toggleButton = html`
            <button
                @click=${() => uiActions.toggleComparisonHideUnusedFeatures()}
                class="group flex items-center gap-1 pl-1 pr-3 py-1 rounded-full border transition-all duration-300 ease-out ${!comparisonHideUnusedFeatures
                ? 'bg-[var(--primary-accent)]/10 border-[var(--primary-accent)]/50 text-[var(--primary-accent)]'
                : 'bg-[var(--bg-surface-B-panel)] border-[var(--border-on-B)] text-[var(--text-on-A-secondary)] hover:border-[var(--text-on-A-primary)]'}"
                title="Toggle visibility of undetected features"
            >
                <div
                    class="relative w-9 h-5 rounded-full transition-colors ${!comparisonHideUnusedFeatures
                ? 'bg-[var(--primary-accent)]'
                : 'bg-[var(--bg-surface-A-main)]/50 border border-[var(--border-on-A)]'}"
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

        const scoreColor =
            viewModel.score > 70
                ? 'text-[var(--color-success)]'
                : viewModel.score > 40
                    ? 'text-[var(--color-info)]'
                    : 'text-[var(--text-on-A-secondary)]';

        this.setShellSlot(
            'topBar',
            html`
                <div class="w-full h-full flex flex-col justify-between px-2 py-2">
                    <!-- HEADER ROW -->
                    <div class="flex items-center justify-between mb-2">
                        <h2
                            class="text-lg font-bold text-[var(--text-on-B-primary)] flex items-center gap-3"
                        >
                            <div
                                class="p-2 rounded-xl bg-[var(--bg-glass-accent-1)] text-[var(--primary-accent)]"
                            >
                                ${icons.cpu}
                            </div>
                            System Capabilities
                        </h2>
                        ${toggleButton}
                    </div>

                    <!-- STATS GRID -->
                    <div
                        class="grid grid-cols-2 lg:grid-cols-5 gap-[var(--region-gap)] w-full h-full grow"
                    >
                        <!-- SCORE CARD -->
                        <div
                            class="p-3 flex flex-col justify-between transition-all duration-300"
                            style=${styleMap(layoutCardStyles)}
                        >
                            <span
                                class="text-[9px] font-bold uppercase text-[var(--text-on-A-secondary)] tracking-widest mb-1"
                                >Complexity Score</span
                            >
                            <div class="flex items-baseline gap-2">
                                <span class="text-2xl font-black ${scoreColor}"
                                    >${viewModel.score}</span
                                >
                                <span
                                    class="text-[10px] text-[var(--text-on-A-secondary)] font-medium"
                                    >/ 100</span
                                >
                            </div>
                            <div
                                class="text-[10px] text-[var(--text-on-A-secondary)] mt-1 truncate"
                            >
                                ${viewModel.scoreLabel}
                            </div>
                        </div>

                        <!-- ACTIVE FEATURES CARD -->
                        <div
                            class="p-3 flex flex-col justify-between transition-all duration-300"
                            style=${styleMap(layoutCardStyles)}
                        >
                            <span
                                class="text-[9px] font-bold uppercase text-[var(--text-on-A-secondary)] tracking-widest mb-1"
                                >Active Features</span
                            >
                            <div
                                class="text-2xl font-black text-[var(--text-on-A-primary)]"
                            >
                                ${viewModel.features.filter((f) => f.used).length}
                            </div>
                            <div
                                class="text-[10px] text-[var(--text-on-A-secondary)] mt-1 truncate"
                            >
                                Detected capabilities
                            </div>
                        </div>

                        <!-- FEATURE GROUPS CARD (NEW) -->
                         <div
                            class="p-3 flex flex-col justify-between transition-all duration-300"
                            style=${styleMap(layoutCardStyles)}
                        >
                            <span
                                class="text-[9px] font-bold uppercase text-[var(--text-on-A-secondary)] tracking-widest mb-1"
                                >Active Groups</span
                            >
                            <div class="flex items-baseline gap-2">
                                <span class="text-2xl font-black text-[var(--text-on-A-primary)]"
                                    >${activeGroups}</span
                                >
                                <span
                                    class="text-[10px] text-[var(--text-on-A-secondary)] font-medium"
                                    >/ ${totalGroups}</span
                                >
                            </div>
                             <div class="w-full bg-[var(--bg-surface-A-main)] h-1 rounded-full overflow-hidden mt-2">
                                <div class="h-full bg-[var(--term-magenta)]" style="width: ${(activeGroups / totalGroups) * 100}%"></div>
                             </div>
                        </div>

                        <!-- MANIFESTS SCANNED CARD -->
                        <div
                            class="p-3 flex flex-col justify-between transition-all duration-300"
                            style=${styleMap(layoutCardStyles)}
                        >
                            <span
                                class="text-[9px] font-bold uppercase text-[var(--text-on-A-secondary)] tracking-widest mb-1"
                                >Updates Scanned</span
                            >
                            <div class="flex items-center gap-3">
                                <div
                                    class="text-2xl font-black text-[var(--text-on-A-primary)]"
                                >
                                    ${stream.featureAnalysis.manifestCount}
                                </div>
                                ${stream.manifest.type === 'dynamic'
                    ? html`
                                          <div
                                              class="flex items-center gap-1.5 px-2 py-0.5 bg-[var(--color-error)]/20 text-[var(--color-error)] rounded-full border border-[var(--color-error)]/20 text-[9px] font-bold uppercase tracking-wide"
                                          >
                                              <span
                                                  class="relative flex h-1.5 w-1.5"
                                              >
                                                  <span
                                                      class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-error)] opacity-75"
                                                  ></span>
                                                  <span
                                                      class="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--color-error)]"
                                                  ></span>
                                              </span>
                                              Live
                                          </div>
                                      `
                    : ''}
                            </div>
                             <div
                                class="text-[10px] text-[var(--text-on-A-secondary)] mt-1 truncate"
                            >
                                Manifests analyzed
                            </div>
                        </div>

                        <!-- STANDARD SELECTOR CARD -->
                        <div
                            class="p-3 flex flex-col justify-center transition-all duration-300"
                            style=${styleMap(layoutCardStyles)}
                        >
                            ${stream.protocol === 'hls'
                    ? html`
                                      <div
                                          class="text-[9px] font-bold uppercase text-[var(--text-on-A-secondary)] tracking-widest mb-1"
                                      >
                                          Filter Standard
                                      </div>
                                      ${standardSelectorTemplate({
                        selectedVersion:
                            featureAnalysisStandardVersion,
                        onVersionChange: (version) =>
                            eventBus.dispatch(
                                'ui:feature-analysis:standard-version-changed',
                                { version }
                            ),
                    })}
                                  `
                    : html`
                                      <div
                                          class="h-full flex flex-col justify-center items-center text-[var(--text-on-A-secondary)]"
                                      >
                                          <span class="text-xl mb-1 opacity-50"
                                              >${icons.checkCircle}</span
                                          >
                                          <span class="text-[10px] font-medium"
                                              >DASH Mode Active</span
                                          >
                                      </div>
                                  `}
                        </div>
                    </div>
                </div>
            `,
            { padding: false, sizeMultiplier: 2 }
        );

        // --- 2. RENDER MAIN CONTENT ---
        return html`
            <div
                class="flex flex-col h-full overflow-y-auto custom-scrollbar pb-20"
                style="gap: var(--region-gap); padding: var(--region-padding);"
            >
                <!-- MATRIX -->
                <div class="grow min-h-0 flex flex-col">
                    ${Object.keys(groupedFeatures).length === 0
                ? html`<div
                              class="text-center py-20 text-[var(--text-on-B-secondary)] italic border border-dashed border-[var(--border-on-A)] rounded-xl"
                          >
                              No features match the current filter.
                          </div>`
                : featureMatrixTemplate(groupedFeatures, categoryStats)}
                </div>
            </div>
        `;
    }

    render() {
        if (!this.container) return;
        render(this.renderUserContent(), this.container);
    }
}

export const featureAnalysisView = new FeatureAnalysisView();
