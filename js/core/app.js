import { dom, initializeDom } from './dom.js';
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
    initializeLiveStreamMonitor,
    stopAllMonitoring,
} from '../services/primaryStreamMonitorService.js';
import { initializeUiController } from '../ui/ui-controller.js';
import { initializeViewManager } from '../ui/view-manager.js';
import { initializeToastManager, showToast } from '../ui/components/toast.js';
import { initializeLiveUpdateProcessor } from '../services/liveUpdateProcessor.js';
import { useStore, storeActions } from './store.js';

import '../services/streamService.js';
import '../services/segmentService.js';

const HISTORY_KEY = 'dash_analyzer_history';
const PRESETS_KEY = 'dash_analyzer_presets';
const MAX_HISTORY_ITEMS = 10;

function handleShare() {
    const streams = useStore.getState().streams;

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
            showToast({
                message: 'Shareable URL copied to clipboard!',
                type: 'pass',
            });
        })
        .catch((err) => {
            console.error('Failed to copy URL: ', err);
            showToast({
                message: 'Failed to copy URL to clipboard.',
                type: 'fail',
            });
        });
}

function handleCopyDebugInfo() {
    const state = useStore.getState();

    const replacer = (key, value) => {
        if (value instanceof Map) {
            return {
                __dataType: 'Map',
                value: Array.from(value.entries()),
            };
        }
        if (value instanceof Set) {
            return {
                __dataType: 'Set',
                value: Array.from(value.values()),
            };
        }
        if (key === 'serializedManifest') {
            return '[Circular/ParsedObject]';
        }
        return value;
    };

    try {
        const debugData = {
            timestamp: new Date().toISOString(),
            appState: state,
        };

        const jsonString = JSON.stringify(debugData, replacer, 2);

        navigator.clipboard
            .writeText(jsonString)
            .then(() => {
                showToast({
                    message: 'Debug info copied to clipboard!',
                    type: 'pass',
                });
            })
            .catch((err) => {
                console.error('Failed to copy debug info:', err);
                showToast({
                    message: 'Failed to copy debug info.',
                    type: 'fail',
                });
            });
    } catch (error) {
        console.error('Error serializing debug state:', error);
        showToast({ message: 'Error creating debug info.', type: 'fail' });
    }
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
    dom.contextSwitcher.addEventListener('change', async (e) => {
        const target = /** @type {HTMLSelectElement} */ (e.target);
        storeActions.setActiveStreamId(parseInt(target.value, 10));
    });
    dom.shareAnalysisBtn.addEventListener('click', handleShare);
    dom.copyDebugBtn.addEventListener('click', handleCopyDebugInfo);
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
        showToast({
            message: 'Please provide a stream URL or file to analyze.',
            type: 'warn',
        });
    }
}

export function initializeApp() {
    // --- EVENT BUS SUBSCRIPTIONS (Application Level) ---
    eventBus.subscribe('state:analysis-complete', ({ streams }) => {
        if (streams.length > 0) {
            saveStreamToHistory(streams[0]);
        }
    });

    eventBus.subscribe('analysis:error', ({ message, error }) => {
        showToast({ message, type: 'fail', duration: 8000 });
        console.error('An analysis error occurred:', error);
    });
}

export async function startApp() {
    initializeDom();
    initializeApp();
    initializeViewManager(); // Initialize the view state controller
    initializeLiveUpdateProcessor(); // Initialize the live update service
    initializeToastManager(); // Initialize the toast notification system

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
