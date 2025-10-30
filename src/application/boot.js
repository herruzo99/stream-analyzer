import { initializeLiveStreamMonitor } from '@/application/services/primaryStreamMonitorService';
import { initializeViewManager } from '@/ui/shell/view-manager';
import { initializeLiveUpdateProcessor } from '@/application/services/liveUpdateProcessor';
import { initializeHlsVariantPoller } from '@/application/services/hlsVariantPollerService';
import { initializeRenderer } from '@/ui/shell/mainRenderer';
import { initializeConsentManager } from './consent-manager.js';
import { container } from './container.js';
import { workerService } from '@/infrastructure/worker/workerService';
import { streamInitializationService } from './services/streamInitializationService.js';
import { initializeToastManager } from '@/ui/components/toast';
import { initializeLoader } from '@/ui/components/loader';
import { initializeModalComponent } from '@/ui/components/modal';
import { setupGlobalTooltipListener } from '@/ui/components/tooltip';
import { initializeDropdownService } from '@/ui/services/dropdownService';
import { initializeInbandEventMonitor } from './services/inbandEventMonitorService.js';
import { sessionService } from './services/sessionService.js';
import { uiActions } from '@/state/uiStore';

// Relocated Service Initializers
import { keyManagerService } from '@/infrastructure/decryption/keyManagerService';
import { initializeSegmentService } from '@/infrastructure/segments/segmentService';
import { initializeUiOrchestration } from '@/ui/services/uiOrchestrationService';
import { initializeNetworkEnrichmentService } from '@/infrastructure/http/networkEnrichmentService';
import { eventBus } from './event-bus.js';

// Feature Initializers
import { initializeAdvertisingFeature } from '@/features/advertising/index';
import { initializeComplianceFeature } from '@/features/compliance/index';
import { initializeFeatureAnalysisFeature } from '@/features/featureAnalysis/index';
import { initializeInteractiveManifestFeature } from '@/features/interactiveManifest/index';
import { initializeSegmentExplorerFeature } from '@/features/segmentExplorer/index';
import { initializeStreamInputFeature } from '@/features/streamInput/index';
import { initializePlayerSimulationFeature } from '@/features/playerSimulation/index';
import { initializeMemoryMonitorFeature } from '@/features/memoryMonitor/index';
import { initializeMultiPlayerFeature } from '@/features/multiPlayer/index';

// Side-effect driven imports for services that primarily listen to the event bus
import '@/application/services/streamService';
// Import the canonical shaka module to ensure it's initialized early.
import { getShaka } from '@/infrastructure/player/shaka';

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

    await getShaka();

    // --- Layer 1: Core Worker, Consent & Session Handling ---
    workerService.initialize();
    initializeConsentManager();
    initializeRenderer(dom);

    // --- ARCHITECTURAL FIX: One-time data load ---
    // Load persisted workspaces into the reactive state store at boot time.
    // This prevents the recursive render loop caused by loading data inside a component.
    uiActions.loadWorkspaces();
    // --- END FIX ---

    const isRestoringSession = sessionService.applySessionOnBoot();
    if (isRestoringSession) {
        uiActions.setIsRestoringSession(true);
    }

    // --- Layer 2: Low-Level UI Components & Global Services ---
    initializeToastManager(dom);
    initializeLoader(dom);
    initializeViewManager();
    initializeModalComponent(dom);
    setupGlobalTooltipListener(dom);
    initializeDropdownService(dom);

    // --- Layer 3: Core Application & Infrastructure Services ---
    initializeLiveUpdateProcessor();
    initializeLiveStreamMonitor();
    initializeHlsVariantPoller();
    initializeSegmentService();
    streamInitializationService.initialize();
    keyManagerService.initialize();
    initializeInbandEventMonitor();
    initializeNetworkEnrichmentService();

    // --- Layer 4: Feature Initialization & UI Orchestration ---
    initializeUiOrchestration();
    initializeAdvertisingFeature();
    initializeComplianceFeature();
    initializeFeatureAnalysisFeature();
    initializeInteractiveManifestFeature();
    initializeSegmentExplorerFeature();
    initializeStreamInputFeature();
    initializePlayerSimulationFeature();
    initializeMemoryMonitorFeature();
    initializeMultiPlayerFeature();

    // --- Layer 5: Start Application Core ---
    app.start();
}