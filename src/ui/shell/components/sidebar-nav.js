import { html } from 'lit-html';
import { useUiStore, uiActions } from '@/state/uiStore';
import { useAnalysisStore } from '@/state/analysisStore';
import { isDebugMode } from '@/application/utils/env';

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

    const icons = {
        summary: html`<svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
        >
            <path
                d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v7.5a.5.5 0 01-.5.5H5.5a.5.5 0 01-.5-.5V5z"
            />
        </svg>`,
        comparison: html`<svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
        >
            <path
                d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z"
            />
        </svg>`,
        integrators: html`<svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
        >
            <path
                fill-rule="evenodd"
                d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.96.06 2.285-.947 2.285-1.561 0-1.561 2.206 0 2.206l.946.001c1.007.001 1.487 1.323.947 2.286-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.286c1.561-.001 1.561-2.206 0-2.206l-.947-.001a1.532 1.532 0 01-.947-2.286c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                clip-rule="evenodd"
            />
        </svg>`,
        timeline: html`<svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
        >
            <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.414L11 10.586V6z"
                clip-rule="evenodd"
            />
        </svg>`,
        features: html`<svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
        >
            <path
                fill-rule="evenodd"
                d="M10 2a8 8 0 100 16 8 8 0 000-16zM8.707 14.293a1 1 0 01-1.414 0l-2-2a1 1 0 111.414-1.414L8 12.172l4.293-4.293a1 1 0 111.414 1.414l-5 5z"
                clip-rule="evenodd"
            />
        </svg>`,
        compliance: html`<svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
        >
            <path
                fill-rule="evenodd"
                d="M2.166 4.999A11.954 11.954 0 0010 18.25a11.954 11.954 0 007.834-13.251A8.001 8.001 0 0010 2a8.001 8.001 0 00-7.834 2.999zM10 16a6 6 0 100-12 6 6 0 000 12z"
                clip-rule="evenodd"
            />
            <path
                d="M10 6a1 1 0 011 1v3a1 1 0 11-2 0V7a1 1 0 011-1zm0 8a1 1 0 100-2 1 1 0 000 2z"
            />
        </svg>`,
        interactiveManifest: html`<svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
        >
            <path
                fill-rule="evenodd"
                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                clip-rule="evenodd"
            />
        </svg>`,
        updates: html`<svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
        >
            <path
                fill-rule="evenodd"
                d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                clip-rule="evenodd"
            />
        </svg>`,
        explorer: html`<svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
        >
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path
                fill-rule="evenodd"
                d="M4 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h4a1 1 0 100-2H7zm0 4a1 1 0 100 2h4a1 1 0 100-2H7z"
                clip-rule="evenodd"
            />
        </svg>`,
        interactiveSegment: html`<svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
        >
            <path
                fill-rule="evenodd"
                d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
                clip-rule="evenodd"
            />
        </svg>`,
        parserCoverage: html`<svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
        >
            <path
                fill-rule="evenodd"
                d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414L8.586 11l-1.293 1.293a1 1 0 101.414 1.414L10 12.414l1.293 1.293a1 1 0 001.414-1.414L11.414 11l1.293-1.293z"
                clip-rule="evenodd"
            />
        </svg>`,
    };

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
