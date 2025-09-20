import { html, render } from 'lit-html';
import { dom, analysisState } from '../core/state.js';
import { getGlobalSummaryTemplate } from '../features/summary/view.js';
import {
    getComplianceReportTemplate,
    attachComplianceFilterListeners,
} from '../features/compliance/view.js';
import { getTimelineAndVisualsTemplate } from '../features/timeline-visuals/view.js';
import { getFeaturesAnalysisTemplate } from '../features/feature-analysis/view.js';
import { getInteractiveManifestTemplate } from '../features/interactive-manifest/view.js';
import { getInteractiveSegmentTemplate } from '../features/interactive-segment/view.js';
import { initializeSegmentExplorer } from '../features/segment-explorer/view.js';
import { getComparisonTemplate } from '../features/comparison/view.js';
import { renderManifestUpdates } from '../features/manifest-updates/view.js';

export function populateContextSwitcher() {
    if (analysisState.streams.length > 1) {
        dom.contextSwitcherContainer.classList.remove('hidden');
        const optionsTemplate = analysisState.streams.map(
            (s) =>
                html`<option value="${s.id}">
                    ${s.name} (${s.protocol.toUpperCase()})
                </option>`
        );
        render(optionsTemplate, dom.contextSwitcher);
        dom.contextSwitcher.value = String(analysisState.activeStreamId);
    } else {
        dom.contextSwitcherContainer.classList.add('hidden');
    }
}

export function renderAllTabs() {
    const hasMultipleStreams = analysisState.streams.length > 1;

    /** @type {HTMLElement} */
    (document.querySelector('[data-tab="comparison"]')).style.display =
        hasMultipleStreams ? 'block' : 'none';
    /** @type {HTMLElement} */
    (document.querySelector('[data-tab="summary"]')).style.display =
        hasMultipleStreams ? 'none' : 'block';

    dom.tabContents['interactive-manifest'].innerHTML = ''; // Clear previous content

    if (hasMultipleStreams) {
        render(getComparisonTemplate(), dom.tabContents.comparison);
    }

    renderSingleStreamTabs(analysisState.activeStreamId);
}

export function showStatus(message, type) {
    const colors = {
        info: 'text-blue-400',
        pass: 'text-green-400',
        warn: 'text-yellow-400',
        fail: 'text-red-400',
    };
    dom.status.textContent = message;
    dom.status.className = `text-center my-4 ${colors[type]}`;
}

export function renderSingleStreamTabs(streamId) {
    const stream = analysisState.streams.find((s) => s.id === streamId);
    if (!stream) return;
    const { manifest, protocol } = stream;

    if (analysisState.streams.length === 1) {
        render(getGlobalSummaryTemplate(manifest), dom.tabContents.summary);
    }

    render(
        getComplianceReportTemplate(manifest, protocol),
        dom.tabContents.compliance
    );
    attachComplianceFilterListeners();

    render(
        getTimelineAndVisualsTemplate(manifest, protocol),
        dom.tabContents['timeline-visuals']
    );
    render(
        getFeaturesAnalysisTemplate(manifest, protocol),
        dom.tabContents.features
    );
    render(
        getInteractiveManifestTemplate(stream),
        dom.tabContents['interactive-manifest']
    );
    render(
        getInteractiveSegmentTemplate(),
        dom.tabContents['interactive-segment']
    );
    initializeSegmentExplorer(dom.tabContents.explorer, stream);
    renderManifestUpdates(streamId);
}