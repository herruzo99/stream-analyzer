import { html } from 'lit-html';
import { getDashSummaryTemplate } from './dash.js';
import { getHlsSummaryTemplate } from './hls.js';

/**
 * Main dispatcher for the Global Summary view.
 * It selects the appropriate protocol-specific template to render.
 * @param {import('../../../core/types.js').Stream} stream The active stream.
 * @returns {import('lit-html').TemplateResult} The rendered template for the summary.
 */
export function getGlobalSummaryTemplate(stream) {
    if (!stream || !stream.manifest || !stream.manifest.summary) {
        return html`<p class="warn">No manifest summary data to display.</p>`;
    }

    if (stream.protocol === 'dash') {
        return getDashSummaryTemplate(stream);
    }

    if (stream.protocol === 'hls') {
        return getHlsSummaryTemplate(stream);
    }

    return html`<p class="warn">
        Summary view not available for unknown protocol.
    </p>`;
}