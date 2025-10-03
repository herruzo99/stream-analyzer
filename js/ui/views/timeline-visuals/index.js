import { html, render } from 'lit-html';
import { dashTimelineTemplate } from './components/dash/index.js';
import { hlsTimelineTemplate } from './components/hls/index.js';
import { createDashTimelineViewModel } from './view-model.js';

/**
 * Renders the timeline view based on the provided state.
 * @param {object} manifest - The stream's manifest.
 * @param {string} protocol - The stream's protocol.
 * @param {object | null} viewModel - The calculated view model data.
 * @param {boolean} isLoading - A flag indicating if data is being loaded.
 * @returns {import('lit-html').TemplateResult}
 */
export function getTimelineAndVisualsTemplate(
    manifest,
    protocol,
    viewModel,
    isLoading
) {
    if (protocol === 'hls') {
        return hlsTimelineTemplate(manifest);
    }

    if (isLoading) {
        return html`<div class="text-center py-8 text-gray-400">
            Loading timeline data...
        </div>`;
    }

    return dashTimelineTemplate(viewModel);
}

/**
 * Controller function to orchestrate the rendering of the timeline view.
 * It handles the asynchronous loading of the view model.
 * @param {HTMLElement} container - The DOM element to render into.
 * @param {import('../../../core/store.js').Stream} stream - The stream data.
 */
export function initializeTimelineView(container, stream) {
    if (stream.protocol === 'hls') {
        render(
            getTimelineAndVisualsTemplate(
                stream.manifest,
                stream.protocol,
                null,
                false
            ),
            container
        );
        return;
    }

    // For DASH, we need to build the view model asynchronously.
    // 1. Render the initial loading state immediately.
    render(
        getTimelineAndVisualsTemplate(
            stream.manifest,
            stream.protocol,
            null,
            true
        ),
        container
    );

    // 2. Kick off the asynchronous view model creation.
    createDashTimelineViewModel(stream)
        .then((viewModel) => {
            // 3. Once data is ready, re-render with the complete view model.
            render(
                getTimelineAndVisualsTemplate(
                    stream.manifest,
                    stream.protocol,
                    viewModel,
                    false
                ),
                container
            );
        })
        .catch((err) => {
            // 4. If an error occurs, render an error state.
            console.error('Failed to create DASH timeline view model:', err);
            const errorTemplate = html`<div
                class="text-red-400 p-4 text-center"
            >
                <p class="font-bold">Error loading timeline visualization.</p>
                <p class="text-sm font-mono mt-2">${err.message}</p>
            </div>`;
            render(errorTemplate, container);
        });
}
