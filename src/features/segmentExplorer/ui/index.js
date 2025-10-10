import { html, render } from 'lit-html';
import { useAnalysisStore } from '@/state/analysisStore';
import { eventBus } from '@/application/event-bus';
import { getDashExplorerTemplate } from './components/dash/index.js';
import {
    getHlsExplorerTemplate,
    startLiveSegmentHighlighter,
    stopLiveSegmentHighlighter,
} from './components/hls/index.js';
import { segmentRowTemplate } from '@/ui/components/segment-row';

let currentContainer = null;
let currentStream = null;
let subscriptions = [];

function updateCompareButton() {
    const { segmentsForCompare } = useAnalysisStore.getState();
    const compareButton = document.getElementById('segment-compare-btn');
    if (compareButton) {
        compareButton.textContent = `Compare Selected (${segmentsForCompare.length}/2)`;
        compareButton.toggleAttribute(
            'disabled',
            segmentsForCompare.length !== 2
        );
    }
}

function renderExplorer() {
    if (!currentContainer || !currentStream) return;

    let contentTemplate;
    if (currentStream.protocol === 'dash') {
        contentTemplate = getDashExplorerTemplate(currentStream);
    } else {
        contentTemplate = getHlsExplorerTemplate(currentStream);
    }

    const template = html`
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
                >
                    Compare Selected (0/2)
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

    render(template, currentContainer);

    // This timeout ensures that lit-html has finished rendering the DOM.
    setTimeout(() => {
        updateCompareButton();

        // This is the key reactivity fix: After rendering, find all virtualized lists
        // and imperatively command them to update their data.
        const virtualLists =
            currentContainer.querySelectorAll('virtualized-list');
        virtualLists.forEach((list) => {
            const listElement = /** @type {any} */ (list);
            // The data is temporarily stored on the element by the component template.
            const { items, rowTemplate, rowHeight } =
                listElement.tempData || {};
            if (items && rowTemplate && rowHeight) {
                listElement.updateData(items, rowTemplate, rowHeight);
            }
        });

        // Re-initialize any live-specific UI logic after the render is complete
        if (
            currentStream.manifest.type === 'dynamic' &&
            currentStream.protocol === 'hls'
        ) {
            startLiveSegmentHighlighter(currentContainer, currentStream);
        }
    }, 0);
}

function cleanupSubscriptions() {
    subscriptions.forEach((unsubscribe) => unsubscribe());
    subscriptions = [];
}

export function initializeSegmentExplorer(container, stream) {
    currentContainer = container;
    currentStream = stream;

    cleanupSubscriptions();
    stopLiveSegmentHighlighter();

    subscriptions.push(
        eventBus.subscribe('state:compare-list-changed', updateCompareButton)
    );

    subscriptions.push(
        eventBus.subscribe('stream:segments-updated', ({ streamId }) => {
            if (streamId === currentStream.id) {
                // Update the local stream reference before re-rendering
                currentStream = useAnalysisStore
                    .getState()
                    .streams.find((s) => s.id === streamId);
                renderExplorer();
            }
        })
    );

    // Initial render
    renderExplorer();
}
