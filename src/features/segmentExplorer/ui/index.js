import { html } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map.js';
import { eventBus } from '@/application/event-bus';
import { getDashExplorerForType } from './components/dash/index.js';
import { getHlsExplorerForType } from './components/hls/index.js';
import { getLocalExplorerForType } from './components/local/index.js';
import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore, uiActions } from '@/state/uiStore';

const CONTENT_TYPE_ORDER = { video: 1, audio: 2, text: 3, application: 4 };

const renderTabs = (contentTypes, activeTab) => {
    if (contentTypes.length <= 1) {
        return '';
    }

    return html`
        <div
            class="mb-4 border-b border-gray-700 flex items-center space-x-4"
            role="tablist"
            aria-label="Content Type Tabs"
        >
            ${contentTypes.map((type) => {
                const isActive = type === activeTab;
                const tabClasses = {
                    'py-2': true,
                    'px-4': true,
                    'font-semibold': true,
                    'text-sm': true,
                    'border-b-2': true,
                    'transition-colors': true,
                    'duration-150': true,
                    'border-blue-500': isActive,
                    'text-white': isActive,
                    'border-transparent': !isActive,
                    'text-gray-400': !isActive,
                    'hover:border-gray-500': !isActive,
                    'hover:text-gray-200': !isActive,
                };
                return html`
                    <button
                        role="tab"
                        aria-selected=${isActive}
                        class=${classMap(tabClasses)}
                        @click=${() =>
                            eventBus.dispatch(
                                'ui:segment-explorer:tab-changed',
                                {
                                    tab: type,
                                }
                            )}
                    >
                        ${type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                `;
            })}
        </div>
    `;
};

/**
 * Creates the lit-html template for the Segment Explorer view.
 * @param {import('@/types.ts').Stream} stream
 * @returns {import('lit-html').TemplateResult}
 */
export function getSegmentExplorerTemplate(stream) {
    if (!stream) {
        return html`<p class="text-gray-400">No active stream.</p>`;
    }

    const { segmentsForCompare } = useAnalysisStore.getState();
    const { segmentExplorerActiveTab } = useUiStore.getState();
    const compareButtonDisabled = segmentsForCompare.length < 2;

    const allAdaptationSets =
        stream.manifest?.periods.flatMap((p) => p.adaptationSets) || [];

    const availableContentTypes = [
        ...new Set(allAdaptationSets.map((as) => as.contentType)),
    ].sort(
        (a, b) => (CONTENT_TYPE_ORDER[a] || 99) - (CONTENT_TYPE_ORDER[b] || 99)
    );

    const activeTab = availableContentTypes.includes(segmentExplorerActiveTab)
        ? segmentExplorerActiveTab
        : availableContentTypes[0] || 'video';

    let contentTemplate;
    if (stream.protocol === 'dash') {
        contentTemplate = getDashExplorerForType(stream, activeTab);
    } else if (stream.protocol === 'hls') {
        contentTemplate = getHlsExplorerForType(stream, activeTab);
    } else if (stream.protocol === 'local') {
        contentTemplate = getLocalExplorerForType(stream);
    }

    return html`
        <div class="flex flex-wrap justify-between items-center mb-4 gap-4">
            <h3 class="text-xl font-bold">Segment Explorer</h3>
            <div
                id="segment-explorer-controls"
                class="flex items-center flex-wrap gap-4"
            >
                <button
                    id="segment-compare-btn"
                    @click=${() => uiActions.setActiveTab('segment-comparison')}
                    class="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    ?disabled=${compareButtonDisabled}
                >
                    Compare Selected (${segmentsForCompare.length}/10)
                </button>
            </div>
        </div>
        ${stream.protocol !== 'local'
            ? renderTabs(availableContentTypes, activeTab)
            : ''}
        <div
            id="segment-explorer-content"
            data-testid="segment-explorer-content"
        >
            ${contentTemplate}
        </div>
    `;
}
