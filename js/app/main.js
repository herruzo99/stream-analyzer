import { Application } from './app.js';
import { setupGlobalTooltipListener } from '../ui/components/tooltip.js';
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
import { initializeHlsVariantPoller } from '../services/hlsVariantPollerService.js';
import { initializeCmafService } from '../services/cmafService.js';
import { initializeRenderer, renderApp } from '../ui/mainRenderer.js';
import { initializeLoader } from '../ui/components/loader.js';
import { initializeConsentManager } from './consent-manager.js';
import { eventBus } from './event-bus.js';
import {
    saveLastUsedStreams,
    getLastUsedStreams,
    getHistory,
    getPresets,
} from '../shared/utils/stream-storage.js';

// Side-effect driven imports for services that primarily listen to the event bus
import '../services/streamService.js';
import '../services/segmentService.js';

/**
 * The main entry point for the application.
 * This function orchestrates the setup and startup of all application components.
 */
async function startApp() {
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
            'integrators-report': document.getElementById(
                'tab-integrators-report'
            ),
            'timeline-visuals': document.getElementById('tab-timeline-visuals'),
            features: document.getElementById('tab-features'),
            compliance: document.getElementById('tab-compliance'),
            explorer: document.getElementById('tab-explorer'),
            'interactive-segment': document.getElementById(
                'interactive-segment'
            ),
            'interactive-manifest': document.getElementById(
                'tab-interactive-manifest'
            ),
            updates: document.getElementById('tab-updates'),
            'parser-coverage': document.getElementById('tab-parser-coverage'),
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

    // --- DEPENDENCY INJECTION & INITIALIZATION ---

    // 1. Construct all modules
    const app = new Application(dom, {
        eventBus,
        storeActions,
        stopAllMonitoring,
        storage: {
            saveLastUsedStreams,
            getLastUsedStreams,
            getHistory,
            getPresets,
        },
    });

    // 2. Initialize modules (wiring and event listeners)
    initializeConsentManager();
    app.initializeAppEventListeners(); // Initialize app-level listeners
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

    // 3. Start the main application logic
    app.start();

    // --- MAIN RENDER LOOP ---
    useStore.subscribe(renderApp);

    // Initial render based on default state
    renderApp();
}

document.addEventListener('DOMContentLoaded', startApp);
