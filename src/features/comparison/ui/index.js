import { useAnalysisStore } from '@/state/analysisStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { closeDropdown, toggleDropdown } from '@/ui/services/dropdownService';
import { html, render } from 'lit-html';
import { calculateSemanticDiff } from '../domain/semantic-diff.js';
import './components/abr-ladder-chart.js';
import { capabilityMatrixTemplate } from './components/capability-matrix.js';
import { comparisonTableTemplate } from './components/comparison-table';
import { semanticDiffChartTemplate } from './components/semantic-diff-chart.js';
import { createComparisonViewModel } from './view-model';

let container = null;
let subscriptions = [];
let candidateStreamId = null;

/**
 * Renders a rich, card-style selector for choosing comparison streams.
 */
const streamSelector = (
    streams,
    currentId,
    onSelect,
    label,
    accentColor = 'text-blue-400'
) => {
    const current = streams.find((s) => s.id === currentId);
    const protocol = current?.protocol?.toUpperCase() || 'UNK';
    const isLive = current?.manifest?.type === 'dynamic';

    // Visual badge colors based on protocol/live state
    const badgeBorder = isLive ? 'border-red-500/30' : 'border-slate-700';
    const badgeBg = isLive ? 'bg-red-900/20' : 'bg-slate-900';
    const badgeText = isLive ? 'text-red-400' : 'text-slate-400';

    const renderOption = (s) => {
        const isSelected = s.id === currentId;
        const proto = s.protocol.toUpperCase();
        return html`
            <button
                @click=${() => {
                    onSelect(s.id);
                    closeDropdown();
                }}
                class="w-full text-left p-2.5 rounded-lg text-xs transition-all flex items-center gap-3 group border border-transparent hover:bg-slate-800 hover:border-slate-700 ${isSelected
                    ? 'bg-slate-800/50 border-slate-700'
                    : ''}"
            >
                <div
                    class="w-8 h-8 rounded bg-slate-950 border border-slate-800 flex items-center justify-center font-bold text-[9px] text-slate-500 group-hover:text-slate-300 transition-colors"
                >
                    ${proto.substr(0, 3)}
                </div>
                <div class="grow min-w-0">
                    <div
                        class="font-bold text-slate-300 group-hover:text-white truncate transition-colors"
                    >
                        ${s.name}
                    </div>
                    <div
                        class="text-[10px] text-slate-500 font-mono truncate opacity-60 group-hover:opacity-100 transition-opacity"
                    >
                        ${new URL(s.originalUrl).hostname}
                    </div>
                </div>
                ${isSelected
                    ? html`<span class="text-emerald-400 scale-90"
                          >${icons.checkCircle}</span
                      >`
                    : ''}
            </button>
        `;
    };

    return html`
        <div class="flex flex-col gap-1.5 min-w-[260px] max-w-[360px] flex-1">
            <span
                class="text-[10px] font-bold uppercase tracking-widest text-slate-500 pl-1 flex items-center gap-2"
            >
                ${label}
            </span>
            <button
                @click=${(e) =>
                    toggleDropdown(
                        e.currentTarget,
                        () => html`
                            <div
                                class="dropdown-panel bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl w-80 p-2 ring-1 ring-black/50 space-y-1 animate-scaleIn"
                            >
                                <div
                                    class="px-3 py-2 border-b border-white/5 mb-1 flex justify-between items-center"
                                >
                                    <span
                                        class="text-[10px] font-bold text-slate-500 uppercase tracking-widest"
                                        >Select Stream</span
                                    >
                                    <span
                                        class="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded"
                                        >${streams.length} Available</span
                                    >
                                </div>
                                <div
                                    class="max-h-64 overflow-y-auto custom-scrollbar space-y-1 pr-1"
                                >
                                    ${streams.map(renderOption)}
                                </div>
                            </div>
                        `,
                        e
                    )}
                class="flex items-center gap-3 p-2.5 pr-4 bg-slate-800/40 border border-slate-700/50 rounded-xl hover:bg-slate-800 hover:border-slate-600 transition-all group relative overflow-hidden text-left shadow-sm hover:shadow-md"
            >
                <!-- Protocol Badge -->
                <div
                    class="flex flex-col items-center justify-center w-11 h-11 rounded-lg ${badgeBg} ${badgeBorder} border shadow-inner shrink-0 transition-colors"
                >
                    <span class="text-[10px] font-black ${accentColor}"
                        >${protocol}</span
                    >
                    <span
                        class="text-[8px] font-bold uppercase ${badgeText} leading-none mt-0.5"
                        >${isLive ? 'LIVE' : 'VOD'}</span
                    >
                </div>

                <div class="flex flex-col items-start min-w-0 grow">
                    <span
                        class="text-xs font-bold text-slate-200 group-hover:text-white truncate w-full transition-colors"
                    >
                        ${current?.name || 'Select Stream...'}
                    </span>
                    <span
                        class="text-[10px] font-mono text-slate-500 truncate w-full group-hover:text-slate-400 transition-colors mt-0.5"
                    >
                        ${current ? new URL(current.originalUrl).hostname : ''}
                    </span>
                </div>

                <span
                    class="text-slate-600 group-hover:text-slate-400 transition-colors shrink-0 bg-slate-900/50 p-1 rounded-md"
                >
                    ${icons.chevronDown}
                </span>
            </button>
        </div>
    `;
};

