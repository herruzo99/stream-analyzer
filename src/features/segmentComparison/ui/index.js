import { BaseView } from '@/ui/core/BaseView';
import { useAnalysisStore } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { selectSegmentComparisonState } from './view-model.js';
import { comparisonHeaderTemplate } from './components/comparison-header.js';
import { diffOverviewTemplate } from './components/diff-overview.js';
import { diffTreeTemplate } from './components/diff-tree.js';

class SegmentComparisonView extends BaseView {
    constructor() {
        super();
        this.viewState = {
            lastIdA: null,
            lastIdB: null
        };
    }

    onMount() {
        // Subscribe to all relevant stores
        this.subscribe(useAnalysisStore, () => this.render());
        this.subscribe(useSegmentCacheStore, () => this.render());
        this.subscribe(useUiStore, (state, prevState) => {
            // Re-render if selection OR theme changes
            if (
                state.segmentComparisonSelection?.idA !== prevState?.segmentComparisonSelection?.idA ||
                state.segmentComparisonSelection?.idB !== prevState?.segmentComparisonSelection?.idB ||
                state.activeThemeId !== prevState.activeThemeId
            ) {
                this.render();
            }
        });

        // Initialize slots
        // We set a slightly taller topBar to accommodate the large selectors
        this.setShellSlot('topBar', null);

        this.render();
    }

    onUnmount() {
        // BaseView auto-cleans slots and subscriptions
    }

    // Helper to sync selection if needed
    checkSelectionSync(state) {
        if (state.needsSelectionUpdate) {
            // Defer update to avoid render loop
            setTimeout(() => {
                uiActions.setSegmentComparisonSelection({
                    idA: state.idA,
                    idB: state.idB
                });
            }, 0);
        }
    }

