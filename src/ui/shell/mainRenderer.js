import { inputView } from '@/features/streamInput/ui/input-view';
import { appLog } from '@/shared/utils/debug';
import { useAnalysisStore } from '@/state/analysisStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import { html, render } from 'lit-html';

// Import the component class for its side-effect (registration)
import '@/features/drm/ui/drm-inspector-modal.js';
import '@/features/search/ui/search-modal.js';
import './components/app-shell.js';

import { advertisingView } from '@/features/advertising/ui/index';
import { comparisonView } from '@/features/comparison/ui/index';
import { complianceView } from '@/features/compliance/ui/index';
import { drmView } from '@/features/drm/ui/index.js';
import { featuresView } from '@/features/featureAnalysis/ui/index';
import { integratorsReportView } from '@/features/integratorsReport/ui/index';
import { interactiveManifestView } from '@/features/interactiveManifest/ui/index';
import { interactiveSegmentView } from '@/features/interactiveSegment/ui/index';
import { manifestUpdatesView } from '@/features/manifestUpdates/ui/index';
import { multiPlayerView } from '@/features/multiPlayer/ui/index';
import { networkAnalysisView } from '@/features/networkAnalysis/ui/index';
import { parserCoverageView } from '@/features/parserCoverage/ui/index';
import { playerView } from '@/features/playerSimulation/ui/index';
import { regressionView } from '@/features/regression/ui/index.js'; // NEW
import { segmentComparisonView } from '@/features/segmentComparison/ui/index';
import { segmentExplorerView } from '@/features/segmentExplorer/ui/index';
import { qcDashboardView } from '@/features/signalQuality/ui/qc-dashboard.js';
import { summaryView } from '@/features/summary/ui/index';
import { timelineView } from '@/features/timeline/ui/index.js';

const viewMap = {
    summary: summaryView,
    comparison: comparisonView,
    'integrators-report': integratorsReportView,
    advertising: advertisingView,
    timeline: timelineView,
    features: featuresView,
    compliance: complianceView,
    regression: regressionView, // NEW ROUTE
    'parser-coverage': parserCoverageView,
    'player-simulation': playerView,
    'multi-player': multiPlayerView,
    network: networkAnalysisView,
    explorer: segmentExplorerView,
    'interactive-segment': interactiveSegmentView,
    'interactive-manifest': interactiveManifestView,
    updates: manifestUpdatesView,
    'segment-comparison': segmentComparisonView,
    drm: drmView,
    'qc-dashboard': qcDashboardView,
};

// ... rest of the file remains exactly the same ...
let initialDomContext;
let isShellRendered = false;
let currentMountedViewKey = null;
let currentMountedStreamId = null;

export function initializeRenderer(domContext) {
    initialDomContext = domContext;
    uiActions.injectViewMap(viewMap);
    useAnalysisStore.subscribe(renderApp);
    useUiStore.subscribe(renderApp);
}

export function renderApp() {
    if (!initialDomContext) return;

    const { streams, activeStreamId } = useAnalysisStore.getState();
    const {
        viewState,
        activeTab,
        segmentExplorerActiveRepId,
        segmentExplorerActiveTab,
    } = useUiStore.getState();
    const isResultsView = viewState === 'results' && streams.length > 0;
    const activeStream = streams.find((s) => s.id === activeStreamId);

    initialDomContext.inputSection.classList.toggle('hidden', isResultsView);
    initialDomContext.appRoot.classList.toggle('hidden', !isResultsView);

    if (isResultsView) {
        if (currentMountedViewKey === 'input') {
            inputView.unmount();
        }

        if (!isShellRendered) {
            render(
                html`
                    <app-shell-component></app-shell-component>
                    <search-modal></search-modal>
                    <drm-inspector-modal></drm-inspector-modal>
                `,
                initialDomContext.appRoot
            );
            isShellRendered = true;
            const playerContainer = document.getElementById(
                'persistent-player-container'
            );
            if (playerContainer)
                playerView.mount(playerContainer, { stream: activeStream });
        }

        const appShellComponent = document.querySelector('app-shell-component');
        const mainContentContainer = appShellComponent?.querySelector(
            '#tab-view-container'
        );

        if (!mainContentContainer) return;

        const playerContainer = document.getElementById(
            'persistent-player-container'
        );
        const tabViewContainer = document.getElementById('tab-view-container');

        const previousViewKey = currentMountedViewKey;
        const currentViewKey = activeTab;
        const streamIdChanged =
            activeStream && activeStream.id !== currentMountedStreamId;

        if (currentViewKey !== previousViewKey || streamIdChanged) {
            appLog(
                'MainRenderer',
                'info',
                `View change detected. From: ${previousViewKey}, To: ${currentViewKey}. Stream changed: ${streamIdChanged}`
            );

            currentMountedViewKey = currentViewKey;
            currentMountedStreamId = activeStream?.id;

            const oldView = viewMap[previousViewKey];
            const newView = viewMap[currentViewKey];

            if (streamIdChanged) {
                if (segmentExplorerActiveRepId) {
                    uiActions.setSegmentExplorerActiveRepId(null);
                }
                if (segmentExplorerActiveTab !== 'video') {
                    uiActions.setSegmentExplorerActiveTab('video');
                }
            }

            if (oldView) {
                if (
                    (previousViewKey === 'player-simulation' &&
                        newView !== playerView) ||
                    (previousViewKey === 'multi-player' &&
                        newView !== multiPlayerView)
                ) {
                    appLog(
                        'MainRenderer',
                        'info',
                        `Deactivating persistent view: ${previousViewKey}`
                    );
                    oldView.deactivate?.();
                } else if (
                    oldView !== playerView &&
                    oldView !== multiPlayerView
                ) {
                    appLog(
                        'MainRenderer',
                        'info',
                        `Unmounting view: ${previousViewKey}`
                    );
                    oldView.unmount?.();
                }
            }

            if (newView) {
                playerContainer?.classList.toggle(
                    'hidden',
                    newView !== playerView
                );
                tabViewContainer?.classList.toggle(
                    'hidden',
                    newView === playerView
                );

                if (newView === playerView || newView === multiPlayerView) {
                    appLog(
                        'MainRenderer',
                        'info',
                        `Activating persistent view: ${currentViewKey}`
                    );
                    if (newView === playerView) {
                        newView.activate?.(activeStream);
                    } else {
                        newView.activate?.(mainContentContainer);
                    }
                } else {
                    appLog(
                        'MainRenderer',
                        'info',
                        `Mounting view: ${currentViewKey}`
                    );
                    newView.mount?.(mainContentContainer, {
                        stream: activeStream,
                        streams,
                    });
                }

                const contextualSidebar =
                    document.getElementById('contextual-sidebar');
                if (contextualSidebar) {
                    contextualSidebar.classList.toggle(
                        'hidden',
                        !newView.hasContextualSidebar
                    );
                }
            }
        }
    } else {
        if (isShellRendered) {
            appLog(
                'MainRenderer',
                'info',
                'Transitioning from results to input view. Unmounting persistent views.'
            );
            playerView.unmount();
            multiPlayerView.unmount();
            if (viewMap[currentMountedViewKey]) {
                viewMap[currentMountedViewKey].unmount?.();
            }
            isShellRendered = false;
            currentMountedViewKey = null;
            currentMountedStreamId = null;
        }

        if (currentMountedViewKey !== 'input') {
            inputView.mount(initialDomContext.inputSection);
            currentMountedViewKey = 'input';
        }
    }
}