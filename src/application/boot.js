import { initializeLiveStreamMonitor } from '@/application/services/primaryStreamMonitorService';
import { initializeViewManager } from '@/ui/shell/view-manager';
import { initializeLiveUpdateProcessor } from '@/application/services/liveUpdateProcessor';
import { initializeHlsVariantPoller } from '@/application/services/hlsVariantPollerService';
import { initializeCmafService } from '@/application/services/cmafService';
import { initializeRenderer } from '@/ui/shell/mainRenderer';
import { initializeConsentManager } from './consent-manager.js';
import { initializeSegmentService } from '@/application/services/segmentService';
import { container } from './container.js';
import { initializeUiOrchestration } from './services/uiOrchestrationService.js';
import { initializeComplianceController } from './controllers/complianceController.js';
import { initializeFeatureAnalysisController } from './controllers/featureAnalysisController.js';
import { initializeInteractiveManifestController } from './controllers/interactiveManifestController.js';
import { initializeSegmentExplorerController } from './controllers/segmentExplorerController.js';
import { initializeStreamInputController } from './controllers/streamInputController.js';
import { initializeSavePresetUseCase } from './useCases/savePresetUseCase.js';
import { workerService } from '@/infrastructure/worker/workerService';
import { streamInitializationService } from './services/streamInitializationService.js';
import { initializeToastManager } from '@/ui/components/toast';
import { initializeLoader } from '@/ui/components/loader';
import { initializeModalComponent } from '@/ui/components/modal';
import { setupGlobalTooltipListener } from '@/ui/components/tooltip';
import { initializeDropdownService } from '@/ui/services/dropdownService';
import { keyManagerService } from './services/keyManagerService.js';
import { initializeInbandEventMonitor } from './services/inbandEventMonitorService.js';
import { initializeResolveAdAvailUseCase } from './useCases/resolveAdAvailUseCase.js';

// Import the new use case
import './useCases/startSegmentAnalysis.js';

// Side-effect driven imports for services that primarily listen to the event bus
import '@/application/services/streamService';

/**
 * The main entry point for the application.
 * This function orchestrates the setup and startup of all application components.
 */
export async function startApp() {
    const rootElement = document.body;

    const dom = {
        root: rootElement,
        inputSection: rootElement.querySelector('#input-section'),
        appRoot: rootElement.querySelector('#app-root'),
        toastContainer: rootElement.querySelector('#toast-container'),
        globalLoader: rootElement.querySelector('#global-loader'),
        loaderMessage: rootElement.querySelector('#loader-message'),
        segmentModal: rootElement.querySelector('#segment-modal'),
        modalTitle: rootElement.querySelector('#modal-title'),
        modalSegmentUrl: rootElement.querySelector('#modal-segment-url'),
        modalContentArea: rootElement.querySelector('#modal-content-area'),
        closeModalBtn: rootElement.querySelector('#close-modal-btn'),
        globalTooltip: rootElement.querySelector('#global-tooltip'),
        dropdownContainer: rootElement.querySelector('#dropdown-container'),
    };

    // --- Enhanced Diagnostic Logging ---
    console.log('[Boot] Verifying DOM context initialization...');
    const domVerification = Object.entries(dom).reduce((acc, [key, value]) => {
        if (!value) {
            console.error(
                `[Boot] DOM element query failed for key: '${key}'. The selector may be incorrect or the element may not exist at boot time.`
            );
            acc[key] = '🔴 MISSING';
        } else {
            acc[key] = '🟢 Found';
        }
        return acc;
    }, {});
    console.table(domVerification);
    // --- End Diagnostic Logging ---

    // --- INITIALIZATION SEQUENCE ---
    const { app } = container;

    // --- Layer 1: Core Worker & Consent ---
    workerService.initialize();
    initializeConsentManager();
    initializeRenderer(dom);

    // --- Layer 2: Low-Level UI Components & Global Services ---
    initializeToastManager(dom);
    initializeLoader(dom);
    initializeViewManager();
    initializeModalComponent(dom);
    setupGlobalTooltipListener(dom);
    initializeDropdownService(dom);

    // --- Layer 3: Core Application Services ---
    initializeLiveUpdateProcessor();
    initializeLiveStreamMonitor();
    initializeHlsVariantPoller();
    initializeCmafService();
    initializeSegmentService();
    streamInitializationService.initialize();
    keyManagerService.initialize();
    initializeInbandEventMonitor();

    // --- Layer 4: UI Orchestration, Controllers & Use Cases ---
    initializeUiOrchestration();
    initializeComplianceController();
    initializeFeatureAnalysisController();
    initializeInteractiveManifestController();
    initializeSegmentExplorerController();
    initializeStreamInputController();
    initializeSavePresetUseCase();
    initializeResolveAdAvailUseCase();

    // --- Layer 5: Start Application Core ---
    app.start();
}
