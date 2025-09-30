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

/**
 * Displays a status message. Can be a persistent message or a transient toast.
 * @param {string} message - The message to display.
 * @param {'info' | 'pass' | 'warn' | 'fail'} type - The message type.
 * @param {number | null} [duration=null] - If provided, shows a toast for this many ms.
 */
export function showStatus(message, type, duration = null) {
    if (duration) {
        // Create and show a transient toast notification
        const toast = document.createElement('div');
        const colors = {
            pass: 'bg-green-600 border-green-500',
            fail: 'bg-red-600 border-red-500',
            warn: 'bg-yellow-600 border-yellow-500',
            info: 'bg-blue-600 border-blue-500',
        };
        toast.className = `p-4 rounded-lg border text-white shadow-lg transition-all duration-300 ease-in-out transform translate-x-full opacity-0 ${colors[type]}`;
        toast.textContent = message;
        dom.toastContainer.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
        }, 10);

        // Set timer to animate out and remove
        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-x-8');
            toast.addEventListener('transitionend', () => toast.remove());
        }, duration);
    } else {
        // Show a persistent status message
        const colors = {
            info: 'text-blue-400',
            pass: 'text-green-400',
            warn: 'text-yellow-400',
            fail: 'text-red-400',
        };
        dom.status.textContent = message;
        dom.status.className = `text-center my-4 ${colors[type]}`;
    }
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
