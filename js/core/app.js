import { dom, analysisState } from './state.js';
import { setupGlobalTooltipListener } from '../ui/tooltip.js';
import { stopManifestUpdatePolling } from '../features/manifest-updates/poll.js';
import { eventBus } from './event-bus.js';
import { addStreamInput } from '../ui/stream-inputs.js';
import { handleTabClick } from '../ui/tabs.js';
import { initializeModal } from './modal.js';
import {
    populateContextSwitcher,
    renderAllTabs,
    showStatus,
} from '../ui/rendering.js';

// Initialize services to activate their event listeners
import '../services/streamService.js';
import '../services/segmentService.js';
// Initialize the state manager to activate its listeners
import './state-manager.js';

const HISTORY_KEY = 'dash_analyzer_history';
const MAX_HISTORY_ITEMS = 10;

// --- DOM EVENT LISTENERS ---
dom.addStreamBtn.addEventListener('click', addStreamInput);
dom.analyzeBtn.addEventListener('click', handleAnalysis);
dom.tabs.addEventListener('click', handleTabClick);
dom.contextSwitcher.addEventListener('change', (e) => {
    const target = /** @type {HTMLSelectElement} */ (e.target);
    analysisState.activeStreamId = parseInt(target.value);
    renderAllTabs();
});

document.addEventListener('DOMContentLoaded', () => {
    addStreamInput();
    setupGlobalTooltipListener();
    initializeModal();
});

// --- HISTORY MANAGEMENT ---
function saveUrlToHistory(url) {
    if (!url) return;
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history = history.filter((item) => item !== url);
    history.unshift(url);
    if (history.length > MAX_HISTORY_ITEMS) {
        history.length = MAX_HISTORY_ITEMS;
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// --- UI ACTION DISPATCHER ---
function handleAnalysis() {
    const inputGroups = dom.streamInputs.querySelectorAll('.stream-input-group');

    const inputs = Array.from(inputGroups)
        .map((group) => {
            const id = parseInt(/** @type {HTMLElement} */ (group).dataset.id);
            const urlInput = /** @type {HTMLInputElement} */ (
                group.querySelector('.input-url')
            );
            const fileInput = /** @type {HTMLInputElement} */ (
                group.querySelector('.input-file')
            );

            return {
                id,
                url: urlInput.value,
                file: fileInput.files.length > 0 ? fileInput.files[0] : null,
            };
        })
        .filter((input) => input.url || input.file); // Filter out empty inputs

    if (inputs.length > 0) {
        eventBus.dispatch('analysis:request', { inputs });
    } else {
        showStatus('Please provide a stream URL or file to analyze.', 'warn');
    }
}

// --- EVENT BUS SUBSCRIPTIONS (Application Wiring) ---

eventBus.subscribe('state:analysis-complete', () => {
    const { streams } = analysisState;
    if (streams[0]?.originalUrl) {
        saveUrlToHistory(streams[0].originalUrl);
    }
    const defaultTab = streams.length > 1 ? 'comparison' : 'summary';
    populateContextSwitcher();
    renderAllTabs();
    showStatus(`Analysis Complete for ${streams.length} stream(s).`, 'pass');
    dom.results.classList.remove('hidden');
    /** @type {HTMLButtonElement} */ (
        document.querySelector(`[data-tab="${defaultTab}"]`)
    ).click();
});

eventBus.subscribe('ui:rerender-tabs', () => {
    renderAllTabs();
});

eventBus.subscribe('analysis:error', ({ message, error }) => {
    showStatus(message, 'fail');
    console.error('An analysis error occurred:', error);
});

eventBus.subscribe('analysis:failed', () => {
    dom.results.classList.add('hidden');
});

eventBus.subscribe('ui:show-status', ({ message, type }) => {
    showStatus(message, type);
});