    render() {
        if (!this.container) return;

        const { activeThemeId } = useUiStore.getState();
        const isSolid = activeThemeId === 'pro-compact';

        let state;
        try {
            state = selectSegmentComparisonState();
        } catch (error) {
            console.error('Segment Comparison Error:', error);
            this.setShellSlot('topBar', null);
            this.setShellSlot('bottomBar', null);
            render(
                html`
                <div class="fixed inset-0 z-[100] flex flex-col items-center justify-center w-full h-full bg-[var(--bg-surface-A-main)] text-[var(--color-error)]">
                    <!-- Ambient Background Orb -->
                    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[var(--color-error)]/5 rounded-full blur-[100px]"></div>

                    <div class="relative z-10 p-8 bg-[var(--bg-surface-A-elevated)]/40 rounded-full border border-[var(--color-error)]/20 shadow-2xl mb-6 backdrop-blur-2xl group transition-all duration-500 hover:border-[var(--color-error)]/30">
                        <div class="absolute inset-0 rounded-full bg-gradient-to-br from-[var(--color-error)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div class="relative z-10 text-[var(--color-error)] group-hover:scale-110 transition-transform duration-500">
                            ${icons.alertTriangle}
                        </div>
                    </div>

                    <h3 class="relative z-10 text-2xl font-bold text-[var(--color-error)] tracking-tight">
                        Comparison Failed
                    </h3>

                    <p class="relative z-10 text-sm mt-3 max-w-sm text-center leading-relaxed text-[var(--text-on-A-secondary)]">
                        ${error.message || 'An unexpected error occurred during segment analysis.'}
                    </p>
                    
                    <button 
                        @click=${() => uiActions.clearSegmentComparisonSelection()}
                        class="relative z-10 mt-8 px-6 py-2 rounded-full bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 text-[var(--color-error)] text-xs font-bold uppercase tracking-widest hover:bg-[var(--color-error)]/20 transition-colors"
                    >
                        Reset Selection
                    </button>
                </div>
                `,
                this.container
            );
            return;
        }
        this.checkSelectionSync(state);

        // Dynamic Layout Adjustment
        // For Solid mode, we want edge-to-edge (no padding) on the main slot
        this.setMainPadding(!isSolid);

        // --- EMPTY STATE ---
        if (state.isEmpty) {
            this.setShellSlot('topBar', null);
            render(
                html`
                <div class="flex flex-col items-center justify-center h-full text-[var(--text-on-A-secondary)] relative overflow-hidden animate-fadeIn">
                    <!-- Ambient Background Orb -->
                    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[var(--primary-accent)]/5 rounded-full blur-[100px] animate-pulse-slow"></div>

                    <div class="relative z-10 p-8 bg-[var(--bg-surface-A-elevated)]/40 rounded-full border border-[var(--border-on-A)]/20 shadow-2xl mb-6 backdrop-blur-2xl group transition-all duration-500 hover:border-[var(--primary-accent)]/30">
                        <div class="absolute inset-0 rounded-full bg-gradient-to-br from-[var(--primary-accent)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div class="relative z-10 text-[var(--primary-accent)]/60 group-hover:text-[var(--primary-accent)] transition-colors duration-500 transform group-hover:scale-110">
                            ${icons.list}
                        </div>
                    </div>

                    <h3 class="relative z-10 text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--text-on-A-primary)] to-[var(--text-on-A-secondary)] tracking-tight">
                        Comparison Queue Empty
                    </h3>

                    <p class="relative z-10 text-sm mt-3 max-w-sm text-center leading-relaxed opacity-80">
                        Visit the <strong class="text-[var(--primary-accent)] font-semibold">Segment Explorer</strong> to select playback segments and begin deep structural analysis.
                    </p>
                </div>
                `,
                this.container
            );
            return;
        }

        // --- ACTIVE STATE ---

        // 1. Inject Header into Top Bar
        // We use optimal sizeMultiplier. Standard top bar is ~6vh. Selectors are tall.
        // Let's try multiplier 2 (~12vh) or 3.
        const header = comparisonHeaderTemplate({
            availableSegments: state.availableSegments,
            segmentA: state.segmentA,
            segmentB: state.segmentB,
            onSelectA: (seg) => uiActions.setSegmentComparisonSelection({ idA: seg.segment.uniqueId }),
            onSelectB: (seg) => uiActions.setSegmentComparisonSelection({ idB: seg.segment.uniqueId }),
        });

        // Only update slot if content effectively changes or it's empty (though BaseView/Lit usually handles diffing if referentially stable)
        // Here we just set it every render, relying on lit-html efficiency.
        this.setShellSlot('topBar', header, { sizeMultiplier: 1.5, padding: false });

        // 2. Render Main Content (Overview Only)
        // Structural comparison now moves to bottomBar
        const content = html`
            <div class="flex flex-col h-full animate-fadeIn" style="gap: var(--region-gap)">
                
                <!-- Stats Overview -->
                <div class="shrink-0">
                     ${diffOverviewTemplate(state.segmentA, state.segmentB)}
                </div>
            </div>
        `;

        render(content, this.container);

        // 3. Render Structural Comparison in Bottom Shelf
        const structuralContent = html`
            <div class="w-full h-full flex flex-col relative min-h-0 overflow-hidden">
                <div class="absolute inset-x-0 -top-6 flex justify-center z-0 pointer-events-none">
                    <div class="h-6 w-32 bg-[var(--bg-glass-B-6)] rounded-t-xl opacity-50 blur-sm"></div>
                </div>
                
                <div class="flex items-center gap-3 mb-2 px-4 pt-2 shrink-0 relative z-10">
                    <span class="text-[var(--primary-accent)] drop-shadow-[0_0_8px_var(--primary-accent-glow)] scale-110">
                        ${icons.gitMerge}
                    </span>
                    <h3 class="text-[11px] font-black text-[var(--text-on-A-primary)] uppercase tracking-[0.2em] opacity-80">
                        Structural Comparison
                    </h3>
                    <div class="h-px grow bg-gradient-to-r from-[var(--border-on-A)]/30 to-transparent ml-4"></div>
                </div>

                <div 
                    class="grow min-h-0 overflow-hidden relative z-10 mx-4 mb-4 ${isSolid ? 'rounded-xl border border-[var(--border-on-A)] bg-[var(--bg-surface-B-panel)]' : 'rounded-[var(--region-radius)] border border-[var(--border-on-A)]/10 shadow-inner bg-[var(--bg-glass-B-6)] backdrop-blur-xl'}"
                >
                    ${diffTreeTemplate(state.structuralDiff)}
                </div>
            </div>
        `;

        this.setShellSlot('bottomBar', structuralContent, { sizeMultiplier: isSolid ? 18 : 14.5, padding: false });
    }
}

export const segmentComparisonView = new SegmentComparisonView();
