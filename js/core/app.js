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
import { render, html } from 'lit-html';
import { getInteractiveManifestTemplate } from '../features/interactive-manifest/view.js';
import { getFeaturesAnalysisTemplate } from '../features/feature-analysis/view.js';
import {
    startFeaturePolling,
    stopAllFeaturePolling,
} from '../features/feature-analysis/poll.js';

// Initialize services to activate their event listeners
import '../services/streamService.js';
import '../services/segmentService.js';
// Initialize the state manager to activate its listeners
import './state-manager.js';
// Initialize feature polling service
import '../features/feature-analysis/poll.js';

const HISTORY_KEY = 'dash_analyzer_history';
const PRESETS_KEY = 'dash_analyzer_presets';
const MAX_HISTORY_ITEMS = 10;

// --- DOM EVENT LISTENERS ---
dom.addStreamBtn.addEventListener('click', addStreamInput);
dom.analyzeBtn.addEventListener('click', handleAnalysis);
dom.tabs.addEventListener('click', handleTabClick);
dom.newAnalysisBtn.addEventListener('click', () => {
    // --- STOP ALL BACKGROUND ACTIVITY ---
    stopManifestUpdatePolling();
    stopAllFeaturePolling();

    // --- RESET DATA STATE ---
    // This centrally resets streams, segment cache, counters, etc. via the state manager.
    eventBus.dispatch('analysis:started');

    // --- RESET UI TO INITIAL CONFIGURATION ---
    dom.results.classList.add('hidden');
    dom.newAnalysisBtn.classList.add('hidden');
    dom.contextSwitcherContainer.classList.add('hidden');
    dom.inputSection.classList.remove('hidden');
    dom.status.textContent = '';

    // --- RESET STREAM INPUTS ---
    // This is safe as inputs are not managed by a single lit-html render call.
    dom.streamInputs.innerHTML = '';
    addStreamInput(); // Creates the first, fresh input field.

    // --- CORRECTLY CLEAR LIT-HTML RENDERED CONTENT ---
    // Using render with an empty template prevents the "Cannot read properties of null
    // (reading 'nextSibling')" error by keeping lit-html's internal state synchronized.
    Object.values(dom.tabContents).forEach((container) => {
        if (container) {
            render(html``, container);
        }
    });

    // --- VISUALLY RESET TABS TO A DEFAULT STATE ---
    // We'll set the 'Comparison' tab to be visually active for when results are shown again.
    const firstTab = /** @type {HTMLElement} */ (
        dom.tabs.querySelector('[data-tab="comparison"]')
    );
    const activeClasses = ['border-blue-600', 'text-gray-100', 'bg-gray-700'];
    const inactiveClasses = ['border-transparent'];
    dom.tabs.querySelectorAll('[data-tab]').forEach((t) => {
        t.classList.remove(...activeClasses);
        t.classList.add(...inactiveClasses);
    });
    if (firstTab) {
        firstTab.classList.add(...activeClasses);
        firstTab.classList.remove(...inactiveClasses);
    }
});

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
/**
 * Saves a successfully analyzed stream to the "Recent" list in localStorage.
 * It avoids adding streams that are already saved as user presets.
 * @param {import('./state.js').Stream} stream
 */
function saveStreamToHistory(stream) {
    if (!stream || !stream.originalUrl) return;

    const presets = /** @type {Array<object>} */ (
        JSON.parse(localStorage.getItem(PRESETS_KEY) || '[]')
    );
    const isPreset = presets.some((p) => p.url === stream.originalUrl);

    // Don't add to recent history if the user has it saved as a preset
    if (isPreset) return;

    let history = /** @type {Array<object>} */ (
        JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    );
    // Remove any previous entry with the same URL to prevent duplicates
    history = history.filter((item) => item.url !== stream.originalUrl);

    // Add the new, enriched stream object to the front
    history.unshift({
        name: stream.name,
        url: stream.originalUrl,
        protocol: stream.protocol,
        type: stream.manifest?.type === 'dynamic' ? 'live' : 'vod',
    });

    if (history.length > MAX_HISTORY_ITEMS) {
        history.length = MAX_HISTORY_ITEMS;
    }

    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// --- UI ACTION DISPATCHER ---
function handleAnalysis() {
    const inputGroups =
        dom.streamInputs.querySelectorAll('.stream-input-group');

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
    if (streams.length > 0) {
        // Save the first analyzed stream to history with all its details.
        saveStreamToHistory(streams[0]);
    }
    const defaultTab = streams.length > 1 ? 'comparison' : 'summary';
    populateContextSwitcher();
    renderAllTabs();
    showStatus(`Analysis Complete for ${streams.length} stream(s).`, 'pass');
    // --- New UI Flow ---
    dom.inputSection.classList.add('hidden');
    dom.results.classList.remove('hidden');
    dom.newAnalysisBtn.classList.remove('hidden');
    // --- End New UI Flow ---
    /** @type {HTMLButtonElement} */ (
        document.querySelector(`[data-tab="${defaultTab}"]`)
    ).click();

    // Start feature polling for all dynamic streams
    analysisState.streams.forEach(startFeaturePolling);
});

// Surgical re-render for the interactive manifest view
eventBus.subscribe('state:stream-updated', () => {
    const stream = analysisState.streams.find(
        (s) => s.id === analysisState.activeStreamId
    );
    if (stream) {
        render(
            getInteractiveManifestTemplate(stream),
            dom.tabContents['interactive-manifest']
        );
    }
});

eventBus.subscribe('ui:rerender-tabs', () => {
    renderAllTabs();
});

// Surgical re-render for the features tab when polling provides new data
eventBus.subscribe('ui:rerender-features-tab', () => {
    const stream = analysisState.streams.find(
        (s) => s.id === analysisState.activeStreamId
    );
    if (stream) {
        render(getFeaturesAnalysisTemplate(stream), dom.tabContents['features']);
    }
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