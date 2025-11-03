import { html } from 'lit-html';
import { useUiStore, uiActions } from '@/state/uiStore';
import { useAnalysisStore } from '@/state/analysisStore';
import { isDebugMode } from '@/shared/utils/env';
import * as icons from '@/ui/icons';
import { hasMissingTooltips } from '@/features/parserCoverage/domain/tooltip-coverage-analyzer';

const NavLink = (item, activeTab, isSubItem = false) => {
    if (!item.visible) return '';
    const isActive = activeTab === item.key;
    const paddingClass = isSubItem ? 'pl-6' : 'px-4';
    const classes = `w-full flex items-center gap-3 ${paddingClass} py-2.5 text-sm font-medium rounded-lg transition-colors ${
        isActive
            ? 'bg-blue-600 text-white'
            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }`;

    const warningIcon = item.hasWarning
        ? html`<span
              class="ml-auto text-yellow-400"
              title="This feature has warnings."
              >${icons.debug}</span
          >`
        : '';

    return html`
        <li>
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
        </li>
    `;
};

const NavGroup = (group, activeTab) => {
    const isGroupVisible = group.items.some((item) => {
        if (item.type === 'submenu') {
            return item.items.some((subItem) => subItem.visible);
        }
        return item.visible;
    });
    if (!isGroupVisible) return '';

    const isGroupActive = group.items.some((item) =>
        item.type === 'submenu'
            ? item.items.some((sub) => sub.key === activeTab)
            : item.key === activeTab
    );

    return html`
        <details class="group" open="">
            <summary
                class="flex items-center gap-3 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg cursor-pointer list-none text-gray-400 hover:bg-gray-700/50"
            >
                ${group.icon}
                <span class="truncate min-w-0">${group.title}</span>
                <span
                    class="ml-auto transition-transform duration-200 group-open:rotate-90"
                >
                    ${icons.chevronRight}
                </span>
            </summary>
            <ul class="pl-2 mt-1 space-y-1">
                ${group.items.map((item) => NavLink(item, activeTab, true))}
            </ul>
        </details>
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
            title: 'Overviews',
            icon: icons.summary,
            items: [
                {
                    key: 'summary',
                    label: 'Summary',
                    icon: icons.summary,
                    visible: true,
                },
                {
                    key: 'comparison',
                    label: 'Manifest Comparison',
                    icon: icons.comparison,
                    visible: isMultiStream,
                },
                {
                    key: 'integrators-report',
                    label: "Integrator's Report",
                    icon: icons.integrators,
                    visible: true,
                },
            ],
        },
        {
            title: 'Analysis',
            icon: icons.play,
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
                    visible: true,
                },
                {
                    key: 'timeline-visuals',
                    label: 'Timeline',
                    icon: icons.timeline,
                    visible: true,
                },
                {
                    key: 'advertising',
                    label: 'Advertising',
                    icon: icons.advertising,
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
                {
                    key: 'network',
                    label: 'Network',
                    icon: icons.network,
                    visible: true,
                },
            ],
        },
        {
            title: 'Exploration',
            icon: icons.explorer,
            items: [
                {
                    key: 'interactive-manifest',
                    label: 'Interactive Manifest',
                    icon: icons.interactiveManifest,
                    visible: true,
                    hasWarning: showManifestWarning,
                },
                {
                    key: 'updates',
                    label: 'Live Updates',
                    icon: icons.updates,
                    visible: true,
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
            icon: icons.debug,
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
    return html` ${navGroups.map((group) => NavGroup(group, activeTab))} `;
};
