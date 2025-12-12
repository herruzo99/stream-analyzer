import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { bitrateLadderTemplate } from './components/bitrate-ladder.js';
import { cmafWidgetTemplate } from './components/cmaf-widget.js';
import { complianceWidgetTemplate } from './components/compliance-widget.js';
import { featureGridTemplate } from './components/feature-grid.js';
import { heroHeaderTemplate } from './components/hero-header.js';
import { quickStatsTemplate } from './components/quick-stats.js';
import { tracksPanelTemplate } from './components/tracks-panel.js';
import { createSummaryViewModel } from './view-model.js';

let container = null;
let analysisUnsubscribe = null;

function renderSummary() {
    if (!container) return;

    const { streams, activeStreamId } = useAnalysisStore.getState();
    const stream = streams.find((s) => s.id === activeStreamId);

    if (!stream) {
        render(
            html`
                <div
                    class="flex flex-col items-center justify-center h-full text-slate-500 animate-fadeIn"
                >
                    <div class="bg-slate-800 p-6 rounded-full mb-4 shadow-lg">
                        ${icons.search}
                    </div>
                    <p class="text-lg font-medium text-slate-300">
                        No stream loaded.
                    </p>
                    <p class="text-sm">
                        Select a stream or start a new analysis.
                    </p>
                </div>
            `,
            container
        );
        return;
    }

    const vm = createSummaryViewModel(stream);

    // --- FAULT TOLERANCE: Handle broken stream state ---
    if (!vm) {
        const handleRemove = () => {
             if (confirm(`Remove broken stream "${stream.name}"?`)) {
                 analysisActions.removeStreamInput(stream.id);
             }
        };

        render(
            html`
                <div
                    class="flex flex-col items-center justify-center h-full text-slate-500 animate-fadeIn p-8 text-center"
                >
                    <div class="bg-red-900/20 p-6 rounded-full mb-4 shadow-lg border border-red-500/30 text-red-500">
                        ${icons.alertTriangle}
                    </div>
                    <h3 class="text-xl font-bold text-red-400 mb-2">Analysis Incomplete</h3>
                    <p class="text-sm text-slate-400 max-w-md mb-6">
                        The manifest summary could not be generated. This usually indicates a parsing failure or an unsupported format.
                    </p>
                    
                    <div class="bg-slate-900/50 p-4 rounded-lg border border-slate-800 mb-6 w-full max-w-md text-left text-xs font-mono">
                         <div class="text-slate-500 mb-1">Raw Manifest Preview:</div>
                         <div class="text-slate-300 break-all whitespace-pre-wrap line-clamp-6">
                             ${stream.rawManifest ? stream.rawManifest.slice(0, 500) : 'No content'}
                         </div>
                    </div>

                    <button 
                        @click=${handleRemove}
                        class="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow-lg transition-all flex items-center gap-2"
                    >
                        ${icons.trash} Remove Stream
                    </button>
                </div>
            `,
            container
        );
        return;
    }

    const template = html`
        <div
            class="inset-0 flex flex-col gap-6 p-4 sm:p-6 animate-fadeIn custom-scrollbar pb-20"
        >
            <!-- Top Section: Identity & Security -->
            ${heroHeaderTemplate(vm)}

            <!-- Stats Section: Full Width -->
            ${quickStatsTemplate(vm)}

            <!-- Main Content Grid -->
            <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <!-- Left Column: Visualizations -->
                <div class="xl:col-span-2 flex flex-col gap-6">
                    <!-- Bitrate Ladder Chart -->
                    <div
                        class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 shadow-sm hover:border-slate-600 transition-colors"
                    >
                        <div class="flex items-center justify-between mb-4">
                            <h3
                                class="text-lg font-bold text-white flex items-center gap-2"
                            >
                                ${icons.trendingUp} ABR Ladder
                            </h3>
                            <span
                                class="text-xs font-mono text-slate-400 bg-slate-900/50 px-2 py-1 rounded"
                            >
                                ${vm.videoTracks.length} Variants
                            </span>
                        </div>
                        ${bitrateLadderTemplate(vm)}
                    </div>

                    <!-- Feature Matrix -->
                    <div
                        class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 shadow-sm hover:border-slate-600 transition-colors"
                    >
                        <div class="flex items-center justify-between mb-4">
                            <h3
                                class="text-lg font-bold text-white flex items-center gap-2"
                            >
                                ${icons.features} Capabilities
                            </h3>
                        </div>
                        ${featureGridTemplate(vm)}
                    </div>
                </div>

                <!-- Right Column: Compliance & Health -->
                <div class="flex flex-col gap-6">
                    ${complianceWidgetTemplate(stream)}
                    ${cmafWidgetTemplate(vm.cmafData)}
                </div>
            </div>

            <!-- Bottom Section: Detailed Tracks -->
            <div
                class="bg-slate-800/50 rounded-xl border border-slate-700/50 shadow-sm overflow-hidden"
            >
                ${tracksPanelTemplate(vm)}
            </div>
        </div>
    `;

    render(template, container);
}

export const summaryView = {
    mount(containerElement) {
        container = containerElement;
        if (analysisUnsubscribe) analysisUnsubscribe();
        analysisUnsubscribe = useAnalysisStore.subscribe(renderSummary);
        renderSummary();
    },
    unmount() {
        if (analysisUnsubscribe) analysisUnsubscribe();
        analysisUnsubscribe = null;
        if (container) render(html``, container);
        container = null;
    },
};