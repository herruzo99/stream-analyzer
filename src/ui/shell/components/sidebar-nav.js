import { hasMissingTooltips } from '@/features/parserCoverage/domain/tooltip-coverage-analyzer';
import { isDebugMode } from '@/shared/utils/env';
import { useAnalysisStore } from '@/state/analysisStore';
import { useQualityStore } from '@/state/qualityStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';


class SidebarNav extends HTMLElement {
    constructor() {
        super();
        this._updatePending = false;
        this.unsubs = [];
    }

    connectedCallback() {
        // Subscribe to stores
        this.unsubs.push(useUiStore.subscribe(() => this._enqueueRender()));
        this.unsubs.push(
            useAnalysisStore.subscribe(() => this._enqueueRender())
        );
        this.unsubs.push(
            useQualityStore.subscribe(() => this._enqueueRender())
        );

        // Initial render
        this._enqueueRender();
    }

    disconnectedCallback() {
        this.unsubs.forEach((unsub) => unsub());
        this.unsubs = [];
    }

    _enqueueRender() {
        if (this._updatePending) return;
        this._updatePending = true;
        // Schedule render for next microtask to batch simultaneous store updates
        Promise.resolve().then(() => {
            this._updatePending = false;
            this.render();
        });
    }

    getNavGroups() {
        const { streams, activeStreamId } = useAnalysisStore.getState();
        const { activeSegmentUrl, adDetectionPreferences } =
            useUiStore.getState();
        const { jobs } = useQualityStore.getState();

        // QC Status
        const jobList = Array.from(jobs.values());
        const runningJobs = jobList.filter((j) => j.status === 'running');
        const failedJobs = jobList.filter((j) => j.status === 'error');
        const completedJobs = jobList.filter((j) => j.status === 'complete');

        let qcBadge = null;
        let qcBadgeColor = 'bg-[#60a5fa]';
        let qcProgress = 0;

        if (runningJobs.length > 0) {
            const avgProgress =
                runningJobs.reduce((acc, j) => acc + j.progress, 0) /
                runningJobs.length;
            qcProgress = avgProgress;
            qcBadge =
                runningJobs.length === 1
                    ? `${Math.floor(avgProgress)}%`
                    : `${runningJobs.length} Run`;
        } else if (failedJobs.length > 0) {
            qcBadge = `${failedJobs.length} Err`;
            qcBadgeColor = 'bg-red-500';
        } else if (completedJobs.length > 0) {
            qcBadge = `${completedJobs.length} Done`;
            qcBadgeColor = 'bg-emerald-500';
        }

        const activeStream = streams.find((s) => s.id === activeStreamId);

        const hasComplianceIssues =
            activeStream?.manifestUpdates?.[0]?.complianceResults?.some(
                (r) => r.status === 'fail'
            );
        const hasCoverageIssues =
            isDebugMode && (activeStream?.coverageReport || []).length > 0;
        const hasManifestWarnings = hasMissingTooltips(activeStream);

        return [
            {
                title: 'Analysis',
                items: [
                    {
                        key: 'summary',
                        label: 'Overview',
                        icon: icons.summary,
                        visible: true,
                    },
                    {
                        key: 'comparison',
                        label: 'Comparison',
                        icon: icons.comparison,
                        visible: streams.length > 1,
                        badge:
                            streams.length > 1 ? String(streams.length) : null,
                        badgeColor:
                            'bg-slate-800 border border-slate-800',
                    },
                    {
                        key: 'compliance',
                        label: 'Compliance',
                        icon: icons.compliance,
                        visible: true,
                        hasError: hasComplianceIssues,
                    },
                    {
                        key: 'regression',
                        label: 'Regression Tests',
                        icon: icons.beaker,
                        visible: true,
                    },
                    {
                        key: 'integrators-report',
                        label: 'Integrator Report',
                        icon: icons.integrators,
                        visible: true,
                    },
                    {
                        key: 'features',
                        label: 'Feature Matrix',
                        icon: icons.features,
                        visible: true,
                    },
                ],
            },
            {
                title: 'Inspection',
                items: [
                    {
                        key: 'interactive-manifest',
                        label: 'Manifest View',
                        icon: icons.interactiveManifest,
                        visible: true,
                        hasWarning: hasManifestWarnings,
                    },
                    {
                        key: 'explorer',
                        label: 'Segment Explorer',
                        icon: icons.folderTree,
                        visible: true,
                    },
                    {
                        key: 'interactive-segment',
                        label: 'Bitstream Viewer',
                        icon: icons.binary,
                        visible: !!activeSegmentUrl,
                        badge: activeSegmentUrl ? 'Active' : null,
                        badgeColor: 'bg-[#60a5fa]',
                    },
                    {
                        key: 'segment-comparison',
                        label: 'Comparisons',
                        icon: icons.comparison,
                        visible: useUiStore.getState().segmentMatrixClickMode === 'compare' || (useAnalysisStore.getState().segmentsForCompare && useAnalysisStore.getState().segmentsForCompare.length > 0),
                        badge: (() => {
                            const count = useAnalysisStore.getState().segmentsForCompare?.length || 0;
                            return count > 0 ? String(count) : '0';
                        })(),
                        badgeColor: 'bg-purple-500',
                    },
                    {
                        key: 'timeline',
                        label: 'Timeline',
                        icon: icons.timeline,
                        visible: true,
                    },
                    {
                        key: 'network',
                        label: 'Network Waterfall',
                        icon: icons.network,
                        visible: true,
                    },
                    {
                        key: 'drm',
                        label: 'DRM Workbench',
                        icon: icons.shieldCheck,
                        visible: true,
                    },
                    {
                        key: 'updates',
                        label: 'Live Updates',
                        icon: icons.updates,
                        visible: activeStream?.manifest?.type === 'dynamic',
                        badge: 'LIVE',
                        badgeColor:
                            'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse',
                    },
                ],
            },
            {
                title: 'Playback & QC',
                items: [
                    {
                        key: 'player-simulation',
                        label: 'Player Sim',
                        icon: icons.play,
                        visible: !!activeStream?.originalUrl,
                    },
                    {
                        key: 'multi-player',
                        label: 'Multi-View',
                        icon: icons.grid,
                        visible: streams.length > 0,
                    },
                    {
                        key: 'qc-dashboard',
                        label: 'Signal Quality',
                        icon: icons.activity,
                        visible: true,
                        badge: qcBadge,
                        badgeColor: qcBadge
                            ? `${qcBadgeColor}/20 text-slate-100 border border-slate-800/30`
                            : '',
                        progress: qcProgress,
                        hasError:
                            failedJobs.length > 0 && runningJobs.length > 0,
                    },
                    {
                        key: 'advertising',
                        label: 'Ad Verification',
                        icon: icons.advertising,
                        visible: true,
                        badge: (() => {
                            const avails = activeStream?.adAvails || [];
                            const filtered = avails.filter((a) => {
                                if (a.id === 'unconfirmed-inband-scte35')
                                    return true;
                                return (
                                    adDetectionPreferences?.[
                                    a.detectionMethod
                                    ] ?? true
                                );
                            });
                            return filtered.length > 0
                                ? String(filtered.length)
                                : null;
                        })(),
                        badgeColor:
                            'bg-purple-500/20 text-purple-300 border border-purple-500/30',
                    },
                ],
            },
            {
                title: 'Developer',
                items: [
                    {
                        key: 'parser-coverage',
                        label: 'Parser Coverage',
                        icon: icons.parserCoverage,
                        visible: isDebugMode,
                        hasWarning: hasCoverageIssues,
                    },
                ],
            },
        ];
    }

