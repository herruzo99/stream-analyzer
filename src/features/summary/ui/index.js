import { getOverviewEvidenceLinks } from '@/features/summary/application/overview-contract.js';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { uiActions } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { styleMap } from 'lit-html/directives/style-map.js';
import { bitrateLadderTemplate } from './components/bitrate-ladder.js';
import { cmafWidgetTemplate } from './components/cmaf-widget.js';
import { complianceWidgetTemplate } from './components/compliance-widget.js';
import { featureGridTemplate } from './components/feature-grid.js';
import { heroHeaderTemplate } from './components/hero-header.js';
import { quickStatsTemplate } from './components/quick-stats.js';
import { tracksPanelTemplate } from './components/tracks-panel.js';
import { createSummaryViewModel } from './view-model.js';
import { eventBus } from '@/application/event-bus';
import { EVENTS } from '@/types/events';

// Semantic Layout Styles for "Cards" - Using manual variables since we can't easily import the lit-element styles object into a plain JS render function without some boilerplate, 
// OR we can just use the variables directly which is cleaner for lit-html templates.
const layoutCardStyles = {
    // These defaults should mostly be handled by class names if we were using the library, but for lit-html styleMap:

    borderRadius: '0.75rem',
    boxShadow: '0 8px 30px rgb(0 0 0 / 0.35)',
    backdropFilter: 'blur(12px)',
    border: '1px solid #1e293b',
};

let container = null;
let analysisUnsubscribe = null;

function renderSummary() {
    if (!container) return;

    const { streams, activeStreamId } = useAnalysisStore.getState();
    const stream = streams.find((s) => s.id === activeStreamId) ?? streams[0];

    // --- CASE: NO STREAM ---
    if (!stream) {
        render(
            html`
                <div
                    class="flex flex-col items-center justify-center h-full text-slate-400 animate-fadeIn"
                >
                    <div
                        style=${styleMap({
                ...layoutCardStyles,
                borderRadius: '9999px',
                padding: '1.5rem',
                backdropFilter: 'none',
                background: '#1e293b' // Solid panel color for visibility
            })}
                        class="mb-4"
                    >
                        ${icons.search}
                    </div>
                    <p class="text-lg font-medium text-slate-200">
                        No stream loaded.
                    </p>
                    <p class="text-sm">
                        Select a stream or start a new analysis.
                    </p>
                </div>
            `,
            container
        );
        return;
    }

    const vm = createSummaryViewModel(stream);

    // --- CASE: BROKEN STREAM ---
    if (!vm) {
        const handleRemove = () => {
            if (confirm(`Remove broken stream "${stream.name}"?`)) {
                analysisActions.removeStreamInput(stream.id);
            }
        };

        const handleRetry = () => {
            eventBus.dispatch(EVENTS.UI.RETRY_STREAM, { streamId: stream.id });
        };

        render(
            html`
                <div
                    class="flex flex-col items-center justify-center h-full text-slate-400 animate-fadeIn p-8 text-center"
                >
                    <div
                        class="bg-red-500/20 p-6 rounded-full mb-4 shadow-lg border border-red-500/30 text-red-400"
                    >
                        ${icons.alertTriangle}
                    </div>
                    <h3 class="text-xl font-bold text-red-400 mb-2">
                        Analysis Incomplete
                    </h3>
                    <p class="text-sm text-slate-400 max-w-md mb-6">
                        The manifest summary could not be generated and the stream is being polled for recovery. 
                        This usually indicates a parsing failure or an unsupported format.
                    </p>

                    ${stream.retryCount > 0
                    ? html`
                          <div class="mb-6 bg-slate-800 px-3 py-1 rounded-full text-xs font-bold text-slate-400 border border-slate-800">
                              Auto-Retries: ${stream.retryCount}
                          </div>
                      `
                    : ''}

                    <div class="flex gap-4">
                        <button
                            @click=${handleRetry}
                            class="px-5 py-2 bg-blue-500 hover:brightness-110 text-slate-100 font-bold rounded-lg shadow-lg transition-all flex items-center gap-2"
                        >
                            ${icons.refresh} Retry Now
                        </button>
                        <button
                            @click=${handleRemove}
                            class="px-5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-lg border border-red-500/20 hover:border-red-500/50 transition-all flex items-center gap-2"
                        >
                            ${icons.trash} Remove
                        </button>
                    </div>
                </div>
            `,
            container
        );
        return;
    }

    // --- LAYOUT (in-container; 1.2.0 has no shell slots) ---
    // 1. Hero Header (was topBar slot content)
    const heroHeader = html`
        <div class="w-full flex items-center">
            ${heroHeaderTemplate(vm)}
        </div>
    `;

    // 2. Render Main Content
    // We use a flex-col layout. The bottom part (Tracks) needs to stretch.
    const template = html`
        <div
            class="flex flex-col h-full animate-fadeIn custom-scrollbar overflow-y-auto"
            style="gap: 0.75rem"
        >
            <!-- HERO HEADER -->
            <div class="shrink-0 relative z-10">${heroHeader}</div>
            <!-- EVIDENCE / TRACEABILITY -->
            ${(() => {
                const links = getOverviewEvidenceLinks(stream);
                return html`<section
                    aria-labelledby="overview-evidence-heading"
                    class="shrink-0 rounded-xl border border-slate-800 bg-slate-900 p-4"
                >
                    <div class="flex items-center justify-between gap-2">
                        <div>
                            <p
                                class="text-[11px] font-bold uppercase tracking-wider text-slate-500"
                            >
                                Traceability
                            </p>
                            <h2
                                id="overview-evidence-heading"
                                class="text-sm font-bold text-slate-100"
                            >
                                Evidence
                            </h2>
                        </div>
                        <span
                            class="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400"
                            >${links.length} linked views</span
                        >
                    </div>
                    ${links.length
                        ? html`<nav
                              class="mt-3 flex flex-wrap gap-2"
                              aria-label="Overview evidence"
                          >
                              ${links.map(
                                  (link) =>
                                      html`<button
                                          class="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700"
                                          @click=${() =>
                                              uiActions.setActiveTab(
                                                  link.route
                                              )}
                                          >${link.label}</button
                                      >`
                              )}
                          </nav>`
                        : html`<p class="mt-2 text-xs text-slate-500" role="status">
                              No linked evidence is available for this result.
                          </p>`}
                </section>`;
            })()}
            <!-- WARNINGS SECTION -->
            ${(() => {
            if (stream.warnings && stream.warnings.length > 0) {
                // Simple reusable toggle
                const toggleDetails = (e) => {
                    const details = e.currentTarget.nextElementSibling;
                    const icon = e.currentTarget.querySelector('.chevron-icon');
                    if (details.style.maxHeight) {
                        details.style.maxHeight = null;
                        icon.style.transform = 'rotate(0deg)';
                    } else {
                        details.style.maxHeight = details.scrollHeight + 'px';
                        icon.style.transform = 'rotate(180deg)';
                    }
                };

                return html`
                        <div class="relative z-20">
                            <div
                                class="overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(234,179,8,0.2)]"
                                style=${styleMap({
                    ...layoutCardStyles,
                    background: '#f59e0b',
                    backgroundColor: 'rgba(234,179,8,0.05)',
                    borderColor: 'rgba(234,179,8,0.2)'
                })}
                            >
                                <button
                                    @click=${toggleDetails}
                                    class="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-amber-500/5 transition-colors"
                                >
                                    <div class="flex items-center gap-4">
                                        <div class="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 shadow-inner border border-amber-500/20">
                                            ${icons.alertTriangle}
                                        </div>
                                        <div class="text-left">
                                            <h4 class="text-sm font-bold text-amber-400 flex items-center gap-2">
                                                Analysis Warnings Detected
                                                <span class="px-2 py-0.5 rounded-full bg-amber-500/10 text-[10px] border border-amber-500/20">
                                                    ${stream.warnings.length} Issues
                                                </span>
                                            </h4>
                                        </div>
                                    </div>
                                    <div class="chevron-icon text-amber-400 transition-transform duration-300">
                                        ${icons.chevronDown}
                                    </div>
                                </button>
                                <div class="max-h-0 overflow-hidden transition-all duration-500 ease-in-out bg-slate-800/30">
                                    <div class="p-4 pt-0 border-t border-amber-500/10 space-y-2">
                                        <ul class="space-y-1.5 ml-1 pl-1">
                                            ${stream.warnings.map(
                    (w) => html`
                                                    <li class="text-xs text-slate-400 flex items-start gap-2">
                                                        <span class="mt-1 w-1 h-1 rounded-full bg-slate-400 opacity-50 shrink-0"></span>
                                                        <span class="leading-relaxed">${w.message}</span>
                                                    </li>
                                                `
                )}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
            }
            return '';
        })()}

            <!-- QUICK STATS -->
            <div class="relative z-10">${quickStatsTemplate(vm)}</div>

            <!-- CORE GRID (Ladders + Matrix + Widgets) -->
            <div 
                class="grid grid-cols-1 xl:grid-cols-3 relative z-10"
                style="gap: 0.75rem"
            >
                <!-- LEFT COL: Ladder & Features -->
                <div class="xl:col-span-2 flex flex-col" style="gap: 0.75rem">
                    
                    <!-- ABR LADDER -->
                    <div
                        class="relative overflow-hidden p-6 transition-all duration-300 hover:border-blue-500/30 group"
                        style=${styleMap({ ...layoutCardStyles, background: '#1e293b' })}
                    >
                        <div class="flex items-center justify-between mb-6">
                            <h3 class="text-xl font-bold text-slate-100 flex items-center gap-3">
                                <div class="p-2 rounded-xl bg-slate-700 text-blue-400">
                                    ${icons.trendingUp}
                                </div>
                                ABR Ladder
                            </h3>
                            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-800/50">
                                ${vm.videoTracks.length} Variants
                            </span>
                        </div>
                        ${bitrateLadderTemplate(vm)}
                    </div>

                    <!-- FEATURE MATRIX -->
                    <div
                        class="relative overflow-hidden p-6 transition-all duration-300 hover:border-purple-500/30"
                        style=${styleMap({ ...layoutCardStyles, background: '#1e293b' })}
                    >
                        <div class="flex items-center justify-between mb-6">
                            <h3 class="text-xl font-bold text-slate-100 flex items-center gap-3">
                                <div class="p-2 rounded-xl bg-purple-500/10 text-purple-300">
                                    ${icons.features}
                                </div>
                                Capabilities
                            </h3>
                        </div>
                        ${featureGridTemplate(vm)}
                    </div>
                </div>

                <!-- RIGHT COL: Compliance & Widgets -->
                <div class="flex flex-col" style="gap: 0.75rem">
                    ${complianceWidgetTemplate(stream)}
                    ${cmafWidgetTemplate(vm.cmafData)}
                </div>
            </div>

            <!-- BOTTOM SECTION: TRACKS PANEL -->
            <!-- Use flex-grow to ensure it hits bottom if content is short, 
                 but also allow standard flow if content is tall -->
            <div
                class="relative z-10 overflow-hidden flex flex-col grow min-h-[400px]"
                style=${styleMap({ ...layoutCardStyles, background: '#1e293b' })}
            >
                <!-- The tracks panel template should handle its own internal scrolling/layout now -->
                ${tracksPanelTemplate(vm)}
            </div>
        </div>
    `;

    render(template, container);
}

export const summaryView = {
    hasContextualSidebar: false,
    mount(containerElement) {
        container = containerElement;

        if (analysisUnsubscribe) analysisUnsubscribe();
        analysisUnsubscribe = useAnalysisStore.subscribe(renderSummary);
        renderSummary();
    },
    unmount() {
        if (analysisUnsubscribe) analysisUnsubscribe();
        analysisUnsubscribe = null;
        if (container) render(html``, container);
        container = null;
    },
};
