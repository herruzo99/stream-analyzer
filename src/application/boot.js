import { setupGlobalTooltipListener } from '@/ui/components/tooltip.js';
import { initializeTabs } from '@/ui/shell/tabs.js';
import { initializeModalComponent } from '@/ui/components/modal.js';
import { initializeLiveStreamMonitor } from '@/application/services/primaryStreamMonitorService.js';
import { UiController } from '@/ui/shell/ui-controller.js';
import { initializeViewManager } from '@/ui/shell/view-manager.js';
import { initializeToastManager } from '@/ui/components/toast.js';
import { initializeLiveUpdateProcessor } from '@/application/services/liveUpdateProcessor.js';
import { initializeHlsVariantPoller } from '@/application/services/hlsVariantPollerService.js';
import { initializeCmafService } from '@/application/services/cmafService.js';
import { initializeRenderer, renderApp } from '@/ui/shell/mainRenderer.js';
import { initializeLoader } from '@/ui/components/loader.js';
import { initializeConsentManager } from './consent-manager.js';
import { initializeSegmentService } from '@/application/services/segmentService.js';
import { container } from './container.js';
import { initializeUiOrchestration } from './services/uiOrchestrationService.js';
import { initializeComplianceController } from './controllers/complianceController.js';
import { initializeFeatureAnalysisController } from './controllers/featureAnalysisController.js';
import { initializeInteractiveManifestController } from './controllers/interactiveManifestController.js';
import { initializeSegmentExplorerController } from './controllers/segmentExplorerController.js';
import { initializeStreamInputController } from './controllers/streamInputController.js';
import { initializeSavePresetUseCase } from './useCases/savePresetUseCase.js';
import { workerService } from '@/infrastructure/worker/workerService.js';

// Side-effect driven imports for services that primarily listen to the event bus
import '@/application/services/streamService.js';

/**
 * The main entry point for the application.
 * This function orchestrates the setup and startup of all application components.
 */
export async function startApp() {
    // --- Collect minimal DOM roots ---
    const rootElement = document.body;
    const dom = {
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

    // --- INITIALIZATION SEQUENCE ---
    const { app } = container;

    new UiController(rootElement);

    // Services & Controllers
    workerService.initialize();
    initializeConsentManager();
    initializeRenderer(dom);
    initializeToastManager(dom);
    initializeLoader(dom);
    initializeViewManager();
    initializeLiveUpdateProcessor();
    initializeTabs(dom);
    initializeModalComponent(dom);
    setupGlobalTooltipListener(dom);
    initializeLiveStreamMonitor();
    initializeHlsVariantPoller();
    initializeCmafService();
    initializeSegmentService();
    initializeUiOrchestration();
    initializeComplianceController();
    initializeFeatureAnalysisController();
    initializeInteractiveManifestController();
    initializeSegmentExplorerController();
    initializeStreamInputController();
    initializeSavePresetUseCase();

    app.start();

    // --- INITIAL RENDER ---
    // The global render loop is removed. We trigger a single initial render.
    // Subsequent renders are handled by the renderer's own subscriptions.
    renderApp();
}