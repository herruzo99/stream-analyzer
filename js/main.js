import { dom, analysisState } from './state.js';
import {
    addStreamInput,
    handleTabClick,
    populateContextSwitcher,
    renderAllTabs,
    showStatus,
} from './ui.js';
import { parseMpd } from './api/dash-parser.js';
import { setupGlobalTooltipListener } from './tooltip.js';
import { startMpdUpdatePolling, stopMpdUpdatePolling } from './mpd-poll.js';

const HISTORY_KEY = 'dash_analyzer_history';
const MAX_HISTORY_ITEMS = 10;

// --- EVENT LISTENERS ---
dom.addStreamBtn.addEventListener('click', addStreamInput);
dom.analyzeBtn.addEventListener('click', handleAnalysis);
dom.tabs.addEventListener('click', handleTabClick);
dom.closeModalBtn.addEventListener('click', () =>
    dom.segmentModal.classList.remove('modal-overlay-visible')
);
dom.contextSwitcher.addEventListener('change', (e) => {
    const target = /** @type {HTMLSelectElement} */ (e.target);
    analysisState.activeStreamId = parseInt(target.value);
    renderAllTabs();
});

document.addEventListener('DOMContentLoaded', () => {
    addStreamInput();
    setupGlobalTooltipListener();
});

// --- HISTORY MANAGEMENT ---
function saveUrlToHistory(url) {
    if (!url) return;
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    // Remove the URL if it already exists to move it to the top
    history = history.filter(item => item !== url);
    // Add the new URL to the beginning of the array
    history.unshift(url);
    // Trim the history to the maximum number of items
    if (history.length > MAX_HISTORY_ITEMS) {
        history.length = MAX_HISTORY_ITEMS;
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// --- CORE LOGIC ---
async function handleAnalysis() {
    stopMpdUpdatePolling();
    showStatus('Starting analysis...', 'info');
    analysisState.streams = [];
    const inputGroups = dom.streamInputs.querySelectorAll('.stream-input-group');

    const promises = Array.from(inputGroups).map(async (group) => {
        const id = parseInt(/** @type {HTMLElement} */ (group).dataset.id);
        const urlInput = /** @type {HTMLInputElement} */ (group.querySelector('.input-url'));
        const fileInput = /** @type {HTMLInputElement} */ (group.querySelector('.input-file'));

        let xmlString = '';
        let name = `Stream ${id + 1}`;
        let originalUrl = '';
        let baseUrl = '';

        try {
            if (urlInput.value) {
                originalUrl = urlInput.value;
                name = new URL(originalUrl).hostname;
                baseUrl = new URL(originalUrl, window.location.href).href;
                showStatus(`Fetching ${name}...`, 'info');
                const response = await fetch(originalUrl);
                if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
                xmlString = await response.text();
                // Save URL to history only on successful fetch
                saveUrlToHistory(originalUrl);
            } else if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                name = file.name;
                baseUrl = window.location.href;
                showStatus(`Reading ${name}...`, 'info');
                xmlString = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(/** @type {string} */ (e.target.result));
                    reader.onerror = (e) => reject(e);
                    reader.readAsText(file);
                });
            } else {
                return null;
            }

            const { mpd, baseUrl: newBaseUrl } = parseMpd(xmlString, baseUrl);
            baseUrl = newBaseUrl;

            return { id, name, originalUrl, baseUrl, mpd };
        } catch (error) {
            showStatus(`Failed to process stream ${id + 1} (${name}): ${error.message}`, 'fail');
            throw error;
        }
    });

    try {
        const results = await Promise.all(promises);
        analysisState.streams = results.filter(Boolean);

        if (analysisState.streams.length === 0) {
            showStatus('No valid streams to analyze.', 'warn');
            return;
        }

        analysisState.streams.sort((a, b) => a.id - b.id);
        analysisState.activeStreamId = analysisState.streams[0].id;
        
        const defaultTab = analysisState.streams.length > 1 ? 'comparison' : 'summary';
        
        populateContextSwitcher();
        renderAllTabs();

        showStatus(`Analysis Complete for ${analysisState.streams.length} stream(s).`, 'pass');
        dom.results.classList.remove('hidden');

        /** @type {HTMLButtonElement} */ (
            document.querySelector(`.tab[data-tab="${defaultTab}"]`)
        ).click();

    } catch (error) {
        console.error("Analysis failed:", error);
        dom.results.classList.add('hidden');
    }
}