import { dom, analysisState, initializeDom } from './state.js';
import { setupGlobalTooltipListener } from '../ui/components/tooltip.js';
import { eventBus } from './event-bus.js';
import {
    addStreamInput,
    renderStreamInputs,
    resetAndRenderAllStreamInputs,
} from '../ui/components/stream-inputs.js';
import { handleTabClick } from '../ui/tabs.js';
import { initializeModal } from './modal.js';
import {
    populateContextSwitcher,
    renderAllTabs,
    showStatus,
} from '../ui/rendering.js';
import {
    initializeLiveStreamMonitor,
    stopAllMonitoring,
} from '../services/primaryStreamMonitorService.js';
import { initializeUiController } from '../ui/ui-controller.js';

import '../services/streamService.js';
import '../services/segmentService.js';
import './state-manager.js';

const HISTORY_KEY = 'dash_analyzer_history';
const PRESETS_KEY = 'dash_analyzer_presets';
const MAX_HISTORY_ITEMS = 10;

function handleShare() {
    const { streams } = analysisState;

    if (streams.length === 0) return;

    const url = new URL(window.location.origin + window.location.pathname);
    streams.forEach((stream) => {
        if (stream.originalUrl) {
            url.searchParams.append('url', stream.originalUrl);
        }
    });

    navigator.clipboard
        .writeText(url.href)
        .then(() => {
            const originalText = dom.shareAnalysisBtn.textContent;
            dom.shareAnalysisBtn.textContent = 'Copied!';
            setTimeout(() => {
                dom.shareAnalysisBtn.textContent = originalText;
            }, 2000);
        })
        .catch((err) => {
            console.error('Failed to copy URL: ', err);
            alert('Failed to copy URL to clipboard.');
        });
}

// Encapsulate all event listener attachments in an initialization function.
function initializeEventListeners() {
    dom.addStreamBtn.addEventListener('click', () => {
        addStreamInput();
        renderStreamInputs();
    });
    dom.analyzeBtn.addEventListener('click', handleAnalysis);
    dom.tabs.addEventListener('click', handleTabClick);
    dom.newAnalysisBtn.addEventListener('click', () => {
        stopAllMonitoring();
        eventBus.dispatch('analysis:started');
    });
    dom.contextSwitcher.addEventListener('change', (e) => {
        const target = /** @type {HTMLSelectElement} */ (e.target);
        analysisState.activeStreamId = parseInt(target.value);
        renderAllTabs();
    });
    dom.shareAnalysisBtn.addEventListener('click', handleShare);
}

// --- HISTORY & PRESET MANAGEMENT ---
function saveStreamToHistory(stream) {
    if (!stream || !stream.originalUrl) return;
    const presets = /** @type {Array<object>} */ (
        JSON.parse(localStorage.getItem(PRESETS_KEY) || '[]')
    );
    const isPreset = presets.some((p) => p.url === stream.originalUrl);
    if (isPreset) return;
    let history = /** @type {Array<object>} */ (
        JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    );
    history = history.filter((item) => item.url !== stream.originalUrl);
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

// --- CORE ANALYSIS TRIGGER ---
function handleAnalysis() {
    const inputGroups = dom.streamInputs.querySelectorAll(
        '.stream-input-group'
    );
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
        .filter((input) => input.url || input.file);

    if (inputs.length > 0) {
        eventBus.dispatch('analysis:request', { inputs });
    } else {
        showStatus('Please provide a stream URL or file to analyze.', 'warn');
    }
}

export function initializeApp() {
    // --- EVENT BUS SUBSCRIPTIONS (Application Level) ---
    eventBus.subscribe('state:analysis-complete', ({ streams }) => {
        if (streams.length > 0) {
            saveStreamToHistory(streams[0]);
        }
        const defaultTab = streams.length > 1 ? 'comparison' : 'summary';
        populateContextSwitcher();
        renderAllTabs();
        showStatus(
            `Analysis Complete for ${streams.length} stream(s).`,
            'pass',
            5000
        );
        dom.status.textContent = ''; // Clear persistent status

        dom.inputSection.classList.add('hidden');
        dom.results.classList.remove('hidden');
        dom.newAnalysisBtn.classList.remove('hidden');
        dom.shareAnalysisBtn.classList.remove('hidden');

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
    });

    eventBus.subscribe('analysis:error', ({ message, error }) => {
        showStatus(message, 'fail', 8000);
        console.error('An analysis error occurred:', error);
    });

    eventBus.subscribe('analysis:failed', () => {
        dom.results.classList.add('hidden');
    });

    eventBus.subscribe('ui:show-status', ({ message, type }) => {
        showStatus(message, type);
    });
}

export function startApp() {
    initializeDom();
    initializeApp();
    // Check for URL parameters to auto-start analysis
    const urlParams = new URLSearchParams(window.location.search);
    const streamUrls = urlParams.getAll('url');

    // Call initialization logic that depends on the DOM being ready.
    initializeEventListeners();
    setupGlobalTooltipListener();
    initializeModal();
    initializeUiController();
    initializeLiveStreamMonitor(); // Initialize the central monitor

    if (streamUrls.length > 0 && streamUrls[0]) {
        const inputs = streamUrls.map((url, index) => ({
            id: index,
            url: url,
            file: null,
        }));
        eventBus.dispatch('analysis:request', { inputs });
    } else {
        resetAndRenderAllStreamInputs();
    }
}

document.addEventListener('DOMContentLoaded', startApp);
