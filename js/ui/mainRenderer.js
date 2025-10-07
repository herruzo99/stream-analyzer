import { html, render } from 'lit-html';
import { useStore, storeActions } from '../app/store.js';
import { getGlobalSummaryTemplate } from './views/summary/index.js';
import { getComplianceReportTemplate } from './views/compliance/index.js';
import { initializeTimelineView } from './views/timeline-visuals/index.js';
import { getFeaturesAnalysisTemplate } from './views/feature-analysis/index.js';
import { getInteractiveManifestTemplate } from './views/interactive-manifest/index.js';
import { getInteractiveSegmentTemplate } from './views/interactive-segment/index.js';
import { initializeSegmentExplorer } from './views/segment-explorer/index.js';
import { getComparisonTemplate } from './views/comparison/index.js';
import { manifestUpdatesTemplate } from './views/manifest-updates/index.js';
import { getParserCoverageTemplate } from './views/parser-coverage/index.js';
import { getIntegratorsReportTemplate } from './views/integrators-report/index.js';
import { globalControlsTemplate } from './ui-controller.js';
import { getStreamInputsTemplate } from './components/stream-inputs.js';
import { debugLog } from '../shared/utils/debug.js';
import { hideLoader } from './components/loader.js';
import { isDebugMode } from '../shared/utils/env.js';

/** @typedef {import('lit-html').TemplateResult} TemplateResult */

let dom;
// activeTab will now be managed by the store, no local variable needed.

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
    const { streams, activeStreamId } = useStore.getState();
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

// setActiveTab is removed as it's now an action in the store.

/**
 * The main application render function. Reads the current state from the store
 * and re-renders the entire UI declaratively.
 */
export function renderApp() {
    if (!dom) return;

    const state = useStore.getState();
    const { streams, activeStreamId, viewState, activeTab } = state;
    const activeStream = streams.find((s) => s.id === activeStreamId);

    // --- Top-Level View State Management ---
    const isResultsView = viewState === 'results' && streams.length > 0;

    dom.inputSection.classList.toggle('hidden', isResultsView);
    dom.results.classList.toggle('hidden', !isResultsView);
    dom.newAnalysisBtn.classList.toggle('hidden', !isResultsView);
    dom.shareAnalysisBtn.classList.toggle('hidden', !isResultsView);
    dom.copyDebugBtn.classList.toggle('hidden', !isResultsView);
    dom.analyzeBtn.textContent =
        state.streamInputIds.length > 1 ? 'Analyze & Compare' : 'Analyze';

    const globalControls = document.getElementById('global-stream-controls');
    if (globalControls) {
        globalControls.classList.toggle('hidden', !isResultsView);
        render(globalControlsTemplate(activeStream), globalControls);
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
    const comparisonTabContent = document.getElementById('tab-comparison');
    if (streams.length <= 1) {
        comparisonTabButton?.classList.add('hidden');
        comparisonTabContent?.classList.add('hidden');
        // If comparison was active and now only one stream, switch to summary
        if (activeTab === 'comparison') {
            storeActions.setActiveTab('summary');
        }
    } else {
        comparisonTabButton?.classList.remove('hidden');
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
