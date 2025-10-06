import { setupGlobalTooltipListener } from '../ui/components/tooltip.js';
import { eventBus } from './event-bus.js';
import { addStreamInput } from '../ui/components/stream-inputs.js';
import { initializeTabs } from '../ui/tabs.js';
import { initializeModalComponent } from '../ui/components/modal.js';
import {
    initializeLiveStreamMonitor,
    stopAllMonitoring,
} from '../services/primaryStreamMonitorService.js';
import { initializeUiController } from '../ui/ui-controller.js';
import { initializeViewManager } from '../ui/view-manager.js';
import { initializeToastManager } from '../ui/components/toast.js';
import { initializeLiveUpdateProcessor } from '../services/liveUpdateProcessor.js';
import { useStore, storeActions } from './store.js';
import {
    saveToHistory,
    saveLastUsedStreams,
    getLastUsedStreams,
    getHistory,
    getPresets,
} from '../shared/utils/stream-storage.js';
import { initializeHlsVariantPoller } from '../services/hlsVariantPollerService.js';
import { initializeCmafService } from '../services/cmafService.js';
import { copyDebugInfoToClipboard } from '../services/debugService.js';
import { copyShareUrlToClipboard } from '../services/shareService.js';
import { initializeRenderer, renderApp } from '../ui/mainRenderer.js';
import { initializeLoader } from '../ui/components/loader.js';
import { initializeConsentManager } from './consent-manager.js';

import '../services/streamService.js';
import '../services/segmentService.js';

// Encapsulate all event listener attachments in an initialization function.
function initializeEventListeners(dom) {
    dom.addStreamBtn.addEventListener('click', () => {
        addStreamInput();
    });
    dom.analyzeBtn.addEventListener('click', () => handleAnalysis(dom));
    dom.newAnalysisBtn.addEventListener('click', () => {
        stopAllMonitoring();
        storeActions.startAnalysis(); // Use direct action for state change
    });
    dom.clearAllBtn.addEventListener('click', () => {
        storeActions.resetStreamInputIds();
    });
    dom.contextSwitcher.addEventListener('change', async (e) => {
        const target = /** @type {HTMLSelectElement} */ (e.target);
        storeActions.setActiveStreamId(parseInt(target.value, 10));
    });
    dom.shareAnalysisBtn.addEventListener('click', copyShareUrlToClipboard);
    dom.copyDebugBtn.addEventListener('click', copyDebugInfoToClipboard);
}

// --- CORE ANALYSIS TRIGGER ---
function handleAnalysis(dom) {
    const inputGroups = dom.streamInputs.querySelectorAll(
        '.stream-input-group'
    );
    const inputs = Array.from(inputGroups)
        .map((group) => {
            const id = parseInt(/** @type {HTMLElement} */ (group).dataset.id);
            const urlInput = /** @type {HTMLInputElement} */ (
                group.querySelector('.input-url')
            );
            const nameInput = /** @type {HTMLInputElement} */ (
                group.querySelector('.input-name')
            );
            const fileInput = /** @type {HTMLInputElement} */ (
                group.querySelector('.input-file')
            );
            return {
                id,
                url: urlInput.value,
                name: nameInput.value,
                file: fileInput.files.length > 0 ? fileInput.files[0] : null,
            };
        })
        .filter((input) => input.url || input.file);

    if (inputs.length > 0) {
        const streamsToSave = inputs
            .filter((i) => i.url) // Only save URL-based inputs
            .map((i) => ({ url: i.url, name: i.name }));
        saveLastUsedStreams(streamsToSave);

        eventBus.dispatch('analysis:request', { inputs });
    } else {
        eventBus.dispatch('ui:show-status', {
            message: 'Please provide a stream URL or file to analyze.',
            type: 'warn',
        });
    }
}

export function initializeApp() {
    // --- EVENT BUS SUBSCRIPTIONS (Application Level) ---
    eventBus.subscribe('state:analysis-complete', ({ streams }) => {
        if (streams.length > 0) {
            saveToHistory(streams[0]);
            // Set the active tab based on the number of streams
            const defaultTab = streams.length > 1 ? 'comparison' : 'summary';
            storeActions.setActiveTab(defaultTab);
        }
    });

    eventBus.subscribe('analysis:error', ({ message, error }) => {
        eventBus.dispatch('ui:show-status', {
            message,
            type: 'fail',
            duration: 8000,
        });
        console.error('An analysis error occurred:', error);
    });
}

/**
 * Populates the stream input fields from the last used streams in storage.
 * @param {object} dom The DOM context.
 */
