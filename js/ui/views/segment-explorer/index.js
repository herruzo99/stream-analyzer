import { html, render } from 'lit-html';
import { useStore } from '../../../core/store.js';
import { eventBus } from '../../../core/event-bus.js';
import { getDashExplorerTemplate } from './components/dash/index.js';
import {
    getHlsExplorerTemplate,
    startLiveSegmentHighlighter,
    stopLiveSegmentHighlighter,
} from './components/hls/index.js';

// --- MODULE STATE ---
let currentContainer = null;
let currentStreamId = null;
let dashDisplayMode = 'first'; // 'first' or 'last'

// --- EVENT HANDLERS ---
function handleCompareClick() {
    const { segmentsForCompare } = useStore.getState();
    if (segmentsForCompare.length !== 2) return;
    eventBus.dispatch('ui:request-segment-comparison', {
        urlA: segmentsForCompare[0],
        urlB: segmentsForCompare[1],
    });
}

function handleDashModeClick(mode) {
    if (dashDisplayMode === mode) return;
    dashDisplayMode = mode;
    const stream = useStore
        .getState()
        .streams.find((s) => s.id === currentStreamId);
    if (stream && currentContainer) {
        // Just re-render. The template will use the new display mode.
        // Segment fetching is handled by the state manager.
        initializeSegmentExplorer(currentContainer, stream);
    }
}

// --- MAIN TEMPLATE ---
function getSegmentExplorerTemplate(stream) {
    const isDynamic = stream.manifest?.type === 'dynamic';

    const controlsTemplate = html`
        <div
            id="segment-explorer-controls"
            class="flex items-center flex-wrap gap-4"
        >
            ${stream.protocol === 'dash'
                ? html`
                      <button
                          @click=${() => handleDashModeClick('first')}
                          class="text-sm bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-3 rounded-md transition-colors"
                      >
                          First 10
                      </button>
                      ${isDynamic
                          ? html`<button
                                @click=${() => handleDashModeClick('last')}
                                class="text-sm bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-3 rounded-md transition-colors"
                            >
                                Last 10
                            </button>`
                          : ''}
                  `
                : ''}
            <button
                id="segment-compare-btn"
                @click=${handleCompareClick}
                class="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled
            >
                Compare Selected (0/2)
            </button>
        </div>
    `;

    let contentTemplate;
    if (stream.protocol === 'dash') {
        contentTemplate = getDashExplorerTemplate(stream, dashDisplayMode);
    } else {
        contentTemplate = getHlsExplorerTemplate(stream);
    }

    return html`
        <div class="flex flex-wrap justify-between items-center mb-4 gap-4">
            <h3 class="text-xl font-bold">Segment Explorer</h3>
            ${controlsTemplate}
        </div>
        <div
            id="segment-explorer-content"
            data-testid="segment-explorer-content"
        >
            ${contentTemplate}
        </div>
    `;
}

// --- INITIALIZER & LIFECYCLE ---
export function initializeSegmentExplorer(container, stream) {
    currentContainer = container;
    currentStreamId = stream.id;

    // Stop any existing timers before starting new ones.
    stopLiveSegmentHighlighter();

    if (stream.protocol === 'hls' && stream.manifest.type === 'dynamic') {
        const reRender = () => {
            const currentStream = useStore
                .getState()
                .streams.find((s) => s.id === currentStreamId);
            if (currentStream && container.offsetParent !== null) {
                render(getSegmentExplorerTemplate(currentStream), container);
            }
        };
        startLiveSegmentHighlighter(reRender);
    }

    // Initial render
    render(getSegmentExplorerTemplate(stream), container);
}

// --- GLOBAL EVENT LISTENERS ---
eventBus.subscribe('state:compare-list-changed', ({ count }) => {
    const compareButton = document.getElementById('segment-compare-btn');
    if (compareButton) {
        compareButton.textContent = `Compare Selected (${count}/2)`;
        compareButton.toggleAttribute('disabled', count !== 2);
    }
});

eventBus.subscribe('analysis:started', () => {
    currentStreamId = null;
    currentContainer = null;
    dashDisplayMode = 'first';
    stopLiveSegmentHighlighter();
});

// Re-render the explorer component when its stream's data has been updated by the monitor
eventBus.subscribe('stream:data-updated', ({ streamId }) => {
    if (
        streamId === currentStreamId &&
        currentContainer &&
        currentContainer.offsetParent !== null
    ) {
        const stream = useStore
            .getState()
            .streams.find((s) => s.id === streamId);
        if (stream) {
            render(getSegmentExplorerTemplate(stream), currentContainer);
        }
    }
});

eventBus.subscribe('state:stream-variant-changed', ({ streamId }) => {
    if (
        streamId === currentStreamId &&
        currentContainer &&
        currentContainer.offsetParent !== null
    ) {
        const stream = useStore
            .getState()
            .streams.find((s) => s.id === streamId);
        if (stream)
            render(getSegmentExplorerTemplate(stream), currentContainer);
    }
});

eventBus.subscribe('segment:loaded', () => {
    if (
        currentContainer &&
        currentContainer.offsetParent !== null // Only re-render if the tab is visible
    ) {
        const stream = useStore
            .getState()
            .streams.find((s) => s.id === currentStreamId);
        if (stream) {
            render(getSegmentExplorerTemplate(stream), currentContainer);
        }
    }
});
