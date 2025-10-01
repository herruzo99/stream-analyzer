import { html, render } from 'lit-html';
import { dom, analysisState } from '../core/state.js';
import { getGlobalSummaryTemplate } from './views/summary/index.js';
import {
    getComplianceReportTemplate,
    attachComplianceFilterListeners,
} from './views/compliance/index.js';
import { initializeTimelineView } from './views/timeline-visuals/index.js';
import { getFeaturesAnalysisTemplate } from './views/feature-analysis/index.js';
import { getInteractiveManifestTemplate } from './views/interactive-manifest/index.js';
import { getInteractiveSegmentTemplate } from './views/interactive-segment/index.js';
import { initializeSegmentExplorer } from './views/segment-explorer/index.js';
import { getComparisonTemplate } from './views/comparison/index.js';
import { renderManifestUpdates } from './views/manifest-updates/index.js';

export function populateContextSwitcher() {
    if (analysisState.streams.length > 1) {
        dom.contextSwitcherWrapper.classList.remove('hidden');
        const optionsTemplate = analysisState.streams.map(
            (s) =>
                html`<option value="${s.id}">
                    ${s.name} (${s.protocol.toUpperCase()})
                </option>`
        );
        render(optionsTemplate, dom.contextSwitcher);
        dom.contextSwitcher.value = String(analysisState.activeStreamId);
    } else {
        dom.contextSwitcherWrapper.classList.add('hidden');
    }
}

export function renderAllTabs() {
    console.time('Render All Tabs');
    const hasMultipleStreams = analysisState.streams.length > 1;

    /** @type {HTMLElement} */
    (document.querySelector('[data-tab="comparison"]')).style.display =
        hasMultipleStreams ? 'flex' : 'none';

    if (hasMultipleStreams) {
        console.time('Render Comparison Tab');
        render(getComparisonTemplate(), dom.tabContents.comparison);
        console.timeEnd('Render Comparison Tab');
    }

    renderSingleStreamTabs(analysisState.activeStreamId);
    console.timeEnd('Render All Tabs');
}

export function renderSingleStreamTabs(streamId) {
    const stream = analysisState.streams.find((s) => s.id === streamId);
    if (!stream) return;

    console.time('Render Summary Tab');
    render(getGlobalSummaryTemplate(stream), dom.tabContents.summary);
    console.timeEnd('Render Summary Tab');

    console.time('Render Compliance Tab');
    render(getComplianceReportTemplate(stream), dom.tabContents.compliance);
    attachComplianceFilterListeners();
    console.timeEnd('Render Compliance Tab');

    console.time('Render Timeline Tab');
    initializeTimelineView(dom.tabContents['timeline-visuals'], stream);
    console.timeEnd('Render Timeline Tab');

    console.time('Render Features Tab');
    render(getFeaturesAnalysisTemplate(stream), dom.tabContents.features);
    console.timeEnd('Render Features Tab');

    console.time('Render Interactive Manifest Tab');
    render(
        getInteractiveManifestTemplate(stream),
        dom.tabContents['interactive-manifest']
    );
    console.timeEnd('Render Interactive Manifest Tab');

    console.time('Render Interactive Segment Tab');
    render(
        getInteractiveSegmentTemplate(),
        dom.tabContents['interactive-segment']
    );
    console.timeEnd('Render Interactive Segment Tab');

    console.time('Render Segment Explorer Tab');
    initializeSegmentExplorer(dom.tabContents.explorer, stream);
    console.timeEnd('Render Segment Explorer Tab');

    console.time('Render Manifest Updates Tab');
    renderManifestUpdates(streamId);
    console.timeEnd('Render Manifest Updates Tab');
}