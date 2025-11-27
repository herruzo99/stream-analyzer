import { initializeLiveUpdateProcessor } from '@/application/services/liveUpdateProcessor';
import { initializeLiveStreamMonitor } from '@/application/services/primaryStreamMonitorService';
import { workerService } from '@/infrastructure/worker/workerService';
import { uiActions } from '@/state/uiStore';
import { initializeLoader } from '@/ui/components/loader';
import { initializeModalComponent } from '@/ui/components/modal';
import { initializeToastManager } from '@/ui/components/toast';
import { setupGlobalTooltipListener } from '@/ui/components/tooltip';
import { initializeDropdownService } from '@/ui/services/dropdownService';
import { initializeRenderer } from '@/ui/shell/mainRenderer';
import { initializeViewManager } from '@/ui/shell/view-manager';
import { initializeConsentManager } from './consent-manager.js';
import { container } from './container.js';
import { sessionService } from './services/sessionService.js';

// Relocated Service Initializers
import { emeInterceptor } from '@/features/drm/domain/eme-interceptor.js'; // Import EME Interceptor
import { keyManagerService } from '@/infrastructure/decryption/keyManagerService';
import { initializeGlobalRequestInterceptor } from '@/infrastructure/http/globalRequestInterceptor.js';
import { initializeNetworkEnrichmentService } from '@/infrastructure/http/networkEnrichmentService';
import { initializeSegmentService } from '@/infrastructure/segments/segmentService';
import { initializeUiOrchestration } from '@/ui/services/uiOrchestrationService';
import { playerEventOrchestratorService } from './services/playerEventOrchestratorService.js';
import { tickerService } from './services/tickerService.js';

// Feature Initializers
import { initializeAdvertisingFeature } from '@/features/advertising/index';
import { initializeComplianceFeature } from '@/features/compliance/index';
import { initializeFeatureAnalysisFeature } from '@/features/featureAnalysis/index';
import { initializeInteractiveManifestFeature } from '@/features/interactiveManifest/index';
import { initializeInteractiveSegmentFeature } from '@/features/interactiveSegment/index';
import { initializeMultiPlayerFeature } from '@/features/multiPlayer/index';
import { initializeNotificationFeature } from '@/features/notifications/index.js';
import { initializePlayerSimulationFeature } from '@/features/playerSimulation/index';
import { initializeSegmentExplorerFeature } from '@/features/segmentExplorer/index';
import { initializeStreamInputFeature } from '@/features/streamInput/index';

import '@/application/services/streamService';
import { getShaka } from '@/infrastructure/player/shaka';

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

    const { app } = container;

    await getShaka();

    // --- Layer 1: Core Worker, Consent & Session Handling ---
    workerService.initialize();
    initializeConsentManager();

    // Initialize EME Interceptor EARLY to catch all player events
    emeInterceptor.initialize();

    initializeRenderer(dom);
    tickerService.start();
    await initializeGlobalRequestInterceptor();

    uiActions.loadWorkspaces();

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
    initializeSegmentService();
    keyManagerService.initialize();
    initializeNetworkEnrichmentService();
    playerEventOrchestratorService.initialize();

    // --- Layer 4: Feature Initialization & UI Orchestration ---
    initializeUiOrchestration();
    initializeAdvertisingFeature();
    initializeComplianceFeature();
    initializeFeatureAnalysisFeature();
    initializeInteractiveManifestFeature();
    initializeInteractiveSegmentFeature();
    initializeSegmentExplorerFeature();
    initializeStreamInputFeature();
    initializePlayerSimulationFeature();
    initializeMultiPlayerFeature();
    initializeNotificationFeature();

    // --- Layer 5: Start Application Core ---
    app.start();
}
