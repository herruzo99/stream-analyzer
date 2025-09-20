import { html, render } from 'lit-html';
import { analysisState, dom } from '../../core/state.js';
import { dispatchAndRenderSegmentAnalysis } from '../segment-analysis/view.js';
import { parseAllSegmentUrls } from './parser.js';
import { fetchSegment } from './api.js';
import { renderDashExplorer } from './dash-explorer-view.js';
import { renderHlsExplorer } from './hls-explorer-view.js';
import { eventBus } from '../../core/event-bus.js';

// --- CONSTANTS ---
const SEGMENT_PAGE_SIZE = 10;

// --- MODULE STATE ---
let segmentFreshnessInterval = null;
/** @type {Record<string, object[]>} */
let allSegmentsByRep = {}; // Cache for DASH segments
let currentContainer = null;
let currentStream = null;

// --- SHARED EVENT HANDLERS ---
function handleCompareClick() {
    const { segmentsForCompare, segmentCache } = analysisState;
    if (segmentsForCompare.length !== 2) return;

    const [urlA, urlB] = segmentsForCompare;
    const segmentA = segmentCache.get(urlA);
    const segmentB = segmentCache.get(urlB);

    if (!segmentA?.data || !segmentB?.data) {
        alert('One or both selected segments have not been fetched successfully.');
        return;
    }

    dom.modalTitle.textContent = 'Segment Comparison';
    dom.modalSegmentUrl.textContent = `Comparing Segment A vs. Segment B`;
    const modalContent = dom.segmentModal.querySelector('div');
    dom.segmentModal.classList.remove('opacity-0', 'invisible');
    dom.segmentModal.classList.add('opacity-100', 'visible');
    modalContent.classList.remove('scale-95');
    modalContent.classList.add('scale-100');

    dispatchAndRenderSegmentAnalysis(null, segmentA.data, segmentB.data);
}

// --- DASH-SPECIFIC ORCHESTRATION ---
async function loadAndRenderDashSegmentRange(mode) {
    const contentArea = document.getElementById('segment-explorer-content');
    render(html`<p class="info">Fetching segment data...</p>`, contentArea);
    eventBus.dispatch('compare:clear');
    stopSegmentFreshnessChecker();

    const segmentsToFetch = Object.values(allSegmentsByRep).flatMap((segments) =>
        mode === 'first'
            ? segments.slice(0, SEGMENT_PAGE_SIZE)
            : segments.slice(-SEGMENT_PAGE_SIZE)
    );
    await Promise.all(
        segmentsToFetch.map((seg) => fetchSegment(seg.resolvedUrl))
    );

    renderDashExplorer(
        currentStream,
        allSegmentsByRep,
        SEGMENT_PAGE_SIZE,
        mode
    );

    if (currentStream.manifest.type === 'dynamic') {
        startSegmentFreshnessChecker();
    }
}

// --- DISPATCHER & MAIN TEMPLATE ---
export function initializeSegmentExplorer(container, stream) {
    // IDEMPOTENCY GUARD: If we are already displaying the correct stream, do nothing.
    if (currentStream && currentStream.id === stream.id) {
        return;
    }

    currentContainer = container;
    currentStream = stream;
    allSegmentsByRep =
        stream.protocol === 'dash' ? parseAllSegmentUrls(stream) : {};

    const template = html`
        <div class="flex flex-wrap justify-between items-center mb-4 gap-4">
            <h3 class="text-xl font-bold">Segment Explorer</h3>
            <div
                id="segment-explorer-controls"
                class="flex items-center flex-wrap gap-4"
            >
                ${stream.protocol === 'dash'
                    ? html`
                          <button
                              @click=${() =>
                                  loadAndRenderDashSegmentRange('first')}
                              class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-md transition-colors"
                          >
                              First ${SEGMENT_PAGE_SIZE}
                          </button>
                          ${stream.manifest.type === 'dynamic'
                              ? html`<button
                                    @click=${() =>
                                        loadAndRenderDashSegmentRange('last')}
                                    class="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-3 rounded-md transition-colors"
                                >
                                    Last ${SEGMENT_PAGE_SIZE}
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
        </div>
        <div id="segment-explorer-content" class="space-y-4"></div>
    `;
    render(template, container);

    if (stream.protocol === 'dash') {
        loadAndRenderDashSegmentRange('first');
    } else {
        renderHlsExplorer(stream);
    }
}

export function startSegmentFreshnessChecker() {
    stopSegmentFreshnessChecker();
    if (
        currentStream &&
        currentStream.manifest.type === 'dynamic' &&
        currentStream.protocol === 'dash'
    ) {
        // This logic is now protocol-specific and will be moved.
        // segmentFreshnessInterval = setInterval(() => { /* TODO */ }, 2000);
    }
}

export function stopSegmentFreshnessChecker() {
    if (segmentFreshnessInterval) {
        clearInterval(segmentFreshnessInterval);
        segmentFreshnessInterval = null;
    }
}

// Subscribe to state changes to update the compare button
eventBus.subscribe('state:compare-list-changed', ({ count }) => {
    const compareButton = document.getElementById('segment-compare-btn');
    if (compareButton) {
        compareButton.textContent = `Compare Selected (${count}/2)`;
        compareButton.toggleAttribute('disabled', count !== 2);
    }
});