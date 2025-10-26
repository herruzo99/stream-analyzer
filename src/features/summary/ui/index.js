import { html, render } from 'lit-html';
import { getDashSummaryTemplate } from './dash.js';
import { getHlsSummaryTemplate } from './hls.js';
import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore } from '@/state/uiStore';

let container = null;
let analysisUnsubscribe = null;
let uiUnsubscribe = null;

function renderSummary() {
    if (!container) return;

    const { streams, activeStreamId } = useAnalysisStore.getState();
    const stream = streams.find((s) => s.id === activeStreamId);

    if (!stream || !stream.manifest || !stream.manifest.summary) {
        render(
            html`<p class="warn">No manifest summary data to display.</p>`,
            container
        );
        return;
    }

    let template;
    if (stream.protocol === 'dash') {
        template = getDashSummaryTemplate(stream);
    } else if (stream.protocol === 'hls') {
        template = getHlsSummaryTemplate(stream);
    } else {
        template = html`<p class="warn">
            Summary view not available for unknown protocol.
        </p>`;
    }
    render(template, container);
}

export const summaryView = {
    mount(containerElement) {
        container = containerElement;

        if (analysisUnsubscribe) analysisUnsubscribe();
        if (uiUnsubscribe) uiUnsubscribe();

        analysisUnsubscribe = useAnalysisStore.subscribe(renderSummary);
        uiUnsubscribe = useUiStore.subscribe(renderSummary);

        renderSummary(); // Render immediately with current state
    },
    unmount() {
        if (analysisUnsubscribe) analysisUnsubscribe();
        if (uiUnsubscribe) uiUnsubscribe();

        analysisUnsubscribe = null;
        uiUnsubscribe = null;

        if (container) render(html``, container);
        container = null;
    },
};
