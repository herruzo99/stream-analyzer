import { html } from 'lit-html';
import { useUiStore, uiActions } from '@/state/uiStore';
import { useAnalysisStore } from '@/state/analysisStore';
import { isDebugMode } from '@/shared/utils/env';
import * as icons from '@/ui/icons';
import { hasMissingTooltips } from '@/features/parserCoverage/domain/tooltip-coverage-analyzer';

const NavLink = (item, activeTab) => {
    if (!item.visible) return '';
    const isActive = activeTab === item.key;
    const classes = `w-full flex items-center gap-3 pl-4 pr-3 py-2 text-sm font-medium rounded-md transition-colors ${
        isActive
            ? 'bg-blue-600 text-white'
            : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
    }`;

    const warningIcon = item.hasWarning
        ? html`<span
              class="ml-auto text-yellow-400"
              title="This feature has warnings."
              >${icons.debug}</span
          >`
        : '';

    return html`
        <a
            href="#"
            class=${classes}
            data-tab=${item.key}
            @click=${(e) => {
                e.preventDefault();
                uiActions.setActiveTab(item.key);
                document.body.classList.remove('primary-sidebar-open');
            }}
        >
            ${item.icon}
            <span class="inline truncate min-w-0">${item.label}</span>
            ${warningIcon}
        </a>
    `;
};

const NavGroup = (group, activeTab) => {
    const isGroupVisible = group.items.some((item) => item.visible);
    if (!isGroupVisible) return '';

    return html`
        <div>
            <h4
                class="px-4 pt-4 pb-2 text-xs font-bold uppercase tracking-wider text-slate-500"
            >
                ${group.title}
            </h4>
            <ul class="mt-1 space-y-1">
                ${group.items.map(
                    (item) => html`<li>${NavLink(item, activeTab)}</li>`
                )}
            </ul>
        </div>
    `;
};

export function getNavGroups() {
    const { streams, segmentsForCompare } = useAnalysisStore.getState();
    const { activeSegmentUrl } = useUiStore.getState();
    const activeStream = streams.find(
        (s) => s.id === useAnalysisStore.getState().activeStreamId
    );
    const isMultiStream = streams.length > 1;

    const showCoverageWarning =
        isDebugMode && activeStream?.coverageReport?.length > 0;
    const showManifestWarning = hasMissingTooltips(activeStream);

    return [
        {
            title: 'Overview & Compliance',
            items: [
                {
                    key: 'comparison',
                    label: 'Manifest Comparison',
                    icon: icons.comparison,
                    visible: isMultiStream,
                },
                {
                    key: 'summary',
                    label: 'Summary',
                    icon: icons.summary,
                    visible: true,
                },
                {
                    key: 'integrators-report',
                    label: "Integrator's Report",
                    icon: icons.integrators,
                    visible: true,
                },
                {
                    key: 'features',
                    label: 'Features',
                    icon: icons.features,
                    visible: true,
                },
                {
                    key: 'compliance',
                    label: 'Compliance',
                    icon: icons.compliance,
                    visible: true,
                },
            ],
        },
        {
            title: 'Playback & Simulation',
            items: [
                {
                    key: 'player-simulation',
                    label: 'Player Simulation',
                    icon: icons.play,
                    visible: !!activeStream?.originalUrl,
                },
                {
                    key: 'multi-player',
                    label: 'Multi-Player Dashboard',
                    icon: icons.viewfinder,
                    visible: streams.length > 0, // Visible for 1 or more streams
                },
                {
                    key: 'advertising',
                    label: 'Advertising',
                    icon: icons.advertising,
                    visible: true,
                },
            ],
        },
        {
            title: 'Deep Dive & Exploration',
            items: [
                {
                    key: 'network',
                    label: 'Network',
                    icon: icons.network,
                    visible: true,
                },
                {
                    key: 'timeline',
                    label: 'Timeline',
                    icon: icons.timeline,
                    visible: true,
                },
                {
                    key: 'updates',
                    label: 'Live Updates',
                    icon: icons.updates,
                    visible: true,
                },
                {
                    key: 'interactive-manifest',
                    label: 'Interactive Manifest',
                    icon: icons.interactiveManifest,
                    visible: true,
                    hasWarning: showManifestWarning,
                },
                {
                    key: 'explorer',
                    label: 'Segment Explorer',
                    icon: icons.searchCode,
                    visible: true,
                },
                {
                    key: 'segment-comparison',
                    label: 'Segment Comparison',
                    icon: icons.comparison,
                    visible: segmentsForCompare.length > 1,
                },
                {
                    key: 'interactive-segment',
                    label: 'Segment Inspector',
                    icon: icons.interactiveSegment,
                    visible: !!activeSegmentUrl,
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
                    hasWarning: showCoverageWarning,
                },
            ],
        },
    ];
}

export const sidebarNavTemplate = () => {
    const { activeTab } = useUiStore.getState();
    const navGroups = getNavGroups();
    return html`
        <div class="px-2 space-y-2">
            ${navGroups.map((group) => NavGroup(group, activeTab))}
        </div>
    `;
};
