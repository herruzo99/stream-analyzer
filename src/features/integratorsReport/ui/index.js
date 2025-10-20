import { html, render } from 'lit-html';
import { createIntegratorsReportViewModel } from './view-model.js';
import { dashReportTemplate } from './components/dash-report.js';
import { hlsReportTemplate } from './components/hls-report.js';
import { useAnalysisStore } from '@/state/analysisStore';

let container = null;
let analysisUnsubscribe = null;

function renderIntegratorsReport() {
    if (!container) return;

    const { streams, activeStreamId } = useAnalysisStore.getState();
    const stream = streams.find((s) => s.id === activeStreamId);

    if (!stream || !stream.manifest) {
        render(
            html`<p class="warn">No stream data available for this report.</p>`,
            container
        );
        return;
    }

    const viewModel = createIntegratorsReportViewModel(stream);
    let template;

    if (stream.protocol === 'dash') {
        template = dashReportTemplate(viewModel);
    } else if (stream.protocol === 'hls') {
        template = hlsReportTemplate(viewModel);
    } else {
        template = html`<p class="warn">
            Integrator's Report not available for unknown protocol.
        </p>`;
    }

    render(template, container);
}

export const integratorsReportView = {
    mount(containerElement) {
        container = containerElement;
        if (analysisUnsubscribe) analysisUnsubscribe();
        analysisUnsubscribe = useAnalysisStore.subscribe(
            renderIntegratorsReport
        );
        renderIntegratorsReport(); // Render immediately with current state
    },
    unmount() {
        if (analysisUnsubscribe) analysisUnsubscribe();
        analysisUnsubscribe = null;
        if (container) render(html``, container);
        container = null;
    },
};
