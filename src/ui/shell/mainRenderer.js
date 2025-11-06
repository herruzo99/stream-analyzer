import { render, html } from 'lit-html';
import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import { inputViewTemplate } from '@/features/streamInput/ui/input-view';
import { debugLog } from '@/shared/utils/debug';

// Import the component class for its side-effect (registration)
import './components/app-shell.js';

import { summaryView } from '@/features/summary/ui/index';
import { comparisonView } from '@/features/comparison/ui/index';
import { integratorsReportView } from '@/features/integratorsReport/ui/index';
import { featuresView } from '@/features/featureAnalysis/ui/index';
import { complianceView } from '@/features/compliance/ui/index';
import { advertisingView } from '@/features/advertising/ui/index';
import { interactiveManifestView } from '@/features/interactiveManifest/ui/index';
import { manifestUpdatesView } from '@/features/manifestUpdates/ui/index';
import { segmentExplorerView } from '@/features/segmentExplorer/ui/index';
import { interactiveSegmentView } from '@/features/interactiveSegment/ui/index';
import { parserCoverageView } from '@/features/parserCoverage/ui/index';
import { networkAnalysisView } from '@/features/networkAnalysis/ui/index';
import { playerView } from '@/features/playerSimulation/ui/index';
import { segmentComparisonView } from '@/features/segmentComparison/ui/index';
import { multiPlayerView } from '@/features/multiPlayer/ui/index';

const viewMap = {
    summary: summaryView,
    comparison: comparisonView,
    'integrators-report': integratorsReportView,
    advertising: advertisingView,
    features: featuresView,
    compliance: complianceView,
    'parser-coverage': parserCoverageView,
    'player-simulation': playerView,
    'multi-player': multiPlayerView,
    network: networkAnalysisView,
    explorer: segmentExplorerView,
    'interactive-segment': interactiveSegmentView,
    'interactive-manifest': interactiveManifestView,
    updates: manifestUpdatesView,
    'segment-comparison': segmentComparisonView,
};

let initialDomContext;
let isShellRendered = false;
let currentMountedViewKey = null;
let currentMountedStreamId = null;

export function initializeRenderer(domContext) {
    initialDomContext = domContext;
    uiActions.injectViewMap(viewMap); // Inject viewMap for state actions
    useAnalysisStore.subscribe(renderApp);
    useUiStore.subscribe(renderApp);
}

export function renderApp() {
    if (!initialDomContext) return;

    const { streams, activeStreamId } = useAnalysisStore.getState();
    const {
        viewState,
        activeTab,
        activeSidebar,
        segmentExplorerActiveRepId,
        segmentExplorerActiveTab,
    } = useUiStore.getState();
    const isResultsView = viewState === 'results' && streams.length > 0;
    const activeStream = streams.find((s) => s.id === activeStreamId);

    initialDomContext.inputSection.classList.toggle('hidden', isResultsView);
    initialDomContext.appRoot.classList.toggle('hidden', !isResultsView);

    if (isResultsView) {
        if (!isShellRendered) {
            render(
                html`<app-shell-component></app-shell-component>`,
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
            debugLog(
                'MainRenderer',
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
                    debugLog(
                        'MainRenderer',
                        `Deactivating persistent view: ${previousViewKey}`
                    );
                    oldView.deactivate?.();
                } else if (
                    oldView !== playerView &&
                    oldView !== multiPlayerView
                ) {
                    debugLog(
                        'MainRenderer',
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
                    debugLog(
                        'MainRenderer',
                        `Activating persistent view: ${currentViewKey}`
                    );
                    if (newView === playerView) {
                        newView.activate?.(activeStream);
                    } else {
                        // newView must be multiPlayerView
                        newView.activate?.(mainContentContainer);
                    }
                } else {
                    debugLog(
                        'MainRenderer',
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
            debugLog(
                'MainRenderer',
                'Transitioning from results to input view. Unmounting persistent views.'
            );
            playerView.unmount();
            multiPlayerView.unmount();
            if (viewMap[currentMountedViewKey]) {
                viewMap[currentMountedViewKey].unmount?.();
            }
        }
        isShellRendered = false;
        currentMountedViewKey = null;
        currentMountedStreamId = null;

        if (initialDomContext.appRoot.innerHTML)
            render(html``, initialDomContext.appRoot);

        render(inputViewTemplate(), initialDomContext.inputSection);
    }
}