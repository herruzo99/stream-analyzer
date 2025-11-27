// ... existing imports
import { hasMissingTooltips } from '@/features/parserCoverage/domain/tooltip-coverage-analyzer';
import { isDebugMode } from '@/shared/utils/env';
import { useAnalysisStore } from '@/state/analysisStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const NavItem = (item, activeTab) => {
    if (!item.visible) return '';
    const isActive = activeTab === item.key;
    // ... (existing NavItem rendering logic unchanged)

    const textColorClass = isActive
        ? 'text-white font-semibold'
        : 'text-slate-400 group-hover:text-slate-200';
    const iconColorClass = isActive
        ? 'text-blue-400'
        : 'text-slate-400 group-hover:text-slate-200';

    let statusIndicator = html``;
    if (item.hasError) {
        statusIndicator = html`<span
            class="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
        ></span>`;
    } else if (item.hasWarning) {
        statusIndicator = html`<span
            class="w-2 h-2 rounded-full bg-amber-500"
        ></span>`;
    }

    return html`
        <a
            href="#"
            class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 mb-1 group relative overflow-hidden ${isActive
                ? 'nav-item-active'
                : 'nav-item-inactive'}"
            @click=${(e) => {
                e.preventDefault();
                uiActions.setActiveTab(item.key);
                uiActions.setActiveSidebar(null);
            }}
        >
            <span
                class="shrink-0 transition-transform group-hover:scale-110 duration-200 ${iconColorClass}"
            >
                ${item.icon}
            </span>
            <span class="truncate grow ${textColorClass}">${item.label}</span>
            ${statusIndicator}
            ${isActive
                ? html`
                      <div
                          class="absolute inset-0 bg-white/5 pointer-events-none animate-fadeIn"
                      ></div>
                  `
                : ''}
        </a>
    `;
};

const NavSection = (group, activeTab) => {
    const visibleItems = group.items.filter((i) => i.visible);
    if (visibleItems.length === 0) return '';

    return html`
        <div class="mb-6">
            <h4
                class="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400/80 select-none"
            >
                ${group.title}
            </h4>
            <nav>${visibleItems.map((item) => NavItem(item, activeTab))}</nav>
        </div>
    `;
};

export function getNavGroups() {
    const { streams, activeStreamId } = useAnalysisStore.getState();
    const { activeSegmentUrl } = useUiStore.getState();
    const activeStream = streams.find((s) => s.id === activeStreamId);

    const hasComplianceIssues =
        activeStream?.manifestUpdates?.[0]?.complianceResults?.some(
            (r) => r.status === 'fail'
        );
    const hasCoverageIssues =
        isDebugMode && (activeStream?.coverageReport || []).length > 0;
    const hasManifestWarnings = hasMissingTooltips(activeStream);

    const isEncrypted = activeStream?.manifest?.summary?.security?.isEncrypted;

    return [
        {
            title: 'Analysis',
            items: [
                {
                    key: 'comparison',
                    label: 'Comparison',
                    icon: icons.comparison,
                    visible: streams.length > 1,
                },
                {
                    key: 'summary',
                    label: 'Overview',
                    icon: icons.summary,
                    visible: true,
                },
                {
                    key: 'compliance',
                    label: 'Compliance',
                    icon: icons.compliance,
                    visible: true,
                    hasError: hasComplianceIssues,
                },
                {
                    key: 'integrators-report',
                    label: "Integrator's Report",
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
                    label: 'Manifest Inspector',
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
                // New DRM Item
                {
                    key: 'drm',
                    label: 'DRM Workbench',
                    icon: icons.shieldCheck,
                    visible: true, // Always visible for utility, but most useful for encrypted streams
                    hasWarning: isEncrypted, // Highlight if stream is encrypted
                },
                {
                    key: 'updates',
                    label: 'Live Updates',
                    icon: icons.updates,
                    visible: activeStream?.manifest?.type === 'dynamic',
                },
            ],
        },
        {
            title: 'Playback',
            items: [
                {
                    key: 'player-simulation',
                    label: 'Player Simulation',
                    icon: icons.play,
                    visible: !!activeStream?.originalUrl,
                },
                {
                    key: 'multi-player',
                    label: 'Multi-View Grid',
                    icon: icons.grid,
                    visible: streams.length > 0,
                },
                {
                    key: 'advertising',
                    label: 'Ad Verification',
                    icon: icons.advertising,
                    visible: true,
                },
            ],
        },
        {
            title: 'Dev Tools',
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

export const sidebarNavTemplate = () => {
    const { activeTab } = useUiStore.getState();
    const navGroups = getNavGroups();
    return html`
        <div class="px-2 pb-10 animate-fadeIn">
            ${navGroups.map((group) => NavSection(group, activeTab))}
        </div>
    `;
};
