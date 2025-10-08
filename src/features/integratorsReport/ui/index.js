import { html } from 'lit-html';
import { createIntegratorsReportViewModel } from './view-model.js';
import { dashReportTemplate } from './components/dash-report.js';
import { hlsReportTemplate } from './components/hls-report.js';

/**
 * Main dispatcher for the Integrator's Report view.
 * It selects the appropriate protocol-specific template to render.
 * @param {import('@/types.ts').Stream} stream The active stream.
 * @returns {import('lit-html').TemplateResult} The rendered template for the report.
 */
export function getIntegratorsReportTemplate(stream) {
    if (!stream || !stream.manifest) {
        return html`<p class="warn">
            No stream data available for this report.
        </p>`;
    }

    const viewModel = createIntegratorsReportViewModel(stream);

    if (stream.protocol === 'dash') {
        return dashReportTemplate(viewModel);
    }

    if (stream.protocol === 'hls') {
        return hlsReportTemplate(viewModel);
    }

    return html`<p class="warn">
        Integrator's Report not available for unknown protocol.
    </p>`;
}
