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
import { fabMenuTemplate } from '@/ui/components/fab-menu.js';
import { createComparisonViewModel } from './view-model';


let container = null;
let subscriptions = [];
let comparisonWarningsOpen = false;
let comparisonWarningsKey = null;

function safeHostname(url) {
    try {
        return new URL(url).hostname || 'local file';
    } catch {
        return 'local file';
    }
}

// --- Helper for HLS Variant Items in Dropdown ---
const variantItem = (v, activeId, onSelect) => {
    const id = v.stableId || v.id;
    const isActive = activeId === id;
    const attrs = v.attributes || {};
    const label = `${attrs.RESOLUTION || 'variant'} · ${formatBitrate(attrs.BANDWIDTH) || 'unknown rate'}`;

    return html`
        <button
            @click=${(e) => {
            e.stopPropagation();
            onSelect(id);
        }}
            aria-current=${isActive ? 'true' : 'false'}
            class="w-full text-left pl-9 pr-3 py-1.5 mono text-[11px] flex items-center justify-between transition-colors hover:bg-white/5 ${isActive
            ? 'text-emerald-200'
            : 'text-slate-500'}"
        >
            <span class="truncate">${label}</span>
            ${isActive
            ? html`<span class="text-emerald-300 shrink-0"
                      >${icons.checkCircle}</span
                  >`
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
    containerClass = ''
) => {
    const currentStream = streams.find((s) => s.id === currentStreamId);
    const protocol = (currentStream?.protocol || 'unknown').toLowerCase();
    const isLive = currentStream?.manifest?.type === 'dynamic';
    const isHlsMaster =
        currentStream?.protocol === 'hls' && currentStream.manifest?.isMaster;

    // Resolve label for current selection
    let selectionLabel = currentStream?.name || 'Select stream';
    let subLabel = currentStream
        ? safeHostname(currentStream.originalUrl)
        : '';

    if (isHlsMaster && currentVariantId) {
        const variant = currentStream.manifest.variants?.find(
            (v) => (v.stableId || v.id) === currentVariantId
        );
        const attrs = variant?.attributes || {};
        if (variant) {
            subLabel = `${attrs.RESOLUTION || 'variant'} · ${formatBitrate(attrs.BANDWIDTH) || ''}`.trim();
        } else if (currentVariantId === 'master') {
            subLabel = 'master playlist';
        }
    }

    const renderDropdownContent = () => html`
        <div
            class="dropdown-panel border border-white/10 bg-[#0b111c] rounded-md w-[400px] max-w-[90vw] p-2 max-h-[70vh] overflow-y-auto custom-scrollbar"
        >
            <div
                class="px-3 py-2 border-b border-white/5 mb-1 flex justify-between items-center sticky top-0 bg-[#0b111c] z-20"
            >
                <span class="mono text-[11px] font-medium text-slate-400"
                    >select stream</span
                >
                <span class="mono text-[10px] text-slate-600"
                    >${streams.length} available</span
                >
            </div>

            ${streams.map((s) => {
        const isSelectedStream = s.id === currentStreamId;
        const isMaster = s.protocol === 'hls' && s.manifest?.isMaster;
        const variants = s.manifest?.variants || [];
        const isActiveMaster =
            isSelectedStream &&
            (!currentVariantId || currentVariantId === 'master');

        const proto = (s.protocol || 'unknown').toLowerCase();
        const isLiveRow = s.manifest?.type === 'dynamic';
        return html`
                    <div
                        class="rounded-md overflow-hidden border transition-colors ${isSelectedStream
                ? 'bg-emerald-500/5 border-emerald-500/30'
                : 'border-transparent hover:bg-white/5'}"
                    >
            <button
                @click=${() => {
                onSelectStream(s.id);
                // Default to master/root when switching streams
                onSelectVariant(null);
                closeDropdown();
            }}
                            aria-current=${isSelectedStream ? 'true' : 'false'}
                            class="w-full text-left px-3 py-2.5 flex items-center gap-3"
                        >
                            <span
                                class="mono shrink-0 text-[10px] px-1.5 py-px rounded border ${isSelectedStream
                    ? 'text-emerald-200 bg-emerald-500/10 border-emerald-400/25'
                    : 'text-slate-500 bg-white/5 border-white/10'}"
                            >${proto}</span>
                            <span class="grow min-w-0">
                                <span
                                    class="flex items-center gap-1.5 text-[13px] font-medium text-slate-200 truncate"
                                >
                                    ${s.name}
                                    ${isLiveRow
                    ? html`<span class="mono flex items-center gap-1 text-[10px] text-red-300 shrink-0"><span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>live</span>`
                    : ''}
                                </span>
                                <span
                                    class="mono block text-[10px] text-slate-600 truncate"
                                >
                                    ${safeHostname(s.originalUrl)}
                                </span>
                            </span>
                            ${isActiveMaster
                ? html`<span class="text-emerald-300 shrink-0"
                                      >${icons.checkCircle}</span
                                  >`
                : ''}
                        </button>

                        <!-- Variant List for HLS -->
                        ${isMaster
                ? html`
                                  <div class="border-t border-white/5">
                                      <button
                                          @click=${() => {
                        onSelectStream(s.id);
                        onSelectVariant('master');
                        closeDropdown();
                    }}
                                          aria-current=${isActiveMaster ? 'true' : 'false'}
                                          class="w-full text-left pl-9 pr-3 py-1.5 mono text-[11px] flex items-center justify-between transition-colors hover:bg-white/5 ${isActiveMaster
                        ? 'text-emerald-200'
                        : 'text-slate-500'}"
                                      >
                                          <span>master playlist</span>
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
        <div class="flex-1 min-w-0 ${containerClass}">
            <p class="mono text-[10px] text-slate-600 mb-1 px-1">
                ${String(label).toLowerCase()}
            </p>
            <button
                class="w-full bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 hover:border-white/15 rounded-md p-3 transition-colors text-left"
                @click=${(e) => toggleDropdown(e.currentTarget, renderDropdownContent, e)}
                aria-label="Choose ${String(label).toLowerCase()} stream (currently ${selectionLabel})"
            >
                <span class="flex items-center gap-3">
                    <span
                        class="mono shrink-0 text-[10px] px-1.5 py-px rounded border text-slate-400 bg-white/5 border-white/10"
                    >${protocol}</span>
                    <span class="grow min-w-0">
                        <span
                            class="flex items-center gap-1.5 text-[13px] font-medium text-slate-100 truncate"
                        >
                            ${selectionLabel}
                            ${isLive
                            ? html`<span class="mono flex items-center gap-1 text-[10px] text-red-300 shrink-0"><span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>live</span>`
                            : ''}
                        </span>
                        <span
                            class="mono block text-[10px] text-slate-600 truncate"
                        >
                            ${subLabel}
                        </span>
                    </span>
                    <span class="text-slate-500 shrink-0"
                        >${icons.chevronDown}</span
                    >
                </span>
            </button>
        </div>
    `;
};

function renderComparison() {
    if (!container) return;
    const { streams } = useAnalysisStore.getState();
    // Warnings panel state is per stream-set; reset when it changes.
    const warningsKey = streams.map((s) => s.id).join(',');
    if (comparisonWarningsKey !== warningsKey) {
        comparisonWarningsKey = warningsKey;
        comparisonWarningsOpen = false;
    }
    const {
        comparisonHideSameRows,
        comparisonReferenceStreamId,
        comparisonReferenceVariantId,
        comparisonCandidateStreamId,
        comparisonCandidateVariantId,
        manifestComparisonViewMode
    } = useUiStore.getState();

    // Allow comparison if at least 1 stream is present (for Master vs Variant analysis)
    if (streams.length === 0) {
        render(
            html`
                <div
                    class="flex flex-col items-center justify-center h-full p-8 text-center"
                >
                    <p class="text-[15px] font-medium text-slate-200 mb-1">
                        Nothing to compare yet.
                    </p>
                    <p class="mono text-[11px] text-slate-600">
                        Analyze one stream for master-vs-variant, two or more
                        for stream-vs-stream.
                    </p>
                </div>
            `,
            container
        );
        return;
    }

    // --- RESOLVE TARGETS & IDS ---
    // We resolve these ONCE here to ensure consistency across selectors, charts, and view model.

    // 1. Resolve Reference ID
    let resolvedRefId = comparisonReferenceStreamId;
    if (
        resolvedRefId === null ||
        resolvedRefId === undefined ||
        !streams.some((s) => String(s.id) === String(resolvedRefId))
    ) {
        resolvedRefId = streams[0].id;
    }

    // 2. Resolve Candidate ID (Logic: Try stored candidate, else find first stream != ref, else ref)
    let resolvedCandId = comparisonCandidateStreamId;
    // Use loose comparison to ensure we don't fail on type mismatches (string vs number)
    if (
        resolvedCandId === null ||
        resolvedCandId === undefined ||
        !streams.some((s) => String(s.id) === String(resolvedCandId))
    ) {
        resolvedCandId =
            streams.find((s) => String(s.id) !== String(resolvedRefId))?.id || resolvedRefId;
    }

    const targets = [];
    let refCompositeId = null;

    if (manifestComparisonViewMode === 'table') {
        // Table Mode: Add ALL streams
        streams.forEach((s) => {
            // Use active playlist ID if HLS, else master/default
            const variantId = s.activeMediaPlaylistId || 'master';
            targets.push({ stream: s, variantId });
        });

        // Use resolved ref for composite ID
        const refTarget = targets.find(
            (t) => String(t.stream.id) === String(resolvedRefId)
        );
        if (refTarget) {
            refCompositeId = `${refTarget.stream.id}::${refTarget.variantId || 'master'}`;
        } else {
            refCompositeId = `${targets[0].stream.id}::${targets[0].variantId || 'master'}`;
        }
    } else {
        // Timeline/Manifest Mode: A vs B (Using Resolved IDs)
        const refStream = streams.find((s) => s.id === resolvedRefId);
        const candStream = streams.find((s) => s.id === resolvedCandId);

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

        refCompositeId = `${resolvedRefId}::${comparisonReferenceVariantId || 'master'}`;
    }

    // --- VIEW MODEL ---
    const viewModel = createComparisonViewModel(targets, refCompositeId);

    // --- RENDER LOGIC ---
    let mainContent = html``;

    if (manifestComparisonViewMode === 'timeline') {
        const refStream = streams.find(
            (s) => String(s.id) === String(resolvedRefId)
        );
        const candStream = streams.find(
            (s) => String(s.id) === String(resolvedCandId)
        );

        if (refStream && candStream) {
            const diffData = calculateSemanticDiff(
                refStream,
                candStream,
                comparisonReferenceVariantId,
                comparisonCandidateVariantId
            );
            mainContent = html`
                <div class="h-full w-full flex flex-col min-h-0">
                    <div class="rounded-md border border-white/5 bg-[#0b111c] grow w-full h-full relative overflow-hidden min-h-0">
                        <div class="h-full overflow-auto custom-scrollbar">
                             ${semanticDiffChartTemplate(diffData)}
                        </div>
                    </div>
                </div>
            `;
        }
    } else if (manifestComparisonViewMode === 'manifest') {
        // Manifest Mode: Content is now in Bottom Bar
        // We render an empty or placeholder main slot if needed, or maybe just null to show background.
        mainContent = null;
    } else {
        // Table Mode (Multi-column)
        // Table has been moved to the Bottom Shell Slot to act as a "Tab" drawer
        mainContent = html`
            <div class="flex flex-col h-full gap-2 min-h-0">
                <div class="grid grid-cols-1 xl:grid-cols-2 gap-2 flex-1 min-h-0">
                    <section class="rounded-md border border-white/5 bg-[#0b111c] p-4 flex flex-col min-h-0" aria-label="Bitrate ladder">
                        <h3 class="mono text-[11px] font-medium text-slate-500 mb-3 shrink-0">
                            abr ladder
                        </h3>
                        <div class="grow relative min-h-0">
                            <abr-ladder-chart .data=${viewModel.abrData}></abr-ladder-chart>
                        </div>
                    </section>
                    <section class="rounded-md border border-white/5 bg-[#0b111c] p-4 flex flex-col min-h-0" aria-label="Feature matcher">
                        <h3 class="mono text-[11px] font-medium text-slate-500 mb-3 shrink-0">
                            feature matcher
                        </h3>
                        <div class="grow relative min-h-0 overflow-auto custom-scrollbar">
                            ${capabilityMatrixTemplate(streams)}
                        </div>
                    </section>
                </div>
            </div>
        `;
    }

    // --- Bottom Tab Injection (in-flow; 1.2.0 has no bottomBar slot) ---
    let bottomBarContent = null;

    // 1. Table View
    if (manifestComparisonViewMode === 'table') {
        const tableContent = html`
            <div class="w-full h-full max-h-full flex flex-col min-h-0 overflow-hidden">
                 ${comparisonTableTemplate({
            targetHeaders: viewModel.targetHeaders,
            sections: viewModel.sections,
            referenceCompositeId: refCompositeId,
            hideSameRows: comparisonHideSameRows,
        })}
            </div>
        `;
        bottomBarContent = tableContent;
    }
    // 2. Manifest (Structural) View - MOVED HERE
    else if (manifestComparisonViewMode === 'manifest') {
        const refStream = streams.find(
            (s) => String(s.id) === String(resolvedRefId)
        );
        const candStream = streams.find(
            (s) => String(s.id) === String(resolvedCandId)
        );

        if (refStream && candStream) {
            const manifestContent = html`
                <div class="w-full h-full max-h-full flex flex-col min-h-0 overflow-hidden">
                     ${manifestDiffTemplate(
                refStream,
                candStream,
                comparisonReferenceVariantId,
                comparisonCandidateVariantId
            )}
                </div>
            `;
            bottomBarContent = manifestContent;
        }
    }

    // --- Toolbar Injection (TopBar) ---
    const showStreamSelectors = manifestComparisonViewMode === 'timeline' || manifestComparisonViewMode === 'manifest';

    const modeMeta = [
        { mode: 'table', icon: icons.table, label: 'table' },
        { mode: 'timeline', icon: icons.timeline, label: 'timeline' },
        { mode: 'manifest', icon: icons.code, label: 'structural' },
    ];
    const toolbarTitle = html`
         <div class="w-full flex flex-wrap items-center gap-x-4 gap-y-2">
                <h2 class="mono text-xs font-medium text-slate-300 flex items-center gap-2">
                    ${icons.comparison}
                    <span>compare</span>
                </h2>
                <div class="hidden md:flex items-center gap-1 p-1 rounded-md bg-white/[0.02] border border-white/5" role="tablist" aria-label="Comparison mode">
                    ${modeMeta.map(({ mode, icon, label }) => {
                        const isActive = manifestComparisonViewMode === mode;
                        return html`
                            <button
                                role="tab"
                                aria-selected=${isActive}
                                @click=${() => uiActions.setManifestComparisonViewMode(mode)}
                                class="px-3 py-1.5 rounded mono text-[11px] transition-colors flex items-center gap-1.5 ${isActive
                                    ? 'bg-white/10 text-slate-100'
                                    : 'text-slate-500 hover:text-slate-200'}"
                            >
                                ${icon} ${label}
                            </button>
                        `;
                    })}
                </div>
                    ${manifestComparisonViewMode === 'table' ? html`
                        <button
                            @click=${() => uiActions.toggleComparisonHideSameRows()}
                            role="switch"
                            aria-checked=${comparisonHideSameRows}
                            aria-label="Show only differing rows"
                            class="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-white/5 border border-transparent transition-colors"
                        >
                            <span class="mono text-[11px] text-slate-400">diff only</span>
                            <span
                                class="relative inline-flex h-5 w-9 items-center rounded-md transition-colors shrink-0 border ${comparisonHideSameRows
                                    ? 'bg-emerald-500/30 border-emerald-500/30'
                                    : 'bg-white/10 border-transparent'}"
                            >
                                <span class="inline-block h-3.5 w-3.5 rounded-sm bg-slate-300 transition-transform ${comparisonHideSameRows ? 'translate-x-[18px]' : 'translate-x-[2px]'}"></span>
                            </span>
                        </button>
                    ` : ''}
                </div>
        </div>
    `;

    const toolbarSelectors = showStreamSelectors ? html`
        <div class="w-full rounded-md border border-white/5 bg-[#0b111c] px-3 py-2 hidden md:block">
                  <div class="flex items-center gap-3">
                          ${streamSelector(
        streams,
        resolvedRefId,
        comparisonReferenceVariantId,
        (id) => uiActions.setComparisonReferenceStreamId(id),
        (vid) => uiActions.setComparisonReferenceVariantId(vid),
        'reference a',
    )}

                          <span class="text-slate-600 shrink-0 px-1" aria-hidden="true">
                              ${icons.arrowRight}
                          </span>

                          ${streamSelector(
        streams,
        resolvedCandId,
        comparisonCandidateVariantId,
        (id) => uiActions.setComparisonCandidateStreamId(id),
        (vid) => uiActions.setComparisonCandidateVariantId(vid),
        'candidate b',
    )}
                      </div>
                  </div>
        </div>` : null;

    // Only update slot if we are the active view (implied) and to avoid loop we rely on the specific
    // subscriptions in `mount`.
    // BUT since we are in `renderComparison`, which is called by subscription, dispatching here IS the recursion risk.
    // The strict fix is to NOT call `setShellSlot` here, but rather in a `useEffect` equivalent or when values change.
    // In this vanilla JS/Lit setup, we should perform the update check.

    // Header content (toolbarTitle/toolbarSelectors) composes in-container
    // below; the old 2-slot shell architecture is gone.
    // 'topBar' is always the Primary Title (Size multiplier irrelevant for Pinned, but determines Base height which is 8vh)
    // 'topBarSecondary' is the flow content.
    // We increase multiplier to make room for Secondary.

    // If showStreamSelectors, we need more space (Base 8vh + Selectors 8vh = 16vh -> Multiplier 2).
    // If Table, just Base 8vh -> Multiplier 1.
    // (topBar/topBarSecondary/main slots composed in-container below)


    const template = html`
        <div class="flex flex-col h-full relative overflow-hidden gap-3">
            <!-- Header (was topBar slot) -->
            <div class="shrink-0 px-2 pt-2 space-y-2">
                ${toolbarTitle} ${toolbarSelectors}
            </div>

            <!-- Main Content -->
            <div
                class="grow min-h-0 relative overflow-y-auto custom-scrollbar"
            >
                ${(() => {
            const activeStreams = targets
                .map((t) => t.stream)
                .filter(
                    (s) => s && s.warnings && s.warnings.length > 0
                );
            const uniqueStreamsWithWarnings = [
                ...new Map(
                    activeStreams.map((s) => [s.id, s])
                ).values(),
            ];

            if (uniqueStreamsWithWarnings.length === 0) return '';

            const total = uniqueStreamsWithWarnings.reduce(
                (acc, s) => acc + s.warnings.length,
                0
            );
            return html`
                <div class="mb-2 rounded-md border border-amber-400/25 bg-amber-500/5 overflow-hidden">
                    <button
                        @click=${() => {
                            comparisonWarningsOpen = !comparisonWarningsOpen;
                            renderComparison();
                        }}
                        aria-expanded=${comparisonWarningsOpen}
                        class="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
                    >
                        <span class="flex items-center gap-2.5 min-w-0">
                            <span class="text-amber-300 shrink-0"
                                >${icons.alertTriangle}</span
                            >
                            <span class="text-[13px] font-medium text-slate-200 truncate">
                                ${total} analysis warning${total === 1 ? '' : 's'} — streams partially loaded
                            </span>
                        </span>
                        <span
                            class="text-slate-500 transition-transform ${comparisonWarningsOpen ? 'rotate-180' : ''}"
                        >
                            ${icons.chevronDown}
                        </span>
                    </button>
                    ${comparisonWarningsOpen
                        ? html`<ul class="px-4 pb-3 pt-1 border-t border-white/5 space-y-1.5">
                              ${uniqueStreamsWithWarnings.flatMap((s) =>
                                  s.warnings.map(
                                      (w) => html`<li class="text-xs text-slate-400 leading-relaxed">
                                          <span class="mono text-[10px] text-slate-500">${s.name} — </span>${typeof w === 'string' ? w : w.message || 'Unnamed warning'}
                                      </li>`
                                  )
                              )}
                          </ul>`
                        : ''}
                </div>
            `;
        })()}
                ${mainContent}
            </div>

            ${bottomBarContent
                ? html`<div
                      class="shrink-0 min-h-0 max-h-[45%] overflow-y-auto custom-scrollbar border-t border-white/5"
                  >
                      ${bottomBarContent}
                  </div>`
                : ''}
            <!-- Mobile Floating Config Menu (FAB) -->
            ${window.innerWidth < 768
            ? fabMenuTemplate({
                // Context items: stream pickers in timeline/manifest modes
                contextItems:
                    manifestComparisonViewMode === 'timeline' ||
                        manifestComparisonViewMode === 'manifest'
                        ? [
                            {
                                id: 'settings',
                                label: 'stream selection',
                                icon: 'settings',
                                onClick: () => {
                                    // Could open a modal or scroll to top for now
                                    // Better UX would be a bottom sheet for mobile selection
                                    // For now we'll just implement basic functionality
                                },
                            },
                        ]
                        : [],
                // Permanent Items: View Modes
                permanentItems: [
                    {
                        id: 'mode-table',
                        label: 'table',
                        icon: 'table',
                        isActive: manifestComparisonViewMode === 'table',
                        onClick: () => {
                            uiActions.setManifestComparisonViewMode(
                                'table'
                            );
                            uiActions.setFabMenuOpen(false);
                        },
                    },
                    {
                        id: 'mode-timeline',
                        label: 'timeline',
                        icon: 'timeline',
                        isActive:
                            manifestComparisonViewMode === 'timeline',
                        onClick: () => {
                            uiActions.setManifestComparisonViewMode(
                                'timeline'
                            );
                            uiActions.setFabMenuOpen(false);
                        },
                    },
                    {
                        id: 'mode-manifest',
                        label: 'structural',
                        icon: 'code',
                        isActive:
                            manifestComparisonViewMode === 'manifest',
                        onClick: () => {
                            uiActions.setManifestComparisonViewMode(
                                'manifest'
                            );
                            uiActions.setFabMenuOpen(false);
                        },
                    },
                ],
                isOpen: useUiStore.getState().fabMenu.isOpen,
                activeSubMenu:
                    useUiStore.getState().fabMenu.activeSubMenu,
                onToggle: () => uiActions.toggleFabMenu(),
                onSubMenuChange: (id) => uiActions.setFabSubMenu(id),
                // Side Menu (Toggles)
                isSideMenuOpen: useUiStore.getState().fabSideMenuOpen,
                onSideToggle: () => uiActions.toggleFabSideMenu(),
                sideItems:
                    manifestComparisonViewMode === 'table'
                        ? [
                            {
                                id: 'toggle-diff',
                                label: 'diff only',
                                icon: 'eye',
                                isActive: comparisonHideSameRows,
                                onClick: () =>
                                    uiActions.toggleComparisonHideSameRows(),
                            },
                        ]
                        : [],
            })
            : ''}

            <!-- Mobile Config Modal (Triggered by FAB Settings) -->
            ${useUiStore.getState().comparisonSelectorsExpanded
            ? html`
                      <div
                          class="fixed inset-0 z-[60] bg-black/70 flex items-end sm:items-center justify-center p-4"
                          @click=${() => uiActions.toggleComparisonSelectors()}
                          role="dialog"
                          aria-modal="true"
                          aria-label="Comparison streams"
                      >
                          <div
                              class="bg-[#0b111c] border border-white/10 rounded-md w-full max-w-sm p-4 max-h-[85vh] overflow-y-auto custom-scrollbar"
                              @click=${(e) => e.stopPropagation()}
                          >
                              <div
                                  class="flex items-center justify-between border-b border-white/5 pb-3 mb-3"
                              >
                                  <h3
                                      class="mono text-[11px] font-medium text-slate-400"
                                  >
                                      compare streams
                                  </h3>
                                  <button
                                      @click=${() =>
                    uiActions.toggleComparisonSelectors()}
                                      class="p-1.5 text-slate-500 hover:text-slate-100 hover:bg-white/5 rounded-md transition-colors"
                                      aria-label="Close stream picker"
                                  >
                                      ${icons.x}
                                  </button>
                              </div>

                              <div class="space-y-3">
                                  ${streamSelector(
                        streams,
                        comparisonReferenceStreamId ||
                        streams[0].id,
                        comparisonReferenceVariantId,
                        (id) =>
                            uiActions.setComparisonReferenceStreamId(
                                id
                            ),
                        (vid) =>
                            uiActions.setComparisonReferenceVariantId(
                                vid
                            ),
                        'reference a',
                    )}

                                  <div
                                      class="flex items-center gap-2 py-1"
                                      aria-hidden="true"
                                  >
                                      <span class="h-px bg-white/5 grow"></span>
                                      <span class="mono text-[10px] text-slate-600"
                                          >vs</span
                                      >
                                      <span class="h-px bg-white/5 grow"></span>
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
                        'candidate b',
                    )}
                                  </div>

                                  <button
                                      @click=${() =>
                                        uiActions.toggleComparisonSelectors()}
                                      class="w-full py-2.5 border border-white/10 bg-white/[0.02] hover:bg-white/5 text-slate-200 text-[13px] font-medium rounded-md transition-colors"
                                  >
                                      done
                                  </button>
                              </div>
                          </div>
                      </div>
                  `
            : ''}
        </div>
    `;

    render(template, container);
}

export const comparisonView = {
    hasContextualSidebar: false,
    mount(containerElement) {
        container = containerElement;

        const renderFn = () => renderComparison();

        // 1. Subscribe to Data (Analysis Store)
        subscriptions.push(useAnalysisStore.subscribe(renderFn));

        // 2. Subscribe to UI State (Filtered to prevent loops)
        // We only re-render if specific view-control flags change.
        // We explicitly Do NOT watch 'shell' or 'slots' to avoid the recursion loop
        // where renderComparison -> setShellSlot -> uiStore update -> renderComparison.
        subscriptions.push(useUiStore.subscribe((state, prevState) => {
            const watchedKeys = [
                'comparisonHideSameRows',
                'comparisonReferenceStreamId',
                'comparisonReferenceVariantId',
                'comparisonCandidateStreamId',
                'comparisonCandidateVariantId',
                'manifestComparisonViewMode',
                'comparisonSelectorsExpanded'
            ];

            const hasChanged = watchedKeys.some(key => state[key] !== prevState[key]);
            if (hasChanged) {
                renderFn();
            }
        }));

        renderComparison();
    },
    unmount() {
        subscriptions.forEach((unsub) => unsub());
        subscriptions = [];

        if (container) render(html``, container);
        container = null;
    },
};


