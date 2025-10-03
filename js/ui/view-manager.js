import { dom } from '../core/dom.js';
import { eventBus } from '../core/event-bus.js';
import { populateContextSwitcher, renderAllTabs } from './rendering.js';
import { resetAndRenderAllStreamInputs } from './components/stream-inputs.js';
import { showToast } from './components/toast.js';

const ViewState = {
    INPUT: 'input',
    RESULTS: 'results',
};

/**
 * Encapsulates all DOM manipulations for switching between major UI views.
 * @param {string} state - The target view state ('input' or 'results').
 * @param {object} [data] - Optional data required for rendering the view.
 */
function setView(state, data) {
    const globalControls = document.getElementById('global-stream-controls');

    if (state === ViewState.INPUT) {
        // --- Reset to Input View ---
        dom.results.classList.add('hidden');
        dom.newAnalysisBtn.classList.add('hidden');
        dom.shareAnalysisBtn.classList.add('hidden');
        dom.copyDebugBtn.classList.add('hidden');
        dom.contextSwitcherWrapper.classList.add('hidden');
        dom.inputSection.classList.remove('hidden');
        if (globalControls) globalControls.classList.add('hidden');

        // Reset header layout
        dom.mainHeader.classList.add('justify-center');
        dom.mainHeader.classList.remove('justify-between');
        dom.headerTitleGroup.classList.add('text-center');
        dom.headerTitleGroup.classList.remove('text-left');
        dom.headerUrlDisplay.classList.add('hidden');
        dom.headerUrlDisplay.innerHTML = '';

        resetAndRenderAllStreamInputs();

        // Clear out old results to prevent stale data flashing on next analysis
        Object.values(dom.tabContents).forEach((container) => {
            if (container) container.innerHTML = '';
        });
    } else if (state === ViewState.RESULTS) {
        // --- Transition to Results View ---
        const { streams } = data;
        if (!streams || streams.length === 0) return;

        const defaultTab = streams.length > 1 ? 'comparison' : 'summary';

        populateContextSwitcher();
        renderAllTabs();
        showToast({
            message: `Analysis Complete for ${streams.length} stream(s).`,
            type: 'pass',
            duration: 5000,
        });

        dom.inputSection.classList.add('hidden');
        dom.results.classList.remove('hidden');
        dom.newAnalysisBtn.classList.remove('hidden');
        dom.shareAnalysisBtn.classList.remove('hidden');
        dom.copyDebugBtn.classList.remove('hidden');
        if (globalControls) globalControls.classList.remove('hidden');

        dom.mainHeader.classList.remove('justify-center');
        dom.mainHeader.classList.add('justify-between');
        dom.headerTitleGroup.classList.remove('text-center');
        dom.headerTitleGroup.classList.add('text-left');
        dom.headerUrlDisplay.classList.remove('hidden');

        const urlHtml = streams
            .map(
                (s) =>
                    `<div class="truncate" title="${s.originalUrl}">${s.originalUrl}</div>`
            )
            .join('');
        dom.headerUrlDisplay.innerHTML = `<span class="font-bold text-gray-300 block mb-1">Analyzed Stream(s):</span>${urlHtml}`;

        /** @type {HTMLButtonElement} */ (
            document.querySelector(`[data-tab="${defaultTab}"]`)
        ).click();
    }
}

/**
 * Subscribes to application-level events to manage view transitions.
 */
export function initializeViewManager() {
    eventBus.subscribe('analysis:started', () => setView(ViewState.INPUT));
    eventBus.subscribe('state:analysis-complete', (data) =>
        setView(ViewState.RESULTS, data)
    );
    eventBus.subscribe('analysis:failed', () => setView(ViewState.INPUT));
}
