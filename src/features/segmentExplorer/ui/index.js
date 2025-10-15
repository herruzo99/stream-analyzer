import { html } from 'lit-html';
import { eventBus } from '@/application/event-bus';
import { getDashExplorerTemplate } from './components/dash/index.js';
import { getHlsExplorerTemplate } from './components/hls/index.js';
import { useAnalysisStore } from '@/state/analysisStore';

/**
 * Creates the lit-html template for the Segment Explorer view.
 * This is now a pure declarative function.
 * @param {import('@/types.ts').Stream} stream
 * @returns {import('lit-html').TemplateResult}
 */
export function getSegmentExplorerTemplate(stream) {
    if (!stream) {
        return html`<p class="text-gray-400">No active stream.</p>`;
    }

    let contentTemplate;
    if (stream.protocol === 'dash') {
        contentTemplate = getDashExplorerTemplate(stream);
    } else {
        contentTemplate = getHlsExplorerTemplate(stream);
    }

    const { segmentsForCompare } = useAnalysisStore.getState();
    const compareButtonDisabled = segmentsForCompare.length !== 2;

    return html`
        <div class="flex flex-wrap justify-between items-center mb-4 gap-4">
            <h3 class="text-xl font-bold">Segment Explorer</h3>
            <div
                id="segment-explorer-controls"
                class="flex items-center flex-wrap gap-4"
            >
                <button
                    id="segment-compare-btn"
                    @click=${() =>
                        eventBus.dispatch('ui:request-segment-comparison', {
                            urlA: useAnalysisStore.getState()
                                .segmentsForCompare[0],
                            urlB: useAnalysisStore.getState()
                                .segmentsForCompare[1],
                        })}
                    class="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    ?disabled=${compareButtonDisabled}
                >
                    Compare Selected (${segmentsForCompare.length}/2)
                </button>
            </div>
        </div>
        <div
            id="segment-explorer-content"
            data-testid="segment-explorer-content"
        >
            ${contentTemplate}
        </div>
    `;
}
