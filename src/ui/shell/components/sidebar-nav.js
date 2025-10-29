import { html } from 'lit-html';
import { useUiStore, uiActions } from '@/state/uiStore';
import { useAnalysisStore } from '@/state/analysisStore';
import { isDebugMode } from '@/shared/utils/env';
import * as icons from '@/ui/icons';

const chevronRight = html`<svg
    class="w-3 h-3"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
>
    <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M9 5l7 7-7 7"
    ></path>
</svg>`;

const NavLink = (item, activeTab, isSubItem = false) => {
    if (!item.visible) return '';
    const isActive = item.isActive
        ? item.isActive(activeTab)
        : activeTab === item.key;
    const paddingClass = isSubItem ? 'pl-8' : 'px-4';
    const pyClass = isSubItem ? 'py-2' : 'py-3';
    const classes = `flex items-center gap-3 ${paddingClass} ${pyClass} text-sm font-medium rounded-lg transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`;

    return html`
        <li>
            <a
                href="#"
                class=${classes}
                data-tab=${item.key}
                @click=${(e) => {
                    e.preventDefault();
                    uiActions.setActiveTab(item.key);
                }}
            >
                ${item.icon}
                <span class="inline">${item.label}</span>
            </a>
        </li>
    `;
};

const SubMenu = (item, activeTab) => {
    const isActive = item.isActive(activeTab);
    return html`
        <li>
            <details class="group" ?open=${isActive}>
                <summary
                    class="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg cursor-pointer list-none ${isActive
                        ? 'text-white'
                        : 'text-gray-400 hover:bg-gray-700 hover:text-white'}"
                >
                    ${item.icon}
                    <span>${item.label}</span>
                    <span
                        class="ml-auto transition-transform duration-200 group-open:rotate-90"
                        >${chevronRight}</span
                    >
                </summary>
                <ul class="pl-4 mt-1 space-y-1">
                    ${item.items.map((subItem) =>
                        NavLink(subItem, activeTab, true)
                    )}
                </ul>
            </details>
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

    return html`
        <div class="mt-4 first:mt-0">
            <h3
                class="px-4 mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase"
            >
                ${group.title}
            </h3>
            <ul class="space-y-1">
                ${group.items.map((item) => {
                    if (item.type === 'submenu') {
                        if (item.items.some((sub) => sub.visible))
                            return SubMenu(item, activeTab);
                    } else if (item.visible) {
                        return NavLink(item, activeTab);
                    }
                    return '';
                })}
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

    return [
        {
            title: 'Overviews',
            items: [
                {
                    key: 'summary',
                    label: 'Summary',
                    icon: icons.summary,
                    visible: true,
                    type: 'link',
                },
                {
                    key: 'comparison',
                    label: 'Manifest Comparison',
                    icon: icons.comparison,
                    visible: isMultiStream,
                    type: 'link',
                },
                {
                    key: 'integrators-report',
                    label: "Integrator's Report",
                    icon: icons.integrators,
                    visible: true,
                    type: 'link',
                },
            ],
        },
        {
            title: 'Analysis & Validation',
            items: [
                {
                    key: 'player-simulation',
                    label: 'Player Simulation',
                    icon: icons.play,
                    visible: !!activeStream?.originalUrl,
                    type: 'link',
                },
                {
                    key: 'multi-player',
                    label: 'Multi-Player Dashboard',
                    icon: icons.viewfinder,
                    visible: isMultiStream,
                    type: 'link',
                },
                {
                    key: 'timeline-visuals',
                    label: 'Timeline',
                    icon: icons.timeline,
                    visible: true,
                    type: 'link',
                },
                {
                    key: 'advertising',
                    label: 'Advertising',
                    icon: icons.advertising,
                    visible: true,
                    type: 'link',
                },
                {
                    key: 'features',
                    label: 'Features',
                    icon: icons.features,
                    visible: true,
                    type: 'link',
                },
                {
                    key: 'compliance',
                    label: 'Compliance',
                    icon: icons.compliance,
                    visible: true,
                    type: 'link',
                },
                {
                    key: 'network',
                    label: 'Network',
                    icon: icons.network,
                    visible: true,
                    type: 'link',
                },
            ],
        },
        {
            title: 'Interactive Exploration',
            items: [
                {
                    type: 'submenu',
                    label: 'Manifest',
                    icon: icons.interactiveManifest,
                    isActive: (activeTab) =>
                        ['interactive-manifest', 'updates'].includes(activeTab),
                    items: [
                        {
                            key: 'interactive-manifest',
                            label: 'Interactive View',
                            icon: html``,
                            visible: true,
                        },
                        {
                            key: 'updates',
                            label: 'Live Updates',
                            icon: icons.updates,
                            visible: true,
                        },
                    ],
                },
                {
                    type: 'submenu',
                    label: 'Segments',
                    icon: icons.explorer,
                    isActive: (activeTab) =>
                        [
                            'explorer',
                            'segment-comparison',
                            'interactive-segment',
                        ].includes(activeTab),
                    items: [
                        {
                            key: 'explorer',
                            label: 'Explorer',
                            icon: html``,
                            visible: true,
                        },
                        {
                            key: 'segment-comparison',
                            label: 'Comparison',
                            icon: icons.comparison,
                            visible: segmentsForCompare.length > 1,
                        },
                        {
                            key: 'interactive-segment',
                            label: 'Inspector',
                            icon: icons.interactiveSegment,
                            visible: !!activeSegmentUrl,
                        },
                    ],
                },
            ],
        },
        {
            title: 'Developer Tools',
            items: [
                {
                    key: 'parser-coverage',
                    label: 'Parser Coverage',
                    icon: icons.parserCoverage,
                    visible: isDebugMode,
                    type: 'link',
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
