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
        this.unsubs.push(useAnalysisStore.subscribe(() => this._enqueueRender()));
        this.unsubs.push(useQualityStore.subscribe(() => this._enqueueRender()));

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
        const { activeSegmentUrl } = useUiStore.getState();
        const { jobs } = useQualityStore.getState();

        // QC Status
        const jobList = Array.from(jobs.values());
        const runningJobs = jobList.filter((j) => j.status === 'running');
        const failedJobs = jobList.filter((j) => j.status === 'error');
        const completedJobs = jobList.filter((j) => j.status === 'complete');

        let qcBadge = null;
        let qcBadgeColor = 'bg-blue-600';
        let qcProgress = 0;

        if (runningJobs.length > 0) {
            const avgProgress =
                runningJobs.reduce((acc, j) => acc + j.progress, 0) /
                runningJobs.length;
            qcProgress = avgProgress;
            qcBadge = runningJobs.length === 1 ? `${Math.floor(avgProgress)}%` : `${runningJobs.length} Run`;
        } else if (failedJobs.length > 0) {
            qcBadge = `${failedJobs.length} Err`;
            qcBadgeColor = 'bg-red-500';
        } else if (completedJobs.length > 0) {
            qcBadge = `${completedJobs.length} Done`;
            qcBadgeColor = 'bg-emerald-500';
        }

        const activeStream = streams.find((s) => s.id === activeStreamId);
        
        const hasComplianceIssues = activeStream?.manifestUpdates?.[0]?.complianceResults?.some(
            (r) => r.status === 'fail'
        );
        const hasCoverageIssues =
            isDebugMode && (activeStream?.coverageReport || []).length > 0;
        const hasManifestWarnings = hasMissingTooltips(activeStream);

        return [
            {
                title: 'Analysis',
                items: [
                    { key: 'summary', label: 'Overview', icon: icons.summary, visible: true },
                    { 
                        key: 'comparison', 
                        label: 'Comparison', 
                        icon: icons.comparison, 
                        visible: streams.length > 1,
                        badge: streams.length > 1 ? String(streams.length) : null,
                        badgeColor: 'bg-slate-700'
                    },
                    { key: 'compliance', label: 'Compliance', icon: icons.compliance, visible: true, hasError: hasComplianceIssues },
                    { key: 'regression', label: 'Regression Tests', icon: icons.beaker, visible: true },
                    { key: 'integrators-report', label: 'Integrator Report', icon: icons.integrators, visible: true },
                    { key: 'features', label: 'Feature Matrix', icon: icons.features, visible: true },
                ],
            },
            {
                title: 'Inspection',
                items: [
                    { key: 'interactive-manifest', label: 'Manifest View', icon: icons.interactiveManifest, visible: true, hasWarning: hasManifestWarnings },
                    { key: 'explorer', label: 'Segment Explorer', icon: icons.folderTree, visible: true },
                    { 
                        key: 'interactive-segment', 
                        label: 'Bitstream Viewer', 
                        icon: icons.binary, 
                        visible: !!activeSegmentUrl,
                        badge: activeSegmentUrl ? 'Active' : null,
                        badgeColor: 'bg-blue-600'
                    },
                    { key: 'timeline', label: 'Timeline', icon: icons.timeline, visible: true },
                    { key: 'network', label: 'Network Waterfall', icon: icons.network, visible: true },
                    { key: 'drm', label: 'DRM Workbench', icon: icons.shieldCheck, visible: true },
                    { 
                        key: 'updates', 
                        label: 'Live Updates', 
                        icon: icons.updates, 
                        visible: activeStream?.manifest?.type === 'dynamic',
                        badge: 'LIVE',
                        badgeColor: 'bg-red-600 animate-pulse'
                    },
                ],
            },
            {
                title: 'Playback & QC',
                items: [
                    { key: 'player-simulation', label: 'Player Sim', icon: icons.play, visible: !!activeStream?.originalUrl },
                    { key: 'multi-player', label: 'Multi-View', icon: icons.grid, visible: streams.length > 0 },
                    { 
                        key: 'qc-dashboard', 
                        label: 'Signal Quality', 
                        icon: icons.activity, 
                        visible: true,
                        badge: qcBadge,
                        badgeColor: qcBadgeColor,
                        progress: qcProgress,
                        hasError: failedJobs.length > 0 && runningJobs.length > 0
                    },
                    { 
                        key: 'advertising', 
                        label: 'Ad Verification', 
                        icon: icons.advertising, 
                        visible: true,
                        badge: (activeStream?.adAvails || []).length > 0 ? String(activeStream.adAvails.length) : null,
                        badgeColor: 'bg-purple-600'
                    },
                ],
            },
            {
                title: 'Developer',
                items: [
                    { key: 'parser-coverage', label: 'Parser Coverage', icon: icons.parserCoverage, visible: isDebugMode, hasWarning: hasCoverageIssues },
                ],
            },
        ];
    }

    renderNavItem(item, activeTab) {
        const isActive = activeTab === item.key;

        // Architectural Fix: Use template literals for classes to avoid DOMTokenList space error
        const baseClasses = 'group relative flex items-center gap-3 px-3 py-2 my-1 rounded-lg text-sm font-medium transition-all duration-200 overflow-hidden cursor-pointer select-none border';
        const activeClasses = 'bg-slate-800 text-white border-slate-700 shadow-sm';
        const inactiveClasses = 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40';

        const containerClasses = `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`;

        const iconColorClass = isActive 
            ? 'text-blue-400' 
            : 'text-slate-500 group-hover:text-slate-400 transition-colors';

        // --- Active Indicator Line (Left) ---
        const activeIndicator = isActive
            ? html`<div class="absolute left-0 top-2 bottom-2 w-1 bg-blue-500 rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>`
            : '';

        // --- Progress Background (e.g. for QC) ---
        const progressBg = item.progress && item.progress > 0
            ? html`<div class="absolute bottom-0 left-0 h-[2px] bg-blue-500/80 transition-all duration-300" style="width: ${item.progress}%"></div>`
            : '';

        // --- Status Badge ---
        let statusElement = html``;
        if (item.badge) {
            statusElement = html`
                <span class="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded text-white ${item.badgeColor} shadow-sm tabular-nums tracking-wide">
                    ${item.badge}
                </span>
            `;
        } else if (item.hasError) {
            statusElement = html`<div class="ml-auto w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]"></div>`;
        } else if (item.hasWarning) {
            statusElement = html`<div class="ml-auto w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]"></div>`;
        }

        return html`
            <a
                href="#"
                class="${containerClasses}"
                @click=${(e) => {
                    e.preventDefault();
                    uiActions.setActiveTab(item.key);
                    // On mobile, close sidebar after selection
                    if (window.innerWidth < 1280) {
                         uiActions.setActiveSidebar(null);
                    }
                }}
            >
                ${activeIndicator}
                ${progressBg}

                <span class="shrink-0 ${iconColorClass}">
                    ${item.icon}
                </span>

                <span class="truncate z-10">${item.label}</span>

                ${statusElement}
            </a>
        `;
    }

    render() {
        const { activeTab } = useUiStore.getState();
        const groups = this.getNavGroups();

        const template = html`
            <div class="px-3 pb-8 flex flex-col gap-6">
                ${groups.map((group) => {
                    const visibleItems = group.items.filter((i) => i.visible);
                    if (visibleItems.length === 0) return '';

                    return html`
                        <div>
                            <div class="px-2 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2 select-none">
                                ${group.title}
                                <div class="h-px bg-slate-800 grow"></div>
                            </div>
                            <nav class="flex flex-col">
                                ${visibleItems.map((item) => this.renderNavItem(item, activeTab))}
                            </nav>
                        </div>
                    `;
                })}
            </div>
        `;

        render(template, this);
    }
}

customElements.define('sidebar-nav', SidebarNav);