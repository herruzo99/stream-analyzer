import { useAnalysisStore } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { selectSegmentComparisonState } from './view-model.js';
import { comparisonHeaderTemplate } from './components/comparison-header.js';
import { diffOverviewTemplate } from './components/diff-overview.js';
import { diffTreeTemplate } from './components/diff-tree.js';

class SegmentComparisonView {
    // Port note: was `extends BaseView` (never committed). Plain class
    // with inlined mount/unmount/subscribe; slots composed in-container
    // (no shell slots in 1.2.0).
    constructor() {
        this.viewState = {
            lastIdA: null,
            lastIdB: null
        };
        this._unsubs = [];
        this.container = null;
        this.stream = null;
    }

    subscribe(store, listener) {
        const unsubscribe = store.subscribe(listener);
        this._unsubs.push(unsubscribe);
        return unsubscribe;
    }

    /**
     * @param {HTMLElement} containerElement
     * @param {{ stream?: any }} [args]
     */
    mount(containerElement, { stream } = {}) {
        this.container = containerElement;
        this.stream = stream || null;
        this.onMount();
    }

    unmount() {
        this.onUnmount();
        for (const unsubscribe of this._unsubs.splice(0)) {
            try {
                unsubscribe();
            } catch {
                /* ignore late unsubscribe errors */
            }
        }
        if (this.container) render(html``, this.container);
        this.container = null;
        this.stream = null;
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

        this.render();
    }

    onUnmount() {
        // Subscriptions release in unmount(); nothing else persistent.
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

        // Port: no themes in 1.2.0; solid styling throughout.
        const isSolid = true;

        let state;
        try {
            state = selectSegmentComparisonState();
        } catch (error) {
            console.error('Segment Comparison Error:', error);
            render(
                html`
                <div class="fixed inset-0 z-[100] flex flex-col items-center justify-center w-full h-full bg-slate-900 text-red-400">
                    <!-- Ambient Background Orb -->
                    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-500/5 rounded-full blur-[100px]"></div>

                    <div class="relative z-10 p-8 bg-slate-800/40 rounded-full border border-red-500/20 shadow-2xl mb-6 backdrop-blur-2xl group transition-all duration-500 hover:border-red-500/30">
                        <div class="absolute inset-0 rounded-full bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div class="relative z-10 text-red-400 group-hover:scale-110 transition-transform duration-500">
                            ${icons.alertTriangle}
                        </div>
                    </div>

                    <h3 class="relative z-10 text-2xl font-bold text-red-400 tracking-tight">
                        Comparison Failed
                    </h3>

                    <p class="relative z-10 text-sm mt-3 max-w-sm text-center leading-relaxed text-slate-400">
                        ${error.message || 'An unexpected error occurred during segment analysis.'}
                    </p>
                    
                    <button 
                        @click=${() => uiActions.clearSegmentComparisonSelection()}
                        class="relative z-10 mt-8 px-6 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-widest hover:bg-red-500/20 transition-colors"
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

        // --- EMPTY STATE ---
        if (state.isEmpty) {
            render(
                html`
                <div class="flex flex-col items-center justify-center h-full text-slate-400 relative overflow-hidden animate-fadeIn">
                    <!-- Ambient Background Orb -->
                    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] animate-pulse-slow"></div>

                    <div class="relative z-10 p-8 bg-slate-800/40 rounded-full border border-slate-700/20 shadow-2xl mb-6 backdrop-blur-2xl group transition-all duration-500 hover:border-blue-500/30">
                        <div class="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div class="relative z-10 text-blue-400/60 group-hover:text-blue-400 transition-colors duration-500 transform group-hover:scale-110">
                            ${icons.list}
                        </div>
                    </div>

                    <h3 class="relative z-10 text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-300 tracking-tight">
                        Comparison Queue Empty
                    </h3>

                    <p class="relative z-10 text-sm mt-3 max-w-sm text-center leading-relaxed opacity-80">
                        Visit the <strong class="text-blue-400 font-semibold">Segment Explorer</strong> to select playback segments and begin deep structural analysis.
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

        // 2. Render Main Content (overview + structural diff composed
        // in-container; 1.2.0 has no topBar/bottomBar slots)
        // 3. Structural Comparison section (was bottomBar slot)
        const structuralContent = html`
            <div class="w-full h-full flex flex-col relative min-h-0 overflow-hidden">
                <div class="absolute inset-x-0 -top-6 flex justify-center z-0 pointer-events-none">
                    <div class="h-6 w-32 bg-slate-800 rounded-t-xl opacity-50 blur-sm"></div>
                </div>
                
                <div class="flex items-center gap-3 mb-2 px-4 pt-2 shrink-0 relative z-10">
                    <span class="text-blue-400 drop-shadow-[0_0_8px_#3b82f6] scale-110">
                        ${icons.gitMerge}
                    </span>
                    <h3 class="text-[11px] font-black text-slate-200 uppercase tracking-[0.2em] opacity-80">
                        Structural Comparison
                    </h3>
                    <div class="h-px grow bg-gradient-to-r from-slate-700/30 to-transparent ml-4"></div>
                </div>

                <div 
                    class="grow min-h-0 overflow-hidden relative z-10 mx-4 mb-4 ${isSolid ? 'rounded-xl border border-slate-700 bg-slate-800' : 'rounded-xl border border-slate-700/10 shadow-inner bg-slate-800 backdrop-blur-xl'}"
                >
                    ${diffTreeTemplate(state.structuralDiff)}
                </div>
            </div>
        `;

        const content = html`
            <div class="flex flex-col h-full min-h-0 animate-fadeIn gap-3 overflow-hidden">
                <div class="shrink-0 px-2 pt-2">${header}</div>
                <div class="shrink-0 max-h-[30%] overflow-y-auto custom-scrollbar">
                     ${diffOverviewTemplate(state.segmentA, state.segmentB)}
                </div>
                <div class="grow min-h-0 overflow-hidden">${structuralContent}</div>
            </div>
        `;

        render(content, this.container);
    }
}

export const segmentComparisonView = new SegmentComparisonView();
