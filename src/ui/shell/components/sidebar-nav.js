import { html } from 'lit-html';
import { useUiStore, uiActions } from '@/state/uiStore';
import { useAnalysisStore } from '@/state/analysisStore';
import { isDebugMode } from '@/application/utils/env';
import * as icons from '@/ui/icons';

const NavLink = (icon, label, tabKey, activeTab) => {
    const isActive = activeTab === tabKey;
    const classes = `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
        isActive
            ? 'bg-blue-600 text-white'
            : 'text-gray-400 hover:bg-gray-700 hover:text-white'
    }`;

    return html`
        <li>
            <a
                href="#"
                class=${classes}
                data-tab=${tabKey}
                @click=${(e) => {
                    e.preventDefault();
                    uiActions.setActiveTab(tabKey);
                }}
            >
                ${icon}
                <span class="inline">${label}</span>
            </a>
        </li>
    `;
};

const NavGroup = (group, activeTab) => {
    if (group.items.every((item) => !item.visible)) {
        return '';
    }

    return html`
        <div class="mt-4 first:mt-0">
            <h3
                class="px-4 mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase"
            >
                ${group.title}
            </h3>
            <ul class="space-y-1">
                ${group.items.map((item) =>
                    item.visible
                        ? NavLink(item.icon, item.label, item.key, activeTab)
                        : ''
                )}
            </ul>
        </div>
    `;
};

export const sidebarNavTemplate = () => {
    const { streams, activeSegmentUrl } = useAnalysisStore.getState();
    const { activeTab } = useUiStore.getState();

    const navGroups = [
        {
            title: 'Overviews',
            items: [
                {
                    key: 'summary',
                    label: 'Summary',
                    icon: icons.summary,
                    visible: true,
                },
                {
                    key: 'comparison',
                    label: 'Comparison',
                    icon: icons.comparison,
                    visible: streams.length > 1,
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
            title: 'Analysis & Validation',
            items: [
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
            ],
        },
        {
            title: 'Interactive Exploration',
            items: [
                {
                    key: 'interactive-manifest',
                    label: 'Manifest',
                    icon: icons.interactiveManifest,
                    visible: true,
                },
                {
                    key: 'updates',
                    label: 'Manifest Updates',
                    icon: icons.updates,
                    visible: true,
                },
                {
                    key: 'explorer',
                    label: 'Segment Explorer',
                    icon: icons.explorer,
                    visible: true,
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
            title: 'Developer Tools',
            items: [
                {
                    key: 'parser-coverage',
                    label: 'Parser Coverage',
                    icon: icons.parserCoverage,
                    visible: isDebugMode,
                },
            ],
        },
    ];

    return html` ${navGroups.map((group) => NavGroup(group, activeTab))} `;
};
