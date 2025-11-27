import { useAnalysisStore } from '@/state/analysisStore';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { bitrateLadderTemplate } from './components/bitrate-ladder.js';
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

    if (!stream || !stream.manifest || !stream.manifest.summary) {
        render(
            html`
                <div
                    class="flex flex-col items-center justify-center h-full text-slate-500 animate-fadeIn"
                >
                    <div class="bg-slate-800 p-6 rounded-full mb-4 shadow-lg">
                        ${icons.search}
                    </div>
                    <p class="text-lg font-medium text-slate-300">
                        No stream analysis available.
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

    // Changed: Removed 'scrollbar-hide' to ensure scrolling is possible on all devices
    // Added: 'custom-scrollbar' for styling consistency
    const template = html`
        <div
            class="flex flex-col gap-6 h-full overflow-y-auto p-4 sm:p-6 animate-fadeIn custom-scrollbar pb-20"
        >
            <!-- Top Section: Identity & Security -->
            ${heroHeaderTemplate(vm)}

            <!-- Middle Section: Stats & Compliance -->
            <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <!-- Left: Key Metrics -->
                <div class="xl:col-span-2">${quickStatsTemplate(vm)}</div>
                <!-- Right: Compliance Scorecard -->
                <div class="h-full min-h-[200px]">
                    ${complianceWidgetTemplate(stream)}
                </div>
            </div>

            <!-- Visualization Section: Ladder & Features -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
