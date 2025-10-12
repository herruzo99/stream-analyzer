import { html } from 'lit-html';
import { dashTimelineTemplate } from './components/dash/index.js';
import { hlsTimelineTemplate } from './components/hls/index.js';
import { createDashTimelineViewModel } from './view-model.js';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';

/**
 * Asynchronously generates and returns the template for the timeline view.
 * This function handles the logic for fetching and processing data needed for the view model.
 * @param {import('@/types.ts').Stream} stream - The stream data.
 * @returns {Promise<import('lit-html').TemplateResult>} A promise that resolves to the final template.
 */
async function getAsyncTimelineTemplate(stream) {
    if (stream.protocol === 'hls') {
        return hlsTimelineTemplate(stream.manifest);
    }

    // For DASH, we must build the view model asynchronously.
    try {
        const { cache } = useSegmentCacheStore.getState();
        const viewModel = await createDashTimelineViewModel(stream, cache);
        return dashTimelineTemplate(viewModel);
    } catch (err) {
        console.error('Failed to create DASH timeline view model:', err);
        return html`<div class="text-red-400 p-4 text-center">
            <p class="font-bold">Error loading timeline visualization.</p>
            <p class="text-sm font-mono mt-2">${err.message}</p>
        </div>`;
    }
}

/**
 * Main entry point for rendering the timeline. It returns a promise that the `until` directive can use.
 * @param {import('@/types.ts').Stream} stream - The stream data.
 * @returns {Promise<import('lit-html').TemplateResult>}
 */
export function getTimelineAndVisualsTemplate(stream) {
    if (!stream || !stream.manifest) {
        return Promise.resolve(html`<p class="text-gray-400">No manifest loaded.</p>`);
    }
    return getAsyncTimelineTemplate(stream);
}