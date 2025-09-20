import { html } from 'lit-html';
import { dashManifestTemplate } from './dash-renderer.js';
import { hlsManifestTemplate } from './hls-renderer.js';

/**
 * Dispatches to the correct manifest renderer based on stream protocol.
 * @param {import('../../core/state.js').Stream} stream
 * @returns {import('lit-html').TemplateResult}
 */
export function getInteractiveManifestTemplate(stream) {
    if (!stream || !stream.manifest)
        return html`<p class="warn">No Manifest loaded to display.</p>`;

    if (stream.protocol === 'hls') {
        return hlsManifestTemplate(stream);
    }

    // Default to DASH
    return dashManifestTemplate(
        /** @type {Element} */ (stream.manifest.rawElement)
    );
}