    renderNavItem(item, activeTab, isCompact) {
        const isActive = activeTab === item.key;

        const baseClasses =
            'group relative flex items-center gap-3 px-3 py-2.5 my-1.5 text-sm font-medium transition-all duration-300 overflow-hidden cursor-pointer select-none border';

        // Compact Mode Adjustments
        const compactClasses = isCompact ? 'justify-center px-0' : '';

        // Dynamic styles injected via styleMap in the template, but we use classes for the base structure.
        // We need to move away from hardcoded Tailwind utility classes for things that change between Prism/Pro.

        const activeClasses =
            'text-slate-100 border-blue-500/30 ring-1 ring-blue-500/10';
        const inactiveClasses =
            'border-transparent text-slate-400 hover:text-slate-100 hover:border-slate-800/50';

        const containerClasses = `${baseClasses} ${compactClasses} ${isActive ? activeClasses : inactiveClasses}`;

        const iconColorClass = isActive
            ? 'text-blue-400 drop-shadow-[0_0_8px_#3b82f6]'
            : 'text-slate-400 group-hover:text-slate-100 transition-colors';

        // --- Active Indicator Glow (Left) ---
        const activeIndicator = isActive
            ? html`<div
                  class="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-blue-500 to-[#60a5fa] rounded-r-full shadow-[0_0_12px_#3b82f6] z-20"
              ></div>`
            : '';

        // --- Progress Background (e.g. for QC) ---
        const progressBg =
            item.progress && item.progress > 0 && !isCompact
                ? html`<div
                      class="absolute bottom-0 left-0 h-[3px] bg-gradient-to-r from-blue-500 to-[#60a5fa] transition-all duration-500 rounded-full"
                      style="width: ${item.progress}%"
                  ></div>`
                : '';

        // --- Status Badge ---
        let statusElement = html``;
        if (!isCompact) {
            if (item.badge) {
                statusElement = html`
                    <span
                        class="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-md ${item.badgeColor} shadow-sm tabular-nums tracking-wide flex items-center justify-center min-w-[20px]"
                    >
                        ${item.badge}
                    </span>
                `;
            } else if (item.hasError) {
                statusElement = html`<div
                    class="ml-auto w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444] animate-pulse"
                ></div>`;
            } else if (item.hasWarning) {
                statusElement = html`<div
                    class="ml-auto w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_10px_#f59e0b]"
                ></div>`;
            }
        } else {
            // Compact Mode Indicators (Dot overlay on icon)
            if (item.hasError || item.badgeColor?.includes('error')) {
                statusElement = html`<div class="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 border border-slate-800 z-10 animate-pulse"></div>`;
            } else if (item.badge) {
                statusElement = html`<div class="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500 border border-slate-800 z-10"></div>`;
            }
        }

        // Tooltip for Compact Mode
        const tooltip = isCompact ? item.label : '';

        return html`
            <a
                href="#"
                class="${containerClasses}"
                data-tooltip="${tooltip}"
                data-tooltip-placement="right"
                style="border-radius: calc(0.75rem * 0.75); backdrop-filter: blur(12px); background: ${isActive ? '#1e293b' : 'transparent'};"
                @click=${(e) => {
                e.preventDefault();
                uiActions.setActiveTab(item.key);
                if (window.innerWidth < 1280) {
                    uiActions.setActiveSidebar(null);
                }
            }}
            >
                ${activeIndicator} ${progressBg}

                ${isCompact ? statusElement : ''}

                <div class="relative z-10 flex items-center ${isCompact ? 'justify-center w-full' : 'gap-3 w-full'}">
                    <span
                        class="shrink-0 ${iconColorClass} transition-all duration-300 ${isActive
                ? 'scale-110'
                : 'group-hover:scale-110'}"
                    >
                        ${item.icon}
                    </span>

                    ${!isCompact ? html`
                        <span
                            class="truncate transition-all duration-300 ${isActive
                    ? 'translate-x-0.5 font-bold tracking-tight'
                    : ''}"
                            >${item.label}</span
                        >
                        ${statusElement}
                    ` : ''}
                </div>
            </a>
        `;
    }

    render() {
        const { activeTab, isGlobalNavCompact } = useUiStore.getState();
        const groups = this.getNavGroups();

        const template = html`
            <div class="px-4 pb-8 flex flex-col gap-8">
                ${groups.map((group) => {
            const visibleItems = group.items.filter((i) => i.visible);
            if (visibleItems.length === 0) return '';

            return html`
                        <div class="flex flex-col gap-1.5">
                            ${!isGlobalNavCompact ? html`
                            <div
                                class="px-2 mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400/60 flex items-center gap-3 select-none"
                            >
                                <span>${group.title}</span>
                                <div
                                    class="h-[1px] bg-gradient-to-r from-slate-800/40 to-transparent grow"
                                ></div>
                            </div>
                            ` : html`<div class="h-[1px] bg-slate-800/10 mx-2 mb-2"></div>`}
                            <nav class="flex flex-col gap-0.5">
                                ${visibleItems.map((item) =>
                this.renderNavItem(item, activeTab, isGlobalNavCompact)
            )}
                            </nav>
                        </div>
                    `;
        })}
                <button
                    @click=${() => useUiStore.getState().toggleGlobalNavCompact?.()}
                    class="mt-2 flex items-center gap-2 px-2 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all text-[10px] font-bold uppercase tracking-widest"
                    title="${isGlobalNavCompact ? 'Expand navigation' : 'Collapse navigation'}"
                >
                    ${icons.sidebar}
                    ${!isGlobalNavCompact
                        ? html`<span>Collapse</span>`
                        : ''}
                </button>
            </div>
        `;

        render(template, this);
    }
}

customElements.define('sidebar-nav', SidebarNav);
