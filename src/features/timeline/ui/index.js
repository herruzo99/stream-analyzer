import { useAnalysisStore } from '@/state/analysisStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { metricPanelTemplate } from './components/metric-panel.js';
import './components/timeline-chart.js';
import './components/drift-chart.js';
import { timelineControlsTemplate } from './components/timeline-controls.js';
import { timelineInspectorTemplate } from './components/timeline-inspector.js';
import { cascadeViewTemplate as dashCascadeViewTemplate } from './dash/components/cascade-view.js';
import { hlsCascadeViewTemplate } from './hls/components/cascade-view.js';
import { createTimelineViewModel } from './view-model.js';

let container = null;
let unsubs = [];

function renderTimeline() {
    if (!container) return;

    const { streams, activeStreamId } = useAnalysisStore.getState();
    const { timelineActiveTab } = useUiStore.getState();
    const stream = streams.find((s) => s.id === activeStreamId) ?? streams[0];

    if (!stream) {
        render(
            html`<div class="p-8 text-center text-slate-500">
                No stream loaded.
            </div>`,
            container
        );
        return;
    }

    const viewModel = createTimelineViewModel(stream);
    const hasDrilldown =
        stream.protocol === 'dash' ||
        (stream.protocol === 'hls' && stream.manifest.isMaster);

    const toggleDrilldown = () => {
        const newTab =
            timelineActiveTab === 'drilldown' ? 'overview' : 'drilldown';
        uiActions.setTimelineActiveTab(newTab);
    };

    let content;
    if (timelineActiveTab === 'drilldown') {
        content = html`
            <div
                class="p-6 h-full overflow-y-auto custom-scrollbar bg-slate-950"
            >
                <div class="flex items-center justify-between mb-6">
                    <h2
                        class="text-xl font-bold text-white flex items-center gap-2"
                    >
                        ${icons.folderTree} Structural Drilldown
                    </h2>
                    <button
                        @click=${toggleDrilldown}
                        class="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
                    >
                        ${icons.arrowLeft} Back to Timeline
                    </button>
                </div>
                ${stream.protocol === 'dash'
                    ? dashCascadeViewTemplate(stream)
                    : hlsCascadeViewTemplate(stream)}
            </div>
        `;
    } else {
        // Unified Dashboard
        content = html`
            <div
                class="flex flex-col h-full p-6 gap-6 bg-slate-950 overflow-hidden"
            >
                <!-- Header Controls -->
                <div
                    class="shrink-0 flex justify-between items-end border-b border-white/10 pb-4"
                >
                    ${timelineControlsTemplate(stream)}
                    <div class="flex items-center gap-2">
                        ${hasDrilldown
                            ? html`
                                  <button
                                      @click=${toggleDrilldown}
                                      class="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
                                  >
                                      ${icons.list} Structure Tree
                                  </button>
                              `
                            : ''}
                    </div>
                </div>

                <!-- Metrics Grid -->
                <div class="shrink-0">
                    ${metricPanelTemplate(viewModel.metricsGroups)}
                </div>

                <!-- Chart (Smaller Height) -->
                <div
                    class="shrink-0 h-64 bg-white/5 rounded-md border border-white/10 p-1 relative overflow-hidden"
                >
                    <div
                        class="absolute inset-0 bg-[url('/assets/grid.svg')] opacity-5 pointer-events-none"
                    ></div>
                    <timeline-chart .data=${viewModel}></timeline-chart>
                </div>

                <!-- Drift Chart -->
                ${stream.manifest?.type === 'dynamic'
                    ? html`
                          <div
                              class="shrink-0 h-48 bg-white/5 rounded-md border border-white/10 p-1 relative overflow-hidden"
                          >
                              <div
                                  class="absolute top-2 left-4 z-10 text-xs font-bold text-slate-400"
                              >
                                  Live Edge Drift
                              </div>
                              <drift-chart
                                  .data=${viewModel.driftHistory}
                              ></drift-chart>
                          </div>
                      `
                    : ''}

                <!-- Inspector (Fills remaining space) -->
                <div
                    class="grow min-h-0 bg-white/5 rounded-md border border-white/10 overflow-hidden flex flex-col"
                >
                    <div
                        class="p-3 bg-white/5 border-b border-white/10 font-bold text-xs text-slate-400 r"
                    >
                        Selection Inspector
                    </div>
                    <div class="grow overflow-hidden">
                        ${timelineInspectorTemplate()}
                    </div>
                </div>
            </div>
        `;
    }

    render(content, container);
}

export const timelineView = {
    mount(containerElement) {
        container = containerElement;
        unsubs.push(useAnalysisStore.subscribe(renderTimeline));
        unsubs.push(useUiStore.subscribe(renderTimeline));
        renderTimeline();
    },
    unmount() {
        unsubs.forEach((u) => u());
        unsubs = [];
        if (container) render(html``, container);
        container = null;
    },
};
