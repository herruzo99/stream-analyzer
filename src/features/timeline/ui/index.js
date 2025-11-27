import { useAnalysisStore } from '@/state/analysisStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { metricPanelTemplate } from './components/metric-panel.js';
import './components/timeline-chart.js';
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
    const stream = streams.find((s) => s.id === activeStreamId);

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
                        class="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
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
                    class="shrink-0 flex justify-between items-end border-b border-slate-800 pb-4"
                >
                    ${timelineControlsTemplate(stream)}
                    <div class="flex items-center gap-2">
                        ${hasDrilldown
                            ? html`
                                  <button
                                      @click=${toggleDrilldown}
                                      class="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                                  >
                                      ${icons.list} Structure Tree
                                  </button>
                              `
                            : ''}
                    </div>
                </div>

                <!-- Metrics Grid -->
                <div class="shrink-0 animate-fadeIn">
                    ${metricPanelTemplate(viewModel.metricsGroups)}
                </div>

                <!-- Chart (Smaller Height) -->
                <div
                    class="shrink-0 h-64 bg-slate-900/50 rounded-xl border border-slate-800 p-1 relative overflow-hidden shadow-inner"
                >
                    <div
                        class="absolute inset-0 bg-[url('/assets/grid.svg')] opacity-5 pointer-events-none"
                    ></div>
                    <timeline-chart .data=${viewModel}></timeline-chart>
                </div>

                <!-- Inspector (Fills remaining space) -->
                <div
                    class="grow min-h-0 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col shadow-lg"
                >
                    <div
                        class="p-3 bg-slate-800/80 border-b border-slate-700 font-bold text-xs text-slate-400 uppercase tracking-wider"
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