function populateLastUsedStreams(dom) {
    const lastUsed = getLastUsedStreams();
    if (lastUsed && lastUsed.length > 0) {
        storeActions.setStreamInputsFromData(lastUsed);
        const allStoredStreams = [...getHistory(), ...getPresets()];

        // Defer DOM manipulation until after the state change has rendered.
        Promise.resolve().then(() => {
            const inputGroups = dom.streamInputs.querySelectorAll(
                '.stream-input-group'
            );
            inputGroups.forEach((group, index) => {
                if (!lastUsed[index]) return;

                const urlInput = /** @type {HTMLInputElement} */ (
                    group.querySelector('.input-url')
                );
                const nameInput = /** @type {HTMLInputElement} */ (
                    group.querySelector('.input-name')
                );

                if (urlInput) {
                    const lastUsedUrl = lastUsed[index].url || '';
                    urlInput.value = lastUsedUrl;

                    const storedItem = allStoredStreams.find(
                        (s) => s.url === lastUsedUrl
                    );
                    if (storedItem) {
                        nameInput.value = storedItem.name;
                    }

                    // Manually trigger the input event to correctly set the save button state
                    urlInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });
        });
    }
}

export async function startApp() {
    // --- DOM ELEMENT COLLECTION (Single Source of Truth) ---
    const dom = {
        mainHeader: document.getElementById('main-header'),
        headerTitleGroup: document.getElementById('header-title-group'),
        headerUrlDisplay: document.getElementById('header-url-display'),
        streamInputs: document.getElementById('stream-inputs'),
        addStreamBtn: document.getElementById('add-stream-btn'),
        analyzeBtn: document.getElementById('analyze-btn'),
        clearAllBtn: document.getElementById('clear-all-btn'),
        toastContainer: document.getElementById('toast-container'),
        results: document.getElementById('results'),
        inputSection: document.getElementById('input-section'),
        newAnalysisBtn: document.getElementById('new-analysis-btn'),
        shareAnalysisBtn: document.getElementById('share-analysis-btn'),
        copyDebugBtn: document.getElementById('copy-debug-btn'),
        tabs: document.getElementById('tabs'),
        contextSwitcherWrapper: document.getElementById(
            'context-switcher-wrapper'
        ),
        contextSwitcher: document.getElementById('context-switcher'),
        tabContents: {
            comparison: document.getElementById('tab-comparison'),
            summary: document.getElementById('tab-summary'),
            'timeline-visuals': document.getElementById('tab-timeline-visuals'),
            features: document.getElementById('tab-features'),
            compliance: document.getElementById('tab-compliance'),
            explorer: document.getElementById('tab-explorer'),
            'interactive-segment': document.getElementById(
                'tab-interactive-segment'
            ),
            'interactive-manifest': document.getElementById(
                'tab-interactive-manifest'
            ),
            updates: document.getElementById('tab-updates'),
        },
        segmentModal: document.getElementById('segment-modal'),
        modalTitle: document.getElementById('modal-title'),
        modalSegmentUrl: document.getElementById('modal-segment-url'),
        modalContentArea: document.getElementById('modal-content-area'),
        closeModalBtn: document.getElementById('close-modal-btn'),
        globalTooltip: document.getElementById('global-tooltip'),
        globalLoader: document.getElementById('global-loader'),
        loaderMessage: document.getElementById('loader-message'),
    };

    // --- INITIALIZATION ---
    initializeConsentManager();
    initializeApp();
    initializeRenderer(dom);
    initializeToastManager(dom);
    initializeLoader(dom);
    initializeViewManager();
    initializeLiveUpdateProcessor();
    initializeTabs(dom);
    initializeModalComponent(dom);
    initializeUiController(dom);
    setupGlobalTooltipListener(dom);
    initializeLiveStreamMonitor();
    initializeHlsVariantPoller();
    initializeCmafService();
    initializeEventListeners(dom);

    // --- MAIN RENDER LOOP ---
    useStore.subscribe(renderApp);

    // Initial render based on default state from createInitialState()
    renderApp();

    // --- INPUT POPULATION LOGIC ---
    const urlParams = new URLSearchParams(window.location.search);
    const streamUrls = urlParams.getAll('url');

    if (streamUrls.length > 0 && streamUrls[0]) {
        // 1. URL parameters take highest precedence and trigger analysis directly
        const inputs = streamUrls.map((url, index) => ({
            id: index,
            url: url,
            file: null,
        }));
        eventBus.dispatch('analysis:request', { inputs });
    } else {
        // 2. Otherwise, try to populate from localStorage
        populateLastUsedStreams(dom);
    }
}

document.addEventListener('DOMContentLoaded', startApp);