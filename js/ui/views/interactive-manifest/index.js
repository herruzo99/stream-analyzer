import { html } from 'lit-html';
import { useStore } from '../../../core/store.js';
import { dashManifestTemplate } from './components/dash/renderer.js';
import { hlsManifestTemplate } from './components/hls/renderer.js';
import { debugLog } from '../../../shared/utils/debug.js';

/**
 * Dispatches to the correct manifest renderer based on stream protocol.
 * @param {import('../../../core/types.js').Stream} stream
 * @returns {import('lit-html').TemplateResult}
 */
export function getInteractiveManifestTemplate(stream) {
    debugLog(
        'InteractiveManifest',
        'getInteractiveManifestTemplate called.',
        'Stream valid:',
        !!stream,
        'Manifest valid:',
        !!stream?.manifest
    );

    if (!stream || !stream.manifest) {
        debugLog(
            'InteractiveManifest',
            'Render condition failed: No stream or manifest.'
        );
        return html`<p class="warn">No Manifest loaded to display.</p>`;
    }

    const { interactiveManifestCurrentPage } = useStore.getState();

    debugLog(
        'InteractiveManifest',
        `Dispatching to ${stream.protocol.toUpperCase()} renderer.`
    );

    if (stream.protocol === 'hls') {
        return hlsManifestTemplate(stream, interactiveManifestCurrentPage);
    }

    // Default to DASH
    return dashManifestTemplate(stream, interactiveManifestCurrentPage);
}