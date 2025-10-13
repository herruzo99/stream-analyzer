import { html } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map.js';
import { useUiStore, uiActions } from '@/state/uiStore';

const tabButton = (label, tabKey) => {
    const { interactiveSegmentActiveTab } = useUiStore.getState();
    const isActive = interactiveSegmentActiveTab === tabKey;
    return html`
        <button
            @click=${() => uiActions.setInteractiveSegmentActiveTab(tabKey)}
            class="py-2 px-4 font-semibold text-sm rounded-t-lg transition-colors ${isActive
                ? 'bg-slate-800 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}"
        >
            ${label}
        </button>
    `;
};

/**
 * A shared layout component for the interactive segment view.
 * @param {object} options
 * @param {import('lit-html').TemplateResult} options.inspectorContent
 * @param {import('lit-html').TemplateResult} options.structureContent
 * @param {import('lit-html').TemplateResult} options.hexContent
 * @returns {import('lit-html').TemplateResult}
 */
export const inspectorLayoutTemplate = ({
    inspectorContent,
    structureContent,
    hexContent,
}) => {
    const { interactiveSegmentActiveTab } = useUiStore.getState();

    const inspectorClasses = {
        hidden: interactiveSegmentActiveTab !== 'inspector',
        'lg:block': true,
        'h-full': true,
    };
    const hexClasses = {
        hidden: interactiveSegmentActiveTab !== 'hex',
        'lg:block': true,
        'h-full': true,
    };

    return html`
        <!-- Mobile Tab Navigation -->
        <div class="lg:hidden border-b border-gray-700 mb-4">
            ${tabButton('Inspector', 'inspector')}
            ${tabButton('Hex View', 'hex')}
        </div>

        <!-- Responsive Content Grid -->
        <div class="lg:grid lg:grid-cols-[minmax(300px,25%)_1fr] lg:gap-4 h-full">
            <div class=${classMap(inspectorClasses)}>
                <div class="flex flex-col gap-4 h-full">
                    <div
                        class="segment-inspector-panel rounded-md bg-gray-900/90 border border-gray-700 transition-opacity duration-200 h-96 lg:h-[24rem] flex flex-col overflow-y-auto"
                    >
                        ${inspectorContent}
                    </div>
                    <div class="flex-grow min-h-0">${structureContent}</div>
                </div>
            </div>
            <div class=${classMap(hexClasses)}>${hexContent}</div>
        </div>
    `;
};