import { html, render } from 'lit-html';
import { useStore } from '../../../core/store.js';
import { eventBus } from '../../../core/event-bus.js';
import { getDashExplorerTemplate } from './components/dash/index.js';
import {
    getHlsExplorerTemplate,
    startLiveSegmentHighlighter,
    stopLiveSegmentHighlighter,
} from './components/hls/index.js';
import { renderApp } from '../../mainRenderer.js';

let currentContainer = null;
let currentStreamId = null;
let dashDisplayMode = 'first';

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
    renderApp();
}

function updateCompareButton() {
    const { segmentsForCompare } = useStore.getState();
    const compareButton = document.getElementById('segment-compare-btn');
    if (compareButton) {
        compareButton.textContent = `Compare Selected (${segmentsForCompare.length}/2)`;
        compareButton.toggleAttribute('disabled', segmentsForCompare.length !== 2);
    }
}

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
                          class="text-sm font-bold py-2 px-3 rounded-md transition-colors ${dashDisplayMode ===
                          'first'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-600 hover:bg-gray-700 text-white'}"
                      >
                          First 10
                      </button>
                      ${isDynamic
                          ? html`<button
                                @click=${() => handleDashModeClick('last')}
                                class="text-sm font-bold py-2 px-3 rounded-md transition-colors ${dashDisplayMode ===
                                'last'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-600 hover:bg-gray-700 text-white'}"
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

    // Defer the button update until after the render
    setTimeout(updateCompareButton, 0);

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

export function initializeSegmentExplorer(container, stream) {
    currentContainer = container;
    currentStreamId = stream.id;

    stopLiveSegmentHighlighter();

    if (stream.manifest.type === 'dynamic' && stream.protocol === 'hls') {
        startLiveSegmentHighlighter(container, stream);
    }

    render(getSegmentExplorerTemplate(stream), container);
}