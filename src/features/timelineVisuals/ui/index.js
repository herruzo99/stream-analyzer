import { html, render } from 'lit-html';
import { createTimelineViewModel } from './view-model.js';
import { useAnalysisStore } from '@/state/analysisStore';
import './components/timeline-chart.js';
import { eventListTemplate } from './components/event-list.js';
import '@/features/comparison/ui/components/abr-ladder-chart';

let container = null;
let analysisUnsubscribe = null;
let currentStreamId = null;

function renderTimelineView() {
    if (!container) return;

    const { streams, activeStreamId } = useAnalysisStore.getState();
    if (activeStreamId !== currentStreamId) {
        // Stream has changed, force re-render of components
        if (container) render(html``, container);
        currentStreamId = activeStreamId;
    }

    const stream = streams.find((s) => s.id === activeStreamId);

    if (!stream || !stream.manifest) {
        render(
            html`<p class="text-gray-400">No manifest loaded.</p>`,
            container
        );
        return;
    }

    const viewModel = createTimelineViewModel(stream);
    const hasEvents = viewModel.events.length > 0;
    const hasAbrLadder = viewModel.abrLadder.tracks.length > 0;

    const template = html`
        <div class="space-y-8">
            <div>
                <h3 class="text-xl text-white font-bold mb-4">
                    Media Timeline Visualization
                </h3>
                <div
                    class="bg-slate-800 p-4 rounded-lg border border-slate-700"
                >
                    <timeline-chart .viewModel=${viewModel}></timeline-chart>
                </div>
            </div>

            <div
                class="grid gap-8 ${hasEvents && hasAbrLadder
                    ? 'lg:grid-cols-2'
                    : ''}"
            >
                ${hasAbrLadder
                    ? html`<div>
                          <h3 class="text-xl text-white font-bold mb-4">
                              ABR Bitrate Ladder
                          </h3>
                          <div
                              class="bg-slate-800 p-4 rounded-lg border border-slate-700 h-80"
                          >
                              <abr-ladder-chart
                                  .data=${[viewModel.abrLadder]}
                              ></abr-ladder-chart>
                          </div>
                      </div>`
                    : ''}
                ${hasEvents
                    ? html`<div>
                          <h3 class="text-xl text-white font-bold mb-4">
                              Timed Events
                          </h3>
                          <div
                              class="bg-slate-800 p-4 rounded-lg border border-slate-700"
                          >
                              ${eventListTemplate(viewModel.events)}
                          </div>
                      </div>`
                    : ''}
            </div>
        </div>
    `;
    render(template, container);
}

export const timelineView = {
    mount(containerElement, { stream }) {
        container = containerElement;
        currentStreamId = stream?.id;

        if (analysisUnsubscribe) analysisUnsubscribe();
        analysisUnsubscribe = useAnalysisStore.subscribe(renderTimelineView);
        renderTimelineView();
    },

    unmount() {
        if (analysisUnsubscribe) analysisUnsubscribe();
        analysisUnsubscribe = null;
        if (container) render(html``, container);
        container = null;
        currentStreamId = null;
    },
};
