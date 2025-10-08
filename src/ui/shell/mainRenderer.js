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
import { hideLoader } from '@/ui/components/loader.js';
import { isDebugMode } from '@/application/utils/env.js';

/** @typedef {import('lit-html').TemplateResult} TemplateResult */

let dom;

/**
 * Sets the DOM context for the renderer.
 * @param {object} domContext The application's DOM context.
 */
export function initializeRenderer(domContext) {
    dom = domContext;
}

/**
 * Populates the context switcher dropdown when multiple streams are present.
 */
export function populateContextSwitcher() {
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
 * The main application render function. Reads the current state from the store
 * and re-renders the entire UI declaratively.
 */
export function renderApp() {
    if (!dom) return;

    const analysisState = useAnalysisStore.getState();
    const uiState = useUiStore.getState();

    const { streams, activeStreamId, activeSegmentUrl, streamInputIds } =
        analysisState;
    const { viewState, activeTab } = uiState;
    const activeStream = streams.find((s) => s.id === activeStreamId);

    // --- Top-Level View State Management ---
    const isResultsView = viewState === 'results' && streams.length > 0;

    dom.inputSection.classList.toggle('hidden', isResultsView);
    dom.results.classList.toggle('hidden', !isResultsView);
    // These buttons are now part of the UiController's managed DOM, not the global one.
    // Their visibility is toggled directly in the UiController or through classes.
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

    const analyzeBtn = document.querySelector('[data-testid="analyze-btn"]');
    if (analyzeBtn)
        analyzeBtn.textContent =
            streamInputIds.length > 1 ? 'Analyze & Compare' : 'Analyze';

    const globalControls = document.getElementById('global-stream-controls');
    if (globalControls) {
        globalControls.classList.toggle('hidden', !isResultsView);
        render(globalControlsTemplate(streams), globalControls);
    }

    // Responsive header alignment
    dom.mainHeader.classList.toggle('md:justify-center', !isResultsView);
    dom.mainHeader.classList.toggle('md:justify-between', isResultsView);
    dom.headerTitleGroup.classList.toggle('text-center', !isResultsView);
    dom.headerTitleGroup.classList.toggle('md:text-left', isResultsView);
    dom.headerUrlDisplay.classList.toggle('hidden', !isResultsView);

    if (isResultsView) {
        const urlHtml = streams
            .map(
                (s) =>
                    `<div class="truncate" title="${s.originalUrl}">${s.originalUrl}</div>`
            )
            .join('');
        dom.headerUrlDisplay.innerHTML = `<span class="font-bold text-gray-300 block mb-1">Analyzed Stream(s):</span>${urlHtml}`;
    } else {
        dom.headerUrlDisplay.innerHTML = '';
    }

    // --- Conditional Tab Visibility ---
    const comparisonTabButton = document.getElementById('tab-btn-comparison');
    if (comparisonTabButton) {
        comparisonTabButton.classList.toggle('hidden', streams.length <= 1);
        if (streams.length <= 1 && activeTab === 'comparison') {
            uiActions.setActiveTab('summary');
        }
    }

    const interactiveSegmentTabButton = document.getElementById(
        'tab-btn-interactive-segment'
    );
    if (interactiveSegmentTabButton) {
        interactiveSegmentTabButton.classList.toggle(
            'hidden',
            !activeSegmentUrl
        );
    }

    const parserCoverageTabButton = document.getElementById(
        'tab-btn-parser-coverage'
    );
    if (parserCoverageTabButton) {
        parserCoverageTabButton.classList.toggle('hidden', !isDebugMode);
    }

    // --- Content Rendering Logic ---
    if (isResultsView) {
        populateContextSwitcher();
        render(html``, dom.streamInputs); // Clear inputs

        Object.entries(dom.tabContents).forEach(([tabName, container]) => {
            if (!container) return;
            debugLog(
                'mainRenderer',
                `Processing tab: ${tabName}. Active tab: ${activeTab}.`
            );

            if (tabName !== activeTab) {
                render(html``, container);
                container.classList.add('hidden');
                return;
            }

            container.classList.remove('hidden');
            debugLog(
                'mainRenderer',
                `Rendering active tab: ${tabName}. Stream available: ${!!activeStream}`
            );

            /** @type {TemplateResult} */
            let template = html``;
            if (tabName === 'comparison' && streams.length > 1) {
                template = getComparisonTemplate(streams);
            } else if (activeStream) {
                switch (tabName) {
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
                        template = getParserCoverageTemplate(activeStream);
                        break;
                }
            }

            render(template, container);

            if (tabName === 'timeline-visuals' && activeStream) {
                initializeTimelineView(container, activeStream);
            }
            if (tabName === 'explorer' && activeStream) {
                initializeSegmentExplorer(container, activeStream);
            }
        });
    } else {
        render(getStreamInputsTemplate(), dom.streamInputs);
        Object.values(dom.tabContents).forEach((container) => {
            if (container) {
                render(html``, container);
                container.classList.add('hidden');
            }
        });
    }

    // Hide loader after render is complete and the browser is about to paint the new view
    hideLoader();
}