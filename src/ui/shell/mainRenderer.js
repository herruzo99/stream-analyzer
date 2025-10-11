import { html, render } from 'lit-html';
import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore } from '@/state/uiStore';
import { getGlobalSummaryTemplate } from '@/features/summary/ui/index';
import { getComplianceReportTemplate } from '@/features/compliance/ui/index';
import { initializeTimelineView } from '@/features/timelineVisuals/ui/index';
import { getFeaturesAnalysisTemplate } from '@/features/featureAnalysis/ui/index';
import { getInteractiveManifestTemplate } from '@/features/interactiveManifest/ui/index';
import { getInteractiveSegmentTemplate } from '@/features/interactiveSegment/ui/index';
import { initializeSegmentExplorer } from '@/features/segmentExplorer/ui/index';
import { getComparisonTemplate } from '@/features/comparison/ui/index';
import { manifestUpdatesTemplate } from '@/features/manifestUpdates/ui/index';
import { getParserCoverageTemplate } from '@/features/parserCoverage/ui/index';
import { getIntegratorsReportTemplate } from '@/features/integratorsReport/ui/index';
import { globalControlsTemplate } from './ui-controller.js';
import { getStreamInputsTemplate } from '@/ui/components/stream-inputs';
import { debugLog } from '@/application/utils/debug';
import { isDebugMode } from '@/application/utils/env';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { renderContextSwitcher } from './components/context-switcher.js';
import { renderTabButtons } from './components/tab-renderer.js';

let dom;

/**
 * Sets the DOM context for the renderer.
 * @param {object} domContext The application's DOM context.
 */
export function initializeRenderer(domContext) {
    dom = domContext;

    // Centralize subscriptions here. Any state change will trigger a smart re-render.
    useAnalysisStore.subscribe(renderApp);
    useUiStore.subscribe(renderApp);
    useSegmentCacheStore.subscribe(renderApp);
}

/**
 * Renders the content for the currently active tab.
 */
function renderActiveTabContent() {
    const { streams, activeStreamId } = useAnalysisStore.getState();
    const { activeTab } = useUiStore.getState();
    const activeStream = streams.find((s) => s.id === activeStreamId);

    // Hide all tab containers first
    Object.values(dom.tabContents).forEach((container) => {
        if (container) container.classList.add('hidden');
    });

    const activeContainer = dom.tabContents[activeTab];
    if (!activeContainer) return;

    debugLog(
        'mainRenderer',
        `Rendering active tab: ${activeTab}. Stream available: ${!!activeStream}`
    );

    let activeManifest = activeStream?.manifest;
    if (
        activeStream?.protocol === 'hls' &&
        activeStream.activeMediaPlaylistUrl &&
        activeStream.mediaPlaylists.has(activeStream.activeMediaPlaylistUrl)
    ) {
        activeManifest =
            activeStream.mediaPlaylists.get(
                activeStream.activeMediaPlaylistUrl
            )?.manifest || activeStream.manifest;
    }

    /** @type {import('lit-html').TemplateResult} */
    let template = html``;
    if (activeTab === 'comparison' && streams.length > 1) {
        template = getComparisonTemplate(streams);
    } else if (activeStream) {
        // Create a temporary stream-like object with the active manifest context
        const contextStream = { ...activeStream, manifest: activeManifest };

        switch (activeTab) {
            case 'summary':
                template = getGlobalSummaryTemplate(contextStream);
                break;
            case 'integrators-report':
                template = getIntegratorsReportTemplate(contextStream);
                break;
            case 'compliance':
                template = getComplianceReportTemplate(contextStream);
                break;
            case 'features':
                template = getFeaturesAnalysisTemplate(contextStream);
                break;
            case 'interactive-manifest':
                template = getInteractiveManifestTemplate(contextStream);
                break;
            case 'interactive-segment':
                template = getInteractiveSegmentTemplate(dom);
                break;
            case 'updates':
                template = manifestUpdatesTemplate(activeStream); // This view specifically handles master vs media
                break;
            case 'parser-coverage':
                if (isDebugMode) {
                    template = getParserCoverageTemplate(contextStream);
                }
                break;
        }
    }

    render(template, activeContainer);

    // Some views have imperative initialization logic after render
    if (activeTab === 'timeline-visuals' && activeStream) {
        initializeTimelineView(activeContainer, activeStream);
    }
    if (activeTab === 'explorer' && activeStream) {
        initializeSegmentExplorer(activeContainer, activeStream);
    }

    activeContainer.classList.remove('hidden');
}

/**
 * The main application render function. It handles rendering for both the input and results views.
 */
export function renderApp() {
    if (!dom) return;

    const { streams, streamInputs } = useAnalysisStore.getState();
    const { viewState } = useUiStore.getState();
    const activeStream = streams.find(
        (s) => s.id === useAnalysisStore.getState().activeStreamId
    );

    const isResultsView = viewState === 'results' && streams.length > 0;

    // --- Top-Level View State Management ---
    dom.inputSection.classList.toggle('hidden', isResultsView);
    dom.results.classList.toggle('hidden', !isResultsView);
    dom.headerUrlDisplay.classList.toggle('hidden', !isResultsView);

    if (isResultsView && activeStream) {
        // --- RENDER RESULTS VIEW ---
        const urlHtml = streams
            .map(
                (s) =>
                    `<div class="truncate" title="${s.originalUrl}">${s.originalUrl}</div>`
            )
            .join('');
        dom.headerUrlDisplay.innerHTML = `<span class="font-bold text-gray-300 block mb-1">Analyzed Stream(s):</span>${urlHtml}`;

        render(globalControlsTemplate(streams), dom.mainHeader.querySelector('#global-stream-controls'));
        renderContextSwitcher(dom);
        render(renderTabButtons(), dom.tabs);
        renderActiveTabContent();
    } else {
        // --- RENDER INPUT VIEW ---
        render(getStreamInputsTemplate(), dom.streamInputs);
        const analyzeBtn = document.querySelector(
            '[data-testid="analyze-btn"]'
        );
        if (analyzeBtn)
            analyzeBtn.textContent =
                streamInputs.length > 1 ? 'Analyze & Compare' : 'Analyze';
    }
}