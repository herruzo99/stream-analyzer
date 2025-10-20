import { html, render } from 'lit-html';
import { dashTimelineTemplate } from './components/dash/index.js';
import { hlsTimelineTemplate } from './components/hls/index.js';
import { createDashTimelineViewModel } from './view-model.js';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { useAnalysisStore } from '@/state/analysisStore';

let container = null;
let analysisUnsubscribe = null;
let segmentCacheUnsubscribe = null;

function renderTimelineView() {
    if (!container) return;

    const { streams, activeStreamId } = useAnalysisStore.getState();
    const stream = streams.find((s) => s.id === activeStreamId);

    if (!stream || !stream.manifest) {
        render(
            html`<p class="text-gray-400">No manifest loaded.</p>`,
            container
        );
        return;
    }

    const loadingTemplate = html`<div class="text-center py-8 text-gray-400">
        Loading timeline data...
    </div>`;
    render(loadingTemplate, container);

    if (stream.protocol === 'hls') {
        render(hlsTimelineTemplate(stream.manifest), container);
    } else {
        const { cache } = useSegmentCacheStore.getState();
        createDashTimelineViewModel(stream, cache)
            .then((viewModel) => {
                if (container) {
                    render(dashTimelineTemplate(viewModel), container);
                }
            })
            .catch((err) => {
                console.error(
                    'Failed to create DASH timeline view model:',
                    err
                );
                if (container) {
                    render(
                        html`<div class="text-red-400 p-4 text-center">
                            <p class="font-bold">
                                Error loading timeline visualization.
                            </p>
                            <p class="text-sm font-mono mt-2">${err.message}</p>
                        </div>`,
                        container
                    );
                }
            });
    }
}

export const timelineView = {
    mount(containerElement) {
        container = containerElement;

        if (analysisUnsubscribe) analysisUnsubscribe();
        if (segmentCacheUnsubscribe) segmentCacheUnsubscribe();

        analysisUnsubscribe = useAnalysisStore.subscribe(renderTimelineView);
        segmentCacheUnsubscribe =
            useSegmentCacheStore.subscribe(renderTimelineView);

        renderTimelineView(); // Render immediately with current state
    },

    unmount() {
        if (analysisUnsubscribe) analysisUnsubscribe();
        if (segmentCacheUnsubscribe) segmentCacheUnsubscribe();
        analysisUnsubscribe = null;
        segmentCacheUnsubscribe = null;

        if (container) {
            render(html``, container);
        }
        container = null;
    },
};
