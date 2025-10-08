import { Application } from './app.js';
import { setupGlobalTooltipListener } from '@/ui/components/tooltip.js';
import { initializeTabs } from '@/ui/shell/tabs.js';
import { initializeModalComponent } from '@/ui/components/modal.js';
import {
    initializeLiveStreamMonitor,
    stopAllMonitoring,
} from '@/application/services/primaryStreamMonitorService.js';
import { UiController } from '@/ui/shell/ui-controller.js';
import { initializeViewManager } from '@/ui/shell/view-manager.js';
import { initializeToastManager, showToast } from '@/ui/components/toast.js';
import { initializeLiveUpdateProcessor } from '@/application/services/liveUpdateProcessor.js';
import {
    useAnalysisStore,
    analysisActions,
    useSegmentCacheStore,
} from '@/state/analysisStore.js';
import { useUiStore } from '@/state/uiStore.js';
import { initializeHlsVariantPoller } from '@/application/services/hlsVariantPollerService.js';
import { initializeCmafService } from '@/application/services/cmafService.js';
import { initializeRenderer, renderApp } from '@/ui/shell/mainRenderer.js';
import { initializeLoader } from '@/ui/components/loader.js';
import { initializeConsentManager } from './consent-manager.js';
import { eventBus } from '@/application/event-bus.js';
import {
    saveLastUsedStreams,
    getLastUsedStreams,
    getHistory,
    getPresets,
} from '@/infrastructure/persistence/streamStorage.js';
import { openModalWithContent } from '@/ui/services/modalService.js';
import { initializeSegmentService } from '@/application/services/segmentService.js';

// Side-effect driven imports for services that primarily listen to the event bus
import '@/application/services/streamService.js';

/**
 * The main entry point for the application.
 * This function orchestrates the setup and startup of all application components.
 */
async function startApp() {
    // --- Collect minimal DOM roots ---
    const rootElement = document.body;
    const dom = {
        // Only collect elements needed by non-UI controller modules
        tabs: rootElement.querySelector('#tabs'),
        contextSwitcherWrapper: rootElement.querySelector(
            '#context-switcher-wrapper'
        ),
        contextSwitcher: rootElement.querySelector(
            '[data-testid="context-switcher"]'
        ),
        toastContainer: rootElement.querySelector('#toast-container'),
        globalLoader: rootElement.querySelector('#global-loader'),
        loaderMessage: rootElement.querySelector('#loader-message'),
        globalTooltip: rootElement.querySelector('#global-tooltip'),
        segmentModal: rootElement.querySelector(
            '[data-testid="segment-modal"]'
        ),
        modalTitle: rootElement.querySelector('#modal-title'),
        modalSegmentUrl: rootElement.querySelector(
            '[data-testid="modal-segment-url"]'
        ),
        modalContentArea: rootElement.querySelector('#modal-content-area'),
        closeModalBtn: rootElement.querySelector(
            '[data-testid="close-modal-btn"]'
        ),
        mainHeader: rootElement.querySelector('#main-header'),
        headerTitleGroup: rootElement.querySelector('#header-title-group'),
        headerUrlDisplay: rootElement.querySelector('#header-url-display'),
        inputSection: rootElement.querySelector(
            '[data-testid="input-section"]'
        ),
        results: rootElement.querySelector('#results'),
        streamInputs: rootElement.querySelector('#stream-inputs'),
        tabContents: {
            comparison: rootElement.querySelector('#tab-comparison'),
            summary: rootElement.querySelector('#tab-summary'),
            'integrators-report': rootElement.querySelector(
                '#tab-integrators-report'
            ),
            'timeline-visuals': rootElement.querySelector(
                '#tab-timeline-visuals'
            ),
            features: rootElement.querySelector('#tab-features'),
            compliance: rootElement.querySelector('#tab-compliance'),
            explorer: rootElement.querySelector('#tab-explorer'),
            'interactive-segment': rootElement.querySelector(
                '#tab-interactive-segment'
            ),
            'interactive-manifest': rootElement.querySelector(
                '#tab-interactive-manifest'
            ),
            updates: rootElement.querySelector('#tab-updates'),
            'parser-coverage': rootElement.querySelector(
                '#tab-parser-coverage'
            ),
        },
    };

    // --- DEPENDENCY INJECTION & INITIALIZATION ---

    const services = {
        eventBus,
        analysisActions,
        stopAllMonitoring,
        storage: {
            saveLastUsedStreams,
            getLastUsedStreams,
            getHistory,
            getPresets,
        },
    };

    const app = new Application(services);
    new UiController(rootElement);

    initializeConsentManager();
    app.initializeAppEventListeners();
    initializeRenderer(dom);
    initializeToastManager(dom);
    initializeLoader(dom);
    initializeViewManager();
    initializeLiveUpdateProcessor();
    initializeTabs(dom);
    initializeModalComponent(dom);
    // Note: The main UiController instance is now self-initializing its listeners
    setupGlobalTooltipListener(dom);
    initializeLiveStreamMonitor();
    initializeHlsVariantPoller();
    initializeCmafService();
    initializeSegmentService();

    // --- Global UI Event Listeners ---
    eventBus.subscribe('ui:request-segment-analysis', ({ url }) => {
        const { get: getFromCache } = useSegmentCacheStore.getState();
        const cacheEntry = getFromCache(url);
        if (cacheEntry?.parsedData) {
            openModalWithContent({
                title: 'Segment Analysis',
                url: url,
                content: {
                    type: 'segmentAnalysis',
                    data: { parsedData: cacheEntry.parsedData },
                },
            });
        } else {
            showToast({
                message: 'Segment data not ready. Please load it first.',
                type: 'warn',
            });
        }
    });

    eventBus.subscribe('ui:request-segment-comparison', ({ urlA, urlB }) => {
        const { get: getFromCache } = useSegmentCacheStore.getState();
        const cacheEntryA = getFromCache(urlA);
        const cacheEntryB = getFromCache(urlB);

        if (cacheEntryA?.parsedData && cacheEntryB?.parsedData) {
            openModalWithContent({
                title: 'Segment Comparison',
                url: 'Comparing two segments',
                content: {
                    type: 'segmentAnalysis',
                    data: {
                        parsedData: cacheEntryA.parsedData,
                        parsedDataB: cacheEntryB.parsedData,
                    },
                },
            });
        } else {
            showToast({
                message: 'One or both segments not loaded for comparison.',
                type: 'warn',
            });
        }
    });

    app.start();

    // --- MAIN RENDER LOOP ---
    useAnalysisStore.subscribe(renderApp);
    useUiStore.subscribe(renderApp);
    useSegmentCacheStore.subscribe(renderApp);

    renderApp();
}

document.addEventListener('DOMContentLoaded', startApp);