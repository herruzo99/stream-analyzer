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

// --- Helper for HLS Variant Items in Dropdown ---
const variantItem = (v, activeId, onSelect) => {
    const id = v.stableId || v.id;
    const isActive = activeId === id;
    const label = `${v.attributes.RESOLUTION || 'Unspecified'
        } @ ${formatBitrate(v.attributes.BANDWIDTH)}`;

    return html`
        <button
            @click=${(e) => {
            e.stopPropagation();
            onSelect(id);
        }}
            class="w-full text-left pl-8 pr-3 py-2 text-xs font-mono flex items-center justify-between transition-colors hover:bg-slate-100/5 ${isActive
            ? 'text-blue-400 font-bold'
            : 'text-slate-400'}"
        >
            <span>${label}</span>
            ${isActive
            ? html`<span class="scale-75 text-blue-400"
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
    accentColor = 'text-blue-400',
    containerClass = ''
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
            subLabel = `Variant: ${variant.attributes.RESOLUTION || 'Unspecified'
                } (${formatBitrate(variant.attributes.BANDWIDTH)})`;
        } else if (currentVariantId === 'master') {
            subLabel = 'Master Playlist';
        }
    }

    // Visual badge colors
    const badgeBorder = isLive
        ? 'border-red-500/30'
        : 'border-slate-800';
    const badgeBg = isLive
        ? 'bg-red-500/20'
        : 'bg-slate-900';
    const badgeText = isLive
        ? 'text-red-400'
        : 'text-slate-400';

    const renderDropdownContent = () => html`
        <div
            class="dropdown-panel bg-slate-800/95 backdrop-blur-3xl border border-slate-800 rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.8)] w-[400px] p-2 ring-1 ring-slate-800 animate-scaleIn max-h-[70vh] overflow-y-auto custom-scrollbar relative overflow-hidden"
        >
            <!-- Decorative Glow -->
            <div class="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[60px] pointer-events-none"></div>
            <div
                class="px-4 py-3 border-b border-slate-800 mb-2 flex justify-between items-center sticky top-0 bg-slate-800/95 z-20 backdrop-blur-md"
            >
                <div class="flex flex-col">
                    <span
                        class="text-[10px] font-black ${accentColor} uppercase tracking-[0.2em]"
                        >Select Source</span
                    >
                    <span class="text-[9px] text-slate-400">Choose a stream to compare</span>
                </div>
                <span
                    class="text-[9px] bg-slate-900/40 border border-slate-800 text-slate-400 px-2 py-1 rounded-full font-mono"
                    >${streams.length} Available</span
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
                        class="rounded-xl overflow-hidden transition-all duration-300 ${isSelectedStream
                ? 'bg-slate-800 border border-blue-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.2)]'
                : 'hover:bg-slate-800 border border-transparent'}"
                    >
            <button
                @click=${() => {
                onSelectStream(s.id);
                // Default to master/root when switching streams
                onSelectVariant(null);
                closeDropdown();
            }}

                            class="w-full text-left p-3 flex items-center gap-4 group relative"
                        >
                            <div
                                class="w-10 h-10 rounded-lg bg-slate-900/30 border border-slate-800 flex flex-col items-center justify-center shrink-0 shadow-inner group-hover:border-slate-400/30 transition-colors"
                            >
                                <span class="font-black text-[9px] text-slate-400 group-hover:text-slate-100 transition-colors">${s.protocol.toUpperCase()}</span>
                                ${s.manifest?.type === 'dynamic' ? html`<div class="w-1 h-1 rounded-full bg-red-500 shadow-[0_0_5px_#ef4444] mt-0.5"></div>` : ''}
                            </div>
                            
                            <div class="grow min-w-0 flex flex-col gap-0.5">
                                <div
                                    class="font-bold text-sm text-slate-100 group-hover:text-white truncate transition-colors"
                                >
                                    ${s.name}
                                </div>
                                <div
                                    class="text-[10px] text-slate-400 font-mono truncate opacity-70 group-hover:opacity-100 transition-opacity"
                                >
                                    ${new URL(s.originalUrl).hostname}
                                </div>
                            </div>
                            
                            ${isActiveMaster
                ? html`<span
                                      class="text-teal-300 drop-shadow-[0_0_8px_rgba(20,184,166,0.5)]"
                                      >${icons.checkCircle}</span
                                  >`
                : ''}
                        </button>

                        <!-- Variant List for HLS -->
                        ${isMaster
                ? html`
                                  <div
                                      class="border-t border-slate-800 bg-black/10"
                                  >
                                      <button
                                          @click=${() => {
                        onSelectStream(s.id);
                        onSelectVariant('master');
                        closeDropdown();
                    }}
                                          class="w-full text-left pl-8 pr-3 py-2 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between transition-colors hover:bg-slate-100/5 ${isActiveMaster
                        ? 'text-blue-400'
                        : 'text-slate-400'}"
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
        <div class="relative flex-1 min-w-0 ${containerClass}">
             <!-- Label Header -->
             <div class="flex items-center justify-center mb-1.5 px-1">
                 <span class="text-[10px] font-black uppercase tracking-[0.2em] ${accentColor} drop-shadow-sm">
                     ${label}
                 </span>
             </div>

             <!-- Selector Card -->
             <button
                class="w-full relative group perspective-1000 outline-none"
                @click=${(e) => toggleDropdown(e.currentTarget, renderDropdownContent, e)}
            >
                <div class="
                    relative overflow-hidden
                    bg-slate-800/40 hover:bg-slate-800/60
                    border border-slate-800 hover:border-slate-400/30
                    rounded-xl p-3
                    transition-all duration-300 ease-out
                    flex items-center gap-4
                    group-hover:translate-y-[-1px] group-hover:shadow-[0_10px_30px_rgba(0,0,0,0.3)]
                    backdrop-blur-md
                ">
                    <!-- Glass Shine Effect -->
                    <div class="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                    
                    <!-- Protocol Badge -->
                    <div class="
                        w-12 h-12 rounded-lg 
                        ${badgeBg} ${badgeBorder} border
                        flex flex-col items-center justify-center shrink-0
                        transition-transform duration-300 group-hover:scale-105
                        relative overflow-hidden
                    ">
                         <div class="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                         <span class="text-[10px] ${badgeText}">${protocol}</span>
                         ${isLive ? html`<span class="text-[8px] ${badgeText} tracking-widest mt-0.5">LIVE</span>` : ''}
                    </div>

                    <!-- Info -->
                    <div class="grow min-w-0 flex flex-col gap-0.5 text-left">
                        <span class="text-sm font-bold text-slate-100 truncate group-hover:text-white transition-colors leading-tight">
                            ${selectionLabel}
                        </span>
                        <div class="flex items-center gap-2">
                             <span class="text-[10px] text-slate-400 font-mono opacity-70 truncate max-w-full">
                                 ${subLabel}
                             </span>
                        </div>
                    </div>

                    <!-- Dropdown Arrow -->
                    <div class="shrink-0 w-8 h-8 rounded-full bg-slate-900/20 flex items-center justify-center text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-950 transition-all duration-300 group-hover:rotate-90">
                        ${icons.chevronRight || icons.chevronDown}
                    </div>
                </div>
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
        manifestComparisonViewMode
    } = useUiStore.getState();
    // Port: no themes in 1.2.0; solid styling throughout.
    const theme = 'solid';

    // Allow comparison if at least 1 stream is present (for Master vs Variant analysis)
    if (streams.length === 0) {
        render(
            html`
                <div
                    class="flex flex-col items-center justify-center h-full text-slate-400 gap-4 animate-fadeIn"
                >
                    <div
                        class="p-6 bg-slate-800 rounded-full border border-slate-800 shadow-lg"
                    >
                        ${icons.comparison}
                    </div>
                    <h2
                        class="text-xl font-bold text-slate-200"
                    >
                        Comparison Mode
                    </h2>
                    <p>Please load a stream to enable comparison.</p>
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
            streams.find((s) => s.id !== resolvedRefId)?.id || resolvedRefId;
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
        const refTarget = targets.find((t) => t.stream.id === resolvedRefId);
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

    // Correctly apply Glass Layout primitives
    if (manifestComparisonViewMode === 'timeline') {
        const refStream = streams.find((s) => s.id === resolvedRefId);
        const candStream = streams.find((s) => s.id === resolvedCandId);

        if (refStream && candStream) {
            const diffData = calculateSemanticDiff(
                refStream,
                candStream,
                comparisonReferenceVariantId,
                comparisonCandidateVariantId
            );
            mainContent = html`
                <div class="h-full w-full flex flex-col relative z-10 animate-fadeIn">
                    <div
                        class="layout-card grow w-full h-full relative overflow-hidden group ${theme === 'solid' ? 'border border-slate-800' : ''}"
                        style="--region-padding: 1.5rem;"
                    >
                         <!-- layout-card automatically handles border, radius, shadow, backdrop -->
                        
                        <!-- Inner Glow -->
                        <div
                            class="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 opacity-50 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                        ></div>

                        <div
                            class="absolute inset-0 opacity-[0.05] pointer-events-none"
                            style="background-size: 40px 40px; background-image: radial-gradient(circle, #f1f5f9 1px, transparent 1px);"
                        ></div>
                        
                        <div class="layout-body p-0 custom-scrollbar">
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
            <div class="flex flex-col h-full gap-[0.75rem] relative z-10 min-h-0">
                <div class="grid grid-cols-1 xl:grid-cols-2 gap-[0.75rem] flex-1 min-h-0">
                    <div class="layout-card p-4 flex flex-col group relative overflow-hidden transition-all duration-500 min-h-0 ${theme === 'solid' ? 'border border-slate-800' : ''}">
                        <!-- Inner Glow -->
                        <div class="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                        <h3 class="text-[10px] font-bold text-blue-400 mb-2 flex items-center gap-2 uppercase tracking-widest relative z-10 shrink-0">
                            ${icons.trendingUp} Bitrate Ladder
                        </h3>
                        <div class="grow relative min-h-0 z-10">
                            <abr-ladder-chart .data=${viewModel.abrData}></abr-ladder-chart>
                        </div>
                    </div>
                    <div class="layout-card p-4 flex flex-col group relative overflow-hidden transition-all duration-500 min-h-0 ${theme === 'solid' ? 'border border-slate-800' : ''}">
                        <!-- Inner Glow -->
                        <div class="absolute inset-0 bg-gradient-to-bl from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                        <h3 class="text-[10px] font-bold text-purple-300 mb-2 flex items-center gap-2 uppercase tracking-widest relative z-10 shrink-0">
                            ${icons.features} Feature Matcher
                        </h3>
                        <div class="grow relative min-h-0 overflow-auto custom-scrollbar">
                            ${capabilityMatrixTemplate(streams)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // --- Bottom Tab Injection (in-flow; 1.2.0 has no bottomBar slot) ---
    let bottomBarContent = null;

    // 1. Table View
    if (manifestComparisonViewMode === 'table') {
        const tableContent = html`
            <div class="w-full h-full max-h-full flex flex-col relative min-h-0 overflow-hidden">
                 <div class="absolute inset-x-0 -top-6 flex justify-center z-0 pointer-events-none">
                    <div class="h-6 w-32 bg-slate-800 rounded-t-xl opacity-50 blur-sm"></div>
                </div>
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
        const refStream = streams.find((s) => s.id === resolvedRefId);
        const candStream = streams.find((s) => s.id === resolvedCandId);

        if (refStream && candStream) {
            const manifestContent = html`
                <div class="w-full h-full max-h-full flex flex-col relative min-h-0 overflow-hidden">
                     <div class="absolute inset-x-0 -top-6 flex justify-center z-0 pointer-events-none">
                        <div class="h-6 w-32 bg-slate-800 rounded-t-xl opacity-50 blur-sm"></div>
                    </div>
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

    const toolbarTitle = html`
         <div class="w-full h-full flex flex-col justify-center px-0 sm:px-0 gap-2 py-0">
                <!-- Row 1: Title & View Mode -->
                <div class="flex items-center justify-between w-full h-full">
                    <div class="flex items-center gap-8">
                        <div>
                            <h2 class="text-lg md:text-xl font-bold text-slate-200 flex items-center gap-2">
                                <span class="p-1.5 rounded-lg bg-slate-900/50 border border-slate-800 shadow-sm text-blue-400">
                                    ${icons.comparison}
                                </span>
                                <span class="hidden md:inline">Stream Comparison</span><span class="md:hidden">Compare</span>
                            </h2>
                        </div>

                        <!-- View Mode Selector (Desktop) -->
                        <div class="hidden md:flex items-center">
                            <div class="flex items-center p-1 rounded-full bg-slate-800 backdrop-blur-md border border-slate-800 shadow-inner">
                                ${['table', 'timeline', 'manifest'].map(
        (mode) => {
            const isActive = manifestComparisonViewMode === mode;
            const iconsMap = {
                table: icons.table,
                timeline: icons.timeline,
                manifest: icons.code,
            };
            const labelsMap = {
                table: 'Table',
                timeline: 'Timeline',
                manifest: 'Structural',
            };

            return html`
                                            <button
                                                @click=${() => uiActions.setManifestComparisonViewMode(mode)}
                                                class="relative px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 flex items-center gap-2 overflow-hidden group ${isActive
                    ? 'text-slate-100 shadow-[0_0_20px_#3b82f6]'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-100/5'}"
                                            >
                                                <!-- Active Background Glow -->
                                                ${isActive
                    ? html`<div class="absolute inset-0 bg-gradient-to-r from-[#60a5fa] to-purple-400 opacity-80"></div>`
                    : ''}

                                                <!-- Content -->
                                                <span class="relative z-10 flex items-center gap-2">
                                                    ${iconsMap[mode]}
                                                    ${labelsMap[mode]}
                                                </span>
                                            </button>
                                        `;
        }
    )}
                            </div>
                        </div>
                    </div>
                     <!-- Diff Toggle (Table Mode) -->
                    ${manifestComparisonViewMode === 'table' ? html`
                        <div class="flex items-center gap-3">
                              <label class="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-800">
                                  <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Diff Only</span>
                                  <button
                                      @click=${() => uiActions.toggleComparisonHideSameRows()}
                                      role="switch"
                                      aria-checked="${comparisonHideSameRows}"
                                      class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${comparisonHideSameRows
                ? 'bg-[#60a5fa]'
                : 'bg-slate-900/50 border border-slate-800'}"
                                  >
                                      <span class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${comparisonHideSameRows ? 'translate-x-4.5' : 'translate-x-1'}"></span>
                                  </button>
                              </label>
                        </div>
                    ` : ''}
                </div>
        </div>
    `;

    const toolbarSelectors = showStreamSelectors ? html`
        <div class="w-full flex items-center justify-center h-full px-0 sm:px-0">
                  <div class="hidden md:flex items-center justify-center gap-4 animate-fadeIn w-full relative">
                      <!-- Container Background -->
                      <div class="absolute inset-0 bg-slate-800 rounded-lg -z-10 border border-slate-800/50"></div>
                      
                      <div class="flex items-center gap-4 px-4 py-1 w-full justify-between">
                          ${streamSelector(
        streams,
        resolvedRefId,
        comparisonReferenceVariantId,
        (id) => uiActions.setComparisonReferenceStreamId(id),
        (vid) => uiActions.setComparisonReferenceVariantId(vid),
        'Reference (A)',
        'text-blue-400'
    )}

                          <div class="flex flex-col items-center justify-center text-slate-400 gap-1 px-2 shrink-0">
                              <div class="text-[9px] font-bold uppercase tracking-wider opacity-50">Diff</div>
                              <div class="p-1.5 rounded-full bg-slate-800 border border-slate-800">
                                  ${icons.arrowRight}
                              </div>
                          </div>

                          ${streamSelector(
        streams,
        resolvedCandId,
        comparisonCandidateVariantId,
        (id) => uiActions.setComparisonCandidateStreamId(id),
        (vid) => uiActions.setComparisonCandidateVariantId(vid),
        'Candidate (B)',
        'text-purple-300'
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

            const toggleDetails = (e) => {
                const details = e.currentTarget.nextElementSibling;
                const icon =
                    e.currentTarget.querySelector('.chevron-icon');
                if (details.style.maxHeight) {
                    details.style.maxHeight = null;
                    icon.style.transform = 'rotate(0deg)';
                } else {
                    details.style.maxHeight =
                        details.scrollHeight + 'px';
                    icon.style.transform = 'rotate(180deg)';
                }
            };

            return html`
                        <div
                            class="mb-6 animate-fadeIn relative z-20"
                        >
                            <div
                                class="bg-amber-500/5 backdrop-blur-xl border border-amber-500/20 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(234,179,8,0.1)] transition-all duration-300 hover:shadow-[0_0_40px_rgba(234,179,8,0.2)] hover:border-amber-500/40 group"
                            >
                                <!-- Header -->
                                <button
                                    @click=${toggleDetails}
                                    class="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-amber-500/5 transition-colors"
                                >
                                    <div class="flex items-center gap-4">
                                        <div
                                            class="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 shadow-inner border border-amber-500/20 group-hover:scale-110 transition-transform duration-300"
                                        >
                                            ${icons.alertTriangle}
                                        </div>
                                        <div class="text-left">
                                            <h4
                                                class="text-sm font-bold text-amber-400 flex items-center gap-2"
                                            >
                                                Analysis Warnings Detected
                                                <span
                                                    class="px-2 py-0.5 rounded-full bg-amber-500/10 text-[10px] border border-amber-500/20"
                                                >
                                                    ${uniqueStreamsWithWarnings.reduce(
                (acc, s) =>
                    acc +
                    s.warnings.length,
                0
            )}
                                                    Issues
                                                </span>
                                            </h4>
                                            <p
                                                class="text-xs text-slate-400 mt-0.5"
                                            >
                                                Some streams encountered errors
                                                during analysis but were
                                                partially loaded.
                                            </p>
                                        </div>
                                    </div>
                                    <div
                                        class="chevron-icon text-amber-400 transition-transform duration-300"
                                    >
                                        ${icons.chevronDown}
                                    </div>
                                </button>

                                <!-- Details (Collapsible) -->
                                <div
                                    class="max-h-0 overflow-hidden transition-all duration-500 ease-in-out bg-slate-800/30"
                                >
                                    <div
                                        class="p-4 pt-0 border-t border-amber-500/10 space-y-4"
                                    >
                                        ${uniqueStreamsWithWarnings.map(
                (s) => html`
                                                <div
                                                    class="bg-slate-900/50 rounded-xl p-3 border border-slate-800"
                                                >
                                                    <div
                                                        class="flex items-center gap-2 mb-2"
                                                    >
                                                        <div
                                                            class="w-1.5 h-1.5 rounded-full bg-amber-500"
                                                        ></div>
                                                        <span
                                                            class="text-xs font-bold text-slate-100"
                                                            >${s.name}</span
                                                        >
                                                        <span
                                                            class="text-[10px] font-mono text-slate-400 opacity-50"
                                                            >(${s.id})</span
                                                        >
                                                    </div>
                                                    <ul
                                                        class="space-y-1.5 ml-3.5 border-l border-slate-800 pl-3"
                                                    >
                                                        ${s.warnings.map(
                    (w) => html`
                                                                <li
                                                                    class="text-xs text-slate-400 flex items-start gap-2"
                                                                >
                                                                    <span
                                                                        class="mt-1 w-1 h-1 rounded-full bg-slate-400 opacity-50 shrink-0"
                                                                    ></span>
                                                                    <span
                                                                        class="leading-relaxed"
                                                                        >${w.message}</span
                                                                    >
                                                                </li>
                                                            `
                )}
                                                    </ul>
                                                </div>
                                            `
            )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
        })()}
                ${mainContent}
            </div>

            ${bottomBarContent
                ? html`<div
                      class="shrink-0 min-h-0 max-h-[45%] overflow-y-auto custom-scrollbar border-t border-slate-800"
                  >
                      ${bottomBarContent}
                  </div>`
                : ''}
            <!-- Mobile Floating Config Menu (FAB) -->
            ${window.innerWidth < 768
            ? fabMenuTemplate({
                // Context Items: Only show Stream Selection in Timeline/Manifest modes
                contextItems:
                    manifestComparisonViewMode === 'timeline' ||
                        manifestComparisonViewMode === 'manifest'
                        ? [
                            {
                                id: 'settings',
                                label: 'Stream Selection',
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
                        label: 'Table View',
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
                        label: 'Timeline View',
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
                        label: 'Manifest Diff',
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
                                label: 'Diff Only',
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
                          class="fixed inset-0 z-[60] bg-slate-800/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4 animate-fadeIn"
                          @click=${() => uiActions.toggleComparisonSelectors()}
                      >
                          <div
                              class="bg-slate-800/80 backdrop-blur-3xl border border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-scaleIn space-y-6 ring-1 ring-slate-800 relative overflow-hidden"
                              @click=${(e) => e.stopPropagation()}
                          >
                              <!-- Ambient Glow -->
                              <div
                                  class="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-[50px] pointer-events-none"
                              ></div>
                              <div
                                  class="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/20 rounded-full blur-[50px] pointer-events-none"
                              ></div>

                              <div
                                  class="relative z-10 flex items-center justify-between border-b border-slate-800 pb-4"
                              >
                                  <h3
                                      class="text-lg font-bold text-slate-100 flex items-center gap-2"
                                  >
                                      ${icons.slidersHorizontal} Configuration
                                  </h3>
                                  <button
                                      @click=${() =>
                    uiActions.toggleComparisonSelectors()}
                                      class="text-slate-400 hover:text-slate-100 transition-colors hover:bg-slate-100/10 p-1 rounded-full"
                                  >
                                      ${icons.xCircle}
                                  </button>
                              </div>

                              <div class="relative z-10 space-y-4">
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
                        'Reference (A)',
                        'text-blue-400'
                    )}

                                  <div
                                      class="flex items-center justify-center text-slate-600 gap-2 py-2"
                                  >
                                      <span
                                          class="text-[10px] font-bold uppercase tracking-wider opacity-50 text-slate-400"
                                          >VS</span
                                      >
                                      <div
                                          class="h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent grow"
                                      ></div>
                                      <div
                                          class="flex items-center justify-center text-slate-400 gap-2 py-2"
                                      >
                                          <div
                                              class="h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent grow"
                                          ></div>
                                          <span
                                              class="text-[10px] font-bold uppercase tracking-wider opacity-50 text-slate-400"
                                              >VS</span
                                          >
                                          <div
                                              class="h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent grow"
                                          ></div>
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
                        'text-purple-300'
                    )}
                                  </div>

                                  <button
                                      @click=${() =>
                    uiActions.toggleComparisonSelectors()}
                                      class="relative z-10 w-full py-3 bg-gradient-to-r from-[#60a5fa] to-blue-500 hover:from-blue-500 hover:to-[#60a5fa] text-slate-100 font-bold rounded-xl transition-all shadow-[0_0_20px_#3b82f6] hover:shadow-[0_0_30px_#3b82f6] hover:scale-[1.02]"
                                  >
                                      Apply Changes
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

// Inject custom keyframe styles (the layout-engine string had no 1.2.0
// equivalent and is dropped; animations below are self-contained).
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse-slow {
        0%, 100% { opacity: 0.3; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(1.1); }
    }
    .animate-pulse-slow {
        animation: pulse-slow 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
`;
document.head.appendChild(style);
