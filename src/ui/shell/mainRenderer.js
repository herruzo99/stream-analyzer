import { render, html } from 'lit-html';
import { createIcons, icons } from 'lucide';
import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import { inputViewTemplate } from '@/features/streamInput/ui/input-view';
import { debugLog } from '@/shared/utils/debug';

// Import the component class for its side-effect (registration)
import './components/app-shell.js';

import { summaryView } from '@/features/summary/ui/index';
import { comparisonView } from '@/features/comparison/ui/index';
import { integratorsReportView } from '@/features/integratorsReport/ui/index';
import { timelineView } from '@/features/timelineVisuals/ui/index';
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
    'timeline-visuals': timelineView,
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
    useAnalysisStore.subscribe(renderApp);
    useUiStore.subscribe(renderApp);
}

export function renderApp() {
    if (!initialDomContext) return;

    const { streams, activeStreamId } = useAnalysisStore.getState();
    const { viewState, activeTab, activeSidebar } = useUiStore.getState();
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
            const oldView = viewMap[previousViewKey];
            const newView = viewMap[currentViewKey];

            if (oldView) {
                if (
                    previousViewKey === 'player-simulation' &&
                    newView !== playerView
                ) {
                    debugLog(
                        'MainRenderer',
                        `Deactivating persistent player view: ${previousViewKey}`
                    );
                    oldView.deactivate?.();
                } else if (oldView !== playerView) {
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

                if (newView === playerView) {
                    debugLog(
                        'MainRenderer',
                        `Activating persistent player view: ${currentViewKey}`
                    );
                    newView.activate?.(activeStream);
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
                if (newView.hasContextualSidebar) {
                    if (contextualSidebar)
                        contextualSidebar.classList.remove('hidden');
                } else {
                    if (contextualSidebar)
                        contextualSidebar.classList.add('hidden');
                    if (activeSidebar === 'contextual') {
                        uiActions.setActiveSidebar(null);
                    }
                }
            }

            currentMountedViewKey = currentViewKey;
            currentMountedStreamId = activeStream?.id;
        }
    } else {
        if (isShellRendered) {
            debugLog(
                'MainRenderer',
                'Transitioning from results to input view. Unmounting player.'
            );
            playerView.unmount();
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

    requestAnimationFrame(() => {
        // --- ARCHITECTURAL FIX ---
        // The `createIcons` function from lucide is an imperative DOM manipulation.
        // It must be called *after* every render pass to ensure newly added icons
        // are initialized. It now correctly receives the icon data object.
        createIcons({ icons });
        // --- END FIX ---
    });
}
