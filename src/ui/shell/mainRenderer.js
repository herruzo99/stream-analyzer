import { html, render } from 'lit-html';
import { useAnalysisStore } from '@/state/analysisStore.js';
import { useUiStore, uiActions } from '@/state/uiStore.js';
import { getGlobalSummaryTemplate } from '@/features/summary/ui/index.js';
import { getComplianceReportTemplate } from '@/features/compliance/ui/index.js';
import { initializeTimelineView } from '@/features/timelineVisuals/ui/index.js';
import { getFeaturesAnalysisTemplate } from '@/features/featureAnalysis/ui/index.js';
import { getInteractiveManifestTemplate } from '@/features/interactiveManifest/ui/index.js';
import { getInteractiveSegmentTemplate } from '@/features/interactiveSegment/ui/index.js';
import { initializeSegmentExplorer } from '@/features/segmentExplorer/ui/index.js';
import { getComparisonTemplate } from '@/features/comparison/ui/index.js';
import { manifestUpdatesTemplate } from '@/features/manifestUpdates/ui/index.js';
import { getParserCoverageTemplate } from '@/features/parserCoverage/ui/index.js';
import { getIntegratorsReportTemplate } from '@/features/integratorsReport/ui/index.js';
import { globalControlsTemplate } from './ui-controller.js';
import { getStreamInputsTemplate } from '@/ui/components/stream-inputs.js';
import { debugLog } from '@/application/utils/debug.js';
import { isDebugMode } from '@/application/utils/env.js';
import { useSegmentCacheStore } from '@/state/segmentCacheStore.js';

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
 * Populates the context switcher dropdown when multiple streams are present.
 */
function renderContextSwitcher() {
    const { streams, activeStreamId } = useAnalysisStore.getState();
    if (streams.length > 1) {
        dom.contextSwitcherWrapper.classList.remove('hidden');
        const optionsTemplate = streams.map(
            (s) =>
                html`<option value="${s.id}">
                    ${s.name} (${s.protocol.toUpperCase()})
                </option>`
        );
        render(optionsTemplate, dom.contextSwitcher);
        dom.contextSwitcher.value = String(activeStreamId);
    } else {
        dom.contextSwitcherWrapper.classList.add('hidden');
    }
}

/**
 * Renders the content for the currently active tab.
 */
function renderActiveTabContent() {
    const { streams, activeStreamId, activeSegmentUrl } =
        useAnalysisStore.getState();
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

    /** @type {import('lit-html').TemplateResult} */
    let template = html``;
    if (activeTab === 'comparison' && streams.length > 1) {
        template = getComparisonTemplate(streams);
    } else if (activeStream) {
        switch (activeTab) {
            case 'summary':
                template = getGlobalSummaryTemplate(activeStream);
                break;
            case 'integrators-report':
                template = getIntegratorsReportTemplate(activeStream);
                break;
            case 'compliance':
                template = getComplianceReportTemplate(activeStream);
                break;
            case 'features':
                template = getFeaturesAnalysisTemplate(activeStream);
                break;
            case 'interactive-manifest':
                template = getInteractiveManifestTemplate(activeStream);
                break;
            case 'interactive-segment':
                template = getInteractiveSegmentTemplate(dom);
                break;
            case 'updates':
                template = manifestUpdatesTemplate(activeStream);
                break;
            case 'parser-coverage':
                if (isDebugMode) {
                    template = getParserCoverageTemplate(activeStream);
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

    const { streams, activeSegmentUrl, streamInputIds } =
        useAnalysisStore.getState();
    const { viewState } = useUiStore.getState();

    const isResultsView = viewState === 'results' && streams.length > 0;

    // --- Top-Level View State Management ---
    dom.inputSection.classList.toggle('hidden', isResultsView);
    dom.results.classList.toggle('hidden', !isResultsView);

    const newAnalysisBtn = document.querySelector(
        '[data-testid="new-analysis-btn"]'
    );
    if (newAnalysisBtn)
        newAnalysisBtn.classList.toggle('hidden', !isResultsView);

    const shareAnalysisBtn = document.querySelector(
        '[data-testid="share-analysis-btn"]'
    );
    if (shareAnalysisBtn)
        shareAnalysisBtn.classList.toggle('hidden', !isResultsView);

    const copyDebugBtn = document.querySelector(
        '[data-testid="copy-debug-btn"]'
    );
    if (copyDebugBtn)
        copyDebugBtn.classList.toggle(
            'hidden',
            !isResultsView || !isDebugMode
        );

    const globalControlsContainer = document.getElementById(
        'global-stream-controls'
    );
    if (globalControlsContainer) {
        globalControlsContainer.classList.toggle('hidden', !isResultsView);
    }

    // Responsive header alignment
    dom.mainHeader.classList.toggle('md:justify-center', !isResultsView);
    dom.mainHeader.classList.toggle('md:justify-between', isResultsView);
    dom.headerTitleGroup.classList.toggle('text-center', !isResultsView);
    dom.headerTitleGroup.classList.toggle('md:text-left', isResultsView);
    dom.headerUrlDisplay.classList.toggle('hidden', !isResultsView);

    if (isResultsView) {
        // --- RENDER RESULTS VIEW ---
        const urlHtml = streams
            .map(
                (s) =>
                    `<div class="truncate" title="${s.originalUrl}">${s.originalUrl}</div>`
            )
            .join('');
        dom.headerUrlDisplay.innerHTML = `<span class="font-bold text-gray-300 block mb-1">Analyzed Stream(s):</span>${urlHtml}`;

        render(globalControlsTemplate(streams), globalControlsContainer);
        renderContextSwitcher();

        // --- Conditional Tab Visibility ---
        document
            .getElementById('tab-btn-comparison')
            .classList.toggle('hidden', streams.length <= 1);
        document
            .getElementById('tab-btn-interactive-segment')
            .classList.toggle('hidden', !activeSegmentUrl);
        document
            .getElementById('tab-btn-parser-coverage')
            .classList.toggle('hidden', !isDebugMode);

        renderActiveTabContent();
    } else {
        // --- RENDER INPUT VIEW ---
        render(getStreamInputsTemplate(), dom.streamInputs);
        const analyzeBtn = document.querySelector(
            '[data-testid="analyze-btn"]'
        );
        if (analyzeBtn)
            analyzeBtn.textContent =
                streamInputIds.length > 1 ? 'Analyze & Compare' : 'Analyze';
    }
}