function renderComparison() {
    if (!container) return;
    const { streams } = useAnalysisStore.getState();
    const {
        comparisonHideSameRows,
        comparisonReferenceStreamId,
        manifestComparisonViewMode,
    } = useUiStore.getState();

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

    let refId = comparisonReferenceStreamId;
    if (!refId || !streams.some((s) => s.id === refId)) {
        refId = streams[0].id;
    }

    let candId = candidateStreamId;
    if (!candId || !streams.some((s) => s.id === candId) || candId === refId) {
        candId = streams.find((s) => s.id !== refId)?.id || streams[0].id;
        candidateStreamId = candId;
    }

    const viewModel = createComparisonViewModel(streams, refId);

    let diffChart = html``;
    if (manifestComparisonViewMode === 'timeline') {
        const refStream = streams.find((s) => s.id === refId);
        const candStream = streams.find((s) => s.id === candId);

        if (refStream && candStream) {
            const diffData = calculateSemanticDiff(refStream, candStream);
            diffChart = semanticDiffChartTemplate(diffData);
        }
    }

    const template = html`
        <div class="flex flex-col h-full bg-slate-950 overflow-hidden">
            <!-- Control Bar -->
            <div
                class="shrink-0 border-b border-slate-800 bg-slate-950 z-10 p-4 sm:px-6 sm:py-4 custom-scrollbar space-y-4 shadow-sm"
            >
                <div class="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2
                            class="text-xl font-bold text-white flex items-center gap-2"
                        >
                            ${icons.comparison} Manifest Comparison
                        </h2>
                    </div>

                    <div
                        class="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800"
                    >
                        <button
                            @click=${() =>
                                uiActions.setManifestComparisonViewMode(
                                    'table'
                                )}
                            class="px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${manifestComparisonViewMode ===
                            'table'
                                ? 'bg-slate-700 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-300'}"
                        >
                            ${icons.table} Table
                        </button>
                        <button
                            @click=${() =>
                                uiActions.setManifestComparisonViewMode(
                                    'timeline'
                                )}
                            class="px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${manifestComparisonViewMode ===
                            'timeline'
                                ? 'bg-slate-700 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-300'}"
                        >
                            ${icons.timeline} Timeline Diff
                        </button>
                    </div>

                    <div class="flex items-center gap-3">
                        ${manifestComparisonViewMode === 'table'
                            ? html`
                                  <label
                                      class="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg hover:bg-slate-900 transition-colors border border-transparent hover:border-slate-800"
                                  >
                                      <span
                                          class="text-xs font-bold text-slate-400 uppercase tracking-wider"
                                          >Diff Only</span
                                      >
                                      <button
                                          @click=${() =>
                                              uiActions.toggleComparisonHideSameRows()}
                                          role="switch"
                                          aria-checked="${comparisonHideSameRows}"
                                          class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${comparisonHideSameRows
                                              ? 'bg-blue-600'
                                              : 'bg-slate-700'}"
                                      >
                                          <span
                                              class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${comparisonHideSameRows
                                                  ? 'translate-x-4.5'
                                                  : 'translate-x-1'}"
                                          ></span>
                                      </button>
                                  </label>
                              `
                            : ''}
                    </div>
                </div>

                ${manifestComparisonViewMode === 'timeline'
                    ? html`
                          <div
                              class="flex items-center justify-center gap-4 pt-4 border-t border-slate-800/50 animate-fadeIn"
                          >
                              ${streamSelector(
                                  streams,
                                  refId,
                                  (id) =>
                                      uiActions.setComparisonReferenceStreamId(
                                          id
                                      ),
                                  'Reference (A)',
                                  'text-blue-400'
                              )}

                              <div
                                  class="flex flex-col items-center justify-center text-slate-600 gap-1 px-2"
                              >
                                  <div
                                      class="text-[9px] font-bold uppercase tracking-wider opacity-50"
                                  >
                                      Diff
                                  </div>
                                  <div
                                      class="p-1.5 rounded-full bg-slate-900 border border-slate-800"
                                  >
                                      ${icons.arrowRight}
                                  </div>
                              </div>

                              ${streamSelector(
                                  streams,
                                  candId,
                                  (id) => {
                                      candidateStreamId = id;
                                      renderComparison();
                                  },
                                  'Candidate (B)',
                                  'text-purple-400'
                              )}
                          </div>
                      `
                    : ''}
            </div>

            <!-- Main Content -->
            <div
                class="grow min-h-0 relative bg-slate-950 overflow-y-auto custom-scrollbar"
            >
                ${manifestComparisonViewMode === 'table'
                    ? html`
                          <div class="p-4 sm:p-6 space-y-6">
                              <div
                                  class="grid grid-cols-1 xl:grid-cols-2 gap-6 min-h-[240px]"
                              >
                                  <div
                                      class="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4 flex flex-col shadow-sm hover:border-slate-600 transition-colors"
                                  >
                                      <h3
                                          class="text-xs font-bold text-slate-400 mb-3 flex items-center gap-2 uppercase tracking-wider"
                                      >
                                          ${icons.trendingUp} Bitrate Ladder
                                      </h3>
                                      <div class="grow relative min-h-[180px]">
                                          <abr-ladder-chart
                                              .data=${viewModel.abrData}
                                          ></abr-ladder-chart>
                                      </div>
                                  </div>
                                  <div
                                      class="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4 flex flex-col shadow-sm hover:border-slate-600 transition-colors"
                                  >
                                      <h3
                                          class="text-xs font-bold text-slate-400 mb-3 flex items-center gap-2 uppercase tracking-wider"
                                      >
                                          ${icons.features} Feature Matcher
                                      </h3>
                                      <div class="grow relative min-h-[180px]">
                                          ${capabilityMatrixTemplate(streams)}
                                      </div>
                                  </div>
                              </div>
                              ${comparisonTableTemplate({
                                  streams,
                                  sections: viewModel.sections,
                                  referenceStreamId: refId,
                                  hideSameRows: comparisonHideSameRows,
                              })}
                          </div>
                      `
                    : html`
                          <div class="h-full w-full p-4 sm:p-6 flex flex-col">
                              <div
                                  class="grow bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-inner relative overflow-hidden flex flex-col"
                              >
                                  <!-- CSS Radial Grid Background -->
                                  <div
                                      class="absolute inset-0 opacity-[0.03] pointer-events-none"
                                      style="background-size: 40px 40px; background-image: radial-gradient(circle, #ffffff 1px, transparent 1px);"
                                  ></div>
                                  <div
                                      class="grow w-full h-full relative z-10 min-h-[500px]"
                                  >
                                      ${diffChart}
                                  </div>
                              </div>
                          </div>
                      `}
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
