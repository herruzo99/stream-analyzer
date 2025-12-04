import { useAnalysisStore } from '@/state/analysisStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { closeDropdown, toggleDropdown } from '@/ui/services/dropdownService';
import { formatBitrate } from '@/ui/shared/format';
import { html, render } from 'lit-html';
import { calculateSemanticDiff } from '../domain/semantic-diff.js';
import './components/abr-ladder-chart.js';
import { capabilityMatrixTemplate } from './components/capability-matrix.js';
import { comparisonTableTemplate } from './components/comparison-table';
import { manifestDiffTemplate } from './components/manifest-diff.js';
import { semanticDiffChartTemplate } from './components/semantic-diff-chart.js';
import { createComparisonViewModel } from './view-model';

let container = null;
let subscriptions = [];

// --- Helper for HLS Variant Items in Dropdown ---
const variantItem = (v, activeId, onSelect) => {
    const id = v.stableId || v.id;
    const isActive = activeId === id;
    const label = `${
        v.attributes.RESOLUTION || 'Unspecified'
    } @ ${formatBitrate(v.attributes.BANDWIDTH)}`;

    return html`
        <button
            @click=${(e) => {
                e.stopPropagation();
                onSelect(id);
            }}
            class="w-full text-left pl-8 pr-3 py-2 text-xs font-mono flex items-center justify-between transition-colors hover:bg-white/5 ${isActive
                ? 'text-blue-400 font-bold'
                : 'text-slate-400'}"
        >
            <span>${label}</span>
            ${isActive
                ? html`<span class="scale-75">${icons.checkCircle}</span>`
                : ''}
        </button>
    `;
};

