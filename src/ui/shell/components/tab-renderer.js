import { html } from 'lit-html';
import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore } from '@/state/uiStore';
import { isDebugMode } from '@/shared/utils/env';

export const renderTabButtons = () => {
    const { streams } = useAnalysisStore.getState();
    const { activeTab, activeSegmentUrl } = useUiStore.getState();

    const tabs = [
        { key: 'comparison', label: 'Comparison', visible: streams.length > 1 },
        { key: 'summary', label: 'Global Summary', visible: true },
        {
            key: 'integrators-report',
            label: "Integrator's Report",
            visible: true,
        },
        {
            key: 'timeline-visuals',
            label: 'Timeline & Visuals',
            visible: true,
        },
        { key: 'features', label: 'Features', visible: true },
        { key: 'compliance', label: 'Compliance Report', visible: true },
        { key: 'explorer', label: 'Segment Explorer', visible: true },
        {
            key: 'interactive-segment',
            label: 'Interactive Segment',
            visible: !!activeSegmentUrl,
        },
        {
            key: 'interactive-manifest',
            label: 'Interactive Manifest',
            visible: true,
        },
        { key: 'updates', label: 'Manifest Updates', visible: true },
        {
            key: 'parser-coverage',
            label: 'Parser Coverage',
            visible: isDebugMode,
        },
    ];

    const activeClasses = 'border-blue-600 text-gray-100 bg-gray-700';
    const inactiveClasses = 'border-transparent text-gray-400';

    return html`${tabs.map(
        (tab) => html`
            <button
                role="tab"
                class="py-4 px-1 sm:px-6 block hover:text-blue-400 focus:outline-hidden border-b-2 font-medium transition-colors duration-200 ${tab.key ===
                activeTab
                    ? activeClasses
                    : inactiveClasses} ${!tab.visible ? 'hidden' : ''}"
                data-tab="${tab.key}"
            >
                ${tab.label}
            </button>
        `
    )}`;
};
