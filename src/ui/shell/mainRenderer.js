import { render, html } from 'lit-html';
import { createIcons, icons } from 'lucide';
import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import { inputViewTemplate } from '@/features/streamInput/ui/input-view';
import { renderAppShell } from './components/app-shell.js';
import { debugLog } from '@/shared/utils/debug';

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
let appShellDomContext;
let isShellRendered = false;
let currentMountedViewKey = null;
let currentMountedStreamId = null;

const appShellTemplate = () => html`
    <header
        id="mobile-header"
        class="hidden xl:hidden shrink-0 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 p-3 flex items-center justify-between gap-4 fixed top-0 left-0 right-0 z-20"
    >
        <button
            id="sidebar-toggle-btn"
            class="text-gray-300 hover:text-white p-1"
        >
            <i data-lucide="menu" class="h-6 w-6"></i>
        </button>
        <h2 id="mobile-page-title" class="text-lg font-bold text-white"></h2>
        <div class="w-7"></div>
    </header>
    <div
        id="app-root-inner"
        class="h-screen xl:grid xl:grid-cols-[auto_1fr_auto]"
    >
        <div
            id="sidebar-overlay"
            class="fixed inset-0 bg-black/50 z-30 hidden xl:hidden"
        ></div>
        <aside
            id="sidebar-container"
            class="bg-gray-900 border-r border-gray-800 flex flex-col fixed xl:relative top-0 left-0 bottom-0 z-40 w-72 xl:w-auto -translate-x-full xl:translate-x-0 transition-transform duration-300 ease-in-out"
        >
            <header class="p-3">
                <h2 class="text-xl font-bold text-white mb-4 px-2">
                    Stream Analyzer
                </h2>
                <div
                    id="sidebar-context-switchers"
                    class="space-y-2 px-2"
                ></div>
            </header>
            <nav
                id="sidebar-nav"
                class="flex flex-col grow overflow-y-auto p-3"
            ></nav>
            <footer id="sidebar-footer" class="shrink-0 p-3 space-y-4"></footer>
        </aside>
        <div id="app-shell" class="h-full flex flex-col min-h-0">
            <div
                id="main-content-wrapper"
                class="flex flex-col overflow-y-auto grow pt-[60px] xl:pt-0"
            >
                <header
                    id="main-header"
                    class="shrink-0 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 p-3 flex items-center justify-between gap-4"
                >
                    <div
                        id="context-header"
                        class="flex items-center gap-2 sm:gap-4 flex-wrap justify-start w-full"
                    ></div>
                </header>
                <main id="content-area" class="grow flex flex-col relative">
                    <div
                        id="tab-view-container"
                        class="grow flex flex-col p-4 sm:p-6"
                    ></div>
                    <div
                        id="persistent-player-container"
                        class="grow flex flex-col hidden"
                    ></div>
                </main>
            </div>
        </div>
        <aside
            id="contextual-sidebar"
            class="bg-gray-800/80 backdrop-blur-sm border-l border-gray-700/50 fixed xl:relative top-0 right-0 bottom-0 z-40 w-96 max-w-[90vw] translate-x-full xl:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col min-h-0"
        ></aside>
    </div>
`;

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
            render(appShellTemplate(), initialDomContext.appRoot);
            appShellDomContext = {
                ...initialDomContext,
                mainContent: document.body.querySelector('#tab-view-container'),
                sidebarNav: document.body.querySelector('#sidebar-nav'),
                sidebarFooter: document.body.querySelector('#sidebar-footer'),
                sidebarContextSwitchers: document.body.querySelector(
                    '#sidebar-context-switchers'
                ),
                contextHeader: document.body.querySelector('#context-header'),
                mobileHeader: document.body.querySelector('#mobile-header'),
                sidebarOverlay: document.body.querySelector('#sidebar-overlay'),
                sidebarToggleBtn: document.body.querySelector(
                    '#sidebar-toggle-btn'
                ),
                mobilePageTitle:
                    document.body.querySelector('#mobile-page-title'),
            };
            isShellRendered = true;
            const playerContainer = document.getElementById(
                'persistent-player-container'
            );
            if (playerContainer)
                playerView.mount(playerContainer, { stream: activeStream });
        }

        renderAppShell(appShellDomContext);

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
                    newView.mount?.(appShellDomContext.mainContent, {
                        stream: activeStream,
                        streams,
                    });
                }

                const contextualSidebar =
                    document.getElementById('contextual-sidebar');
                if (newView.hasContextualSidebar) {
                    if (contextualSidebar)
                        contextualSidebar.classList.remove('hidden');
                    // This is declarative. The 'renderAppShell' function will handle the class toggling based on state.
                } else {
                    if (contextualSidebar)
                        contextualSidebar.classList.add('hidden');
                    if (activeSidebar === 'contextual') {
                        // If we switch to a tab without a sidebar, hide it.
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
        }
        isShellRendered = false;
        currentMountedViewKey = null;
        currentMountedStreamId = null;
        appShellDomContext = null;
        if (initialDomContext.appRoot.innerHTML)
            render(html``, initialDomContext.appRoot);
        render(inputViewTemplate(renderApp), initialDomContext.inputSection);
    }

    // After every render cycle, ask Lucide to process any new icon placeholders.
    requestAnimationFrame(() => {
        createIcons({ icons });
    });
}