// --- Stream Selector Component ---
const streamSelector = (
    streams,
    currentStreamId,
    currentVariantId,
    onSelectStream,
    onSelectVariant,
    label,
    accentColor = 'text-blue-400'
) => {
    const currentStream = streams.find((s) => s.id === currentStreamId);
    const protocol = currentStream?.protocol?.toUpperCase() || 'UNK';
    const isLive = currentStream?.manifest?.type === 'dynamic';
    const isHlsMaster =
        currentStream?.protocol === 'hls' && currentStream.manifest?.isMaster;

    // Resolve label for current selection
    let selectionLabel = currentStream?.name || 'Select Stream...';
    let subLabel = currentStream
        ? new URL(currentStream.originalUrl).hostname
        : '';

    if (isHlsMaster && currentVariantId) {
        // Find variant to show details
        const variant = currentStream.manifest.variants?.find(
            (v) => (v.stableId || v.id) === currentVariantId
        );
        if (variant) {
            subLabel = `Variant: ${
                variant.attributes.RESOLUTION || 'Unspecified'
            } (${formatBitrate(variant.attributes.BANDWIDTH)})`;
        } else if (currentVariantId === 'master') {
            subLabel = 'Master Playlist';
        }
    }

    // Visual badge colors
    const badgeBorder = isLive ? 'border-red-500/30' : 'border-slate-700';
    const badgeBg = isLive ? 'bg-red-900/20' : 'bg-slate-900';
    const badgeText = isLive ? 'text-red-400' : 'text-slate-400';

    const renderDropdownContent = () => html`
        <div
            class="dropdown-panel bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl w-80 p-2 ring-1 ring-black/50 space-y-1 animate-scaleIn max-h-[60vh] overflow-y-auto custom-scrollbar"
        >
            <div
                class="px-3 py-2 border-b border-white/5 mb-1 flex justify-between items-center sticky top-0 bg-slate-900 z-10"
            >
                <span
                    class="text-[10px] font-bold text-slate-500 uppercase tracking-widest"
                    >Select Source</span
                >
                <span
                    class="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded"
                    >${streams.length} Loaded</span
                >
            </div>

            ${streams.map((s) => {
                const isSelectedStream = s.id === currentStreamId;
                const isMaster = s.protocol === 'hls' && s.manifest?.isMaster;
                const variants = s.manifest?.variants || [];
                const isActiveMaster =
                    isSelectedStream &&
                    (!currentVariantId || currentVariantId === 'master');

                return html`
                    <div
                        class="rounded-lg overflow-hidden transition-colors ${isSelectedStream
                            ? 'bg-slate-800/50 ring-1 ring-white/10'
                            : 'hover:bg-slate-800/30'}"
                    >
                        <button
                            @click=${() => {
                                onSelectStream(s.id);
                                // Default to master/root when switching streams
                                onSelectVariant(null);
                                if (!isMaster) closeDropdown();
                            }}
                            class="w-full text-left p-2.5 flex items-center gap-3 group"
                        >
                            <div
                                class="w-8 h-8 rounded bg-slate-950 border border-slate-800 flex items-center justify-center font-bold text-[9px] text-slate-500 group-hover:text-slate-300 transition-colors"
                            >
                                ${s.protocol.toUpperCase().substr(0, 3)}
                            </div>
                            <div class="grow min-w-0">
                                <div
                                    class="font-bold text-xs text-slate-300 group-hover:text-white truncate transition-colors"
                                >
                                    ${s.name}
                                </div>
                                <div
                                    class="text-[10px] text-slate-500 font-mono truncate"
                                >
                                    ${new URL(s.originalUrl).hostname}
                                </div>
                            </div>
                            ${isActiveMaster
                                ? html`<span class="text-emerald-400 scale-90"
                                      >${icons.checkCircle}</span
                                  >`
                                : ''}
                        </button>

                        <!-- Variant List for HLS -->
                        ${isMaster
                            ? html`
                                  <div
                                      class="border-t border-white/5 bg-black/20"
                                  >
                                      <button
                                          @click=${() => {
                                              onSelectStream(s.id);
                                              onSelectVariant('master');
                                              closeDropdown();
                                          }}
                                          class="w-full text-left pl-8 pr-3 py-2 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between transition-colors hover:bg-white/5 ${isActiveMaster
                                              ? 'text-blue-400'
                                              : 'text-slate-500'}"
                                      >
                                          <span>Master Playlist</span>
                                      </button>
                                      ${variants.map((v) =>
                                          variantItem(
                                              v,
                                              isSelectedStream
                                                  ? currentVariantId
                                                  : null,
                                              (vid) => {
                                                  onSelectStream(s.id);
                                                  onSelectVariant(vid);
                                                  closeDropdown();
                                              }
                                          )
                                      )}
                                  </div>
                              `
                            : ''}
                    </div>
                `;
            })}
        </div>
    `;

    return html`
        <div class="flex flex-col gap-1.5 min-w-[280px] max-w-[400px] flex-1">
            <span
                class="text-[10px] font-bold uppercase tracking-widest text-slate-500 pl-1 flex items-center gap-2"
            >
                ${label}
            </span>
            <button
                @click=${(e) =>
                    toggleDropdown(e.currentTarget, renderDropdownContent, e)}
                class="flex items-center gap-3 p-2.5 pr-4 bg-slate-800/40 border border-slate-700/50 rounded-xl hover:bg-slate-800 hover:border-slate-600 transition-all group relative overflow-hidden text-left shadow-sm hover:shadow-md"
            >
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
                        ${selectionLabel}
                    </span>
                    <span
                        class="text-[10px] font-mono text-slate-500 truncate w-full group-hover:text-slate-400 transition-colors mt-0.5"
                    >
                        ${subLabel}
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
        comparisonReferenceVariantId,
        comparisonCandidateStreamId,
        comparisonCandidateVariantId,
        manifestComparisonViewMode,
    } = useUiStore.getState();

    // Allow comparison if at least 1 stream is present (for Master vs Variant analysis)
    if (streams.length === 0) {
        render(
            html`
                <div
                    class="flex flex-col items-center justify-center h-full text-slate-400 gap-4 animate-fadeIn"
                >
                    <div
                        class="p-6 bg-slate-900 rounded-full border border-slate-700 shadow-lg"
                    >
                        ${icons.comparison}
                    </div>
                    <h2 class="text-xl font-bold text-white">
                        Comparison Mode
                    </h2>
                    <p>Please load a stream to enable comparison.</p>
                </div>
            `,
            container
        );
        return;
    }

    // --- RESOLVE TARGETS ---
    const targets = [];
    let refCompositeId = null;

    if (manifestComparisonViewMode === 'table') {
        // Table Mode: Add ALL streams
        streams.forEach((s) => {
            // Use active playlist ID if HLS, else master/default
            const variantId = s.activeMediaPlaylistId || 'master';
            targets.push({ stream: s, variantId });
        });

        // Resolve Reference Composite ID for Table
        // Use the stored reference ID if it exists, otherwise default to the first stream
        const refId =
            comparisonReferenceStreamId &&
            streams.some((s) => s.id === comparisonReferenceStreamId)
                ? comparisonReferenceStreamId
                : streams[0].id;

        const refTarget = targets.find((t) => t.stream.id === refId);
        // Reconstruct composite ID manually to match view-model logic
        if (refTarget) {
            refCompositeId = `${refTarget.stream.id}::${refTarget.variantId || 'master'}`;
        } else {
            refCompositeId = `${targets[0].stream.id}::${targets[0].variantId || 'master'}`;
        }
    } else {
        // Timeline/Manifest Mode: A vs B
        let refId = comparisonReferenceStreamId;
        if (!refId || !streams.some((s) => s.id === refId)) {
            refId = streams[0].id;
        }

        let candId = comparisonCandidateStreamId;
        if (!candId || !streams.some((s) => s.id === candId)) {
            candId = streams.find((s) => s.id !== refId)?.id || refId;
        }

        const refStream = streams.find((s) => s.id === refId);
        const candStream = streams.find((s) => s.id === candId);

        if (refStream) {
            targets.push({
                stream: refStream,
                variantId: comparisonReferenceVariantId,
            });
        }
        if (candStream) {
            targets.push({
                stream: candStream,
                variantId: comparisonCandidateVariantId,
            });
        }

        refCompositeId = `${refId}::${comparisonReferenceVariantId || 'master'}`;
    }

    // --- VIEW MODEL ---
    const viewModel = createComparisonViewModel(targets, refCompositeId);

    // --- RENDER LOGIC ---
    let mainContent = html``;

    if (manifestComparisonViewMode === 'timeline') {
        // Re-resolve ref/cand streams for diff calc
        const refId = comparisonReferenceStreamId || streams[0].id;
        const candId =
            comparisonCandidateStreamId ||
            (streams.find((s) => s.id !== refId)?.id ?? refId);
        const refStream = streams.find((s) => s.id === refId);
        const candStream = streams.find((s) => s.id === candId);

        if (refStream && candStream) {
            const diffData = calculateSemanticDiff(
                refStream,
                candStream,
                comparisonReferenceVariantId,
                comparisonCandidateVariantId
            );
            mainContent = html`
                <div class="h-full w-full p-4 sm:p-6 flex flex-col">
                    <div
                        class="grow bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-inner relative overflow-hidden flex flex-col"
                    >
                        <div
                            class="absolute inset-0 opacity-[0.03] pointer-events-none"
                            style="background-size: 40px 40px; background-image: radial-gradient(circle, #ffffff 1px, transparent 1px);"
                        ></div>
                        <div
                            class="grow w-full h-full relative z-10 min-h-[500px]"
                        >
                            ${semanticDiffChartTemplate(diffData)}
                        </div>
                    </div>
                </div>
            `;
        }
    } else if (manifestComparisonViewMode === 'manifest') {
        const refId = comparisonReferenceStreamId || streams[0].id;
        const candId =
            comparisonCandidateStreamId ||
            (streams.find((s) => s.id !== refId)?.id ?? refId);
        const refStream = streams.find((s) => s.id === refId);
        const candStream = streams.find((s) => s.id === candId);

        if (refStream && candStream) {
            mainContent = html`
                <div class="h-full w-full p-4 sm:p-6 flex flex-col">
                    ${manifestDiffTemplate(
                        refStream,
                        candStream,
                        comparisonReferenceVariantId,
                        comparisonCandidateVariantId
                    )}
                </div>
            `;
        }
    } else {
        // Table Mode (Multi-column)
        mainContent = html`
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
                    targetHeaders: viewModel.targetHeaders,
                    sections: viewModel.sections,
                    referenceCompositeId: refCompositeId,
                    hideSameRows: comparisonHideSameRows,
                })}
            </div>
        `;
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
                            ${icons.comparison} Stream Comparison
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
                            ${icons.timeline} Timeline
                        </button>
                        <button
                            @click=${() =>
                                uiActions.setManifestComparisonViewMode(
                                    'manifest'
                                )}
                            class="px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${manifestComparisonViewMode ===
                            'manifest'
                                ? 'bg-slate-700 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-300'}"
                        >
                            ${icons.code} Manifest
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

                <!-- Render Stream Selectors (Only for Timeline/Diff Mode) -->
                ${manifestComparisonViewMode === 'timeline' ||
                manifestComparisonViewMode === 'manifest'
                    ? html`
                          <div
                              class="flex items-center justify-center gap-4 pt-4 border-t border-slate-800/50 animate-fadeIn"
                          >
                              ${streamSelector(
                                  streams,
                                  comparisonReferenceStreamId || streams[0].id,
                                  comparisonReferenceVariantId,
                                  (id) =>
                                      uiActions.setComparisonReferenceStreamId(
                                          id
                                      ),
                                  (vid) =>
                                      uiActions.setComparisonReferenceVariantId(
                                          vid
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
                                  comparisonCandidateStreamId ||
                                      streams.find(
                                          (s) =>
                                              s.id !==
                                              comparisonReferenceStreamId
                                      )?.id ||
                                      streams[0].id,
                                  comparisonCandidateVariantId,
                                  (id) =>
                                      uiActions.setComparisonCandidateStreamId(
                                          id
                                      ),
                                  (vid) =>
                                      uiActions.setComparisonCandidateVariantId(
                                          vid
                                      ),
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
                ${mainContent}
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
