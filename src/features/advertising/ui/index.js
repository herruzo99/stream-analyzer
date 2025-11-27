import { statCardTemplate } from '@/features/summary/ui/components/shared';
import { useAnalysisStore } from '@/state/analysisStore';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { adTimelineTemplate } from './components/ad-timeline.js';
import { breakCardTemplate } from './components/break-card.js';
import { inspectorTemplate } from './components/inspector.js';
import { createAdvertisingViewModel } from './view-model.js';

let container = null;
let unsubscribe = null;
let selectedAvailId = null;

function renderView() {
    if (!container) return;

    const { streams, activeStreamId } = useAnalysisStore.getState();
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

    const vm = createAdvertisingViewModel(stream);

    // Auto-select first avail if none selected and avails exist
    if (!selectedAvailId && vm.avails.length > 0) {
        // selectedAvailId = vm.avails[0].id; // Optional: Auto-select first
    }

    const selectedAvail =
        vm.avails.find((a) => a.id === selectedAvailId) || null;

    const handleSelect = (avail) => {
        selectedAvailId = avail.id;
        renderView();
    };

    const template = html`
        <div
            class="flex flex-col h-full bg-slate-950 text-slate-200 overflow-hidden"
        >
            <!-- Dashboard Header (Stats) -->
            <div
                class="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6 border-b border-slate-800 bg-slate-900/50 shrink-0"
            >
                ${statCardTemplate({
                    label: 'Total Breaks',
                    value: vm.stats.totalAvails,
                    icon: icons.layers,
                })}
                ${statCardTemplate({
                    label: 'Ad Load',
                    value: `${vm.stats.adLoad}%`,
                    icon: icons.percent,
                    tooltip: 'Percentage of total duration occupied by ads.',
                })}
                ${statCardTemplate({
                    label: 'Total Duration',
                    value: `${vm.stats.totalAdDuration}s`,
                    icon: icons.clock,
                })}
                ${statCardTemplate({
                    label: 'SCTE-35 Signals',
                    value:
                        (vm.stats.detectionCounts['SCTE35_INBAND'] || 0) +
                        (vm.stats.detectionCounts['SCTE35_DATERANGE'] || 0),
                    icon: icons.binary,
                })}
            </div>

            <div class="flex grow min-h-0 relative">
                <!-- Left Column: Timeline & Feed -->
                <div
                    class="flex-1 flex flex-col min-w-0 border-r border-slate-800"
                >
                    <!-- Timeline Area -->
                    <div class="p-6 pb-0 shrink-0">
                        <h3
                            class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4"
                        >
                            Timeline
                        </h3>
                        ${adTimelineTemplate(
                            vm.avails,
                            vm.duration,
                            handleSelect,
                            selectedAvailId
                        )}
                    </div>

                    <!-- Feed Area -->
                    <div class="p-6 pt-2 grow overflow-y-auto custom-scrollbar">
                        <h3
                            class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 sticky top-0 bg-slate-950 py-2 z-10"
                        >
                            Break Chronology
                        </h3>

                        ${vm.avails.length === 0
                            ? html`
                                  <div
                                      class="flex flex-col items-center justify-center py-12 text-slate-600 border-2 border-dashed border-slate-800 rounded-xl"
                                  >
                                      <div class="scale-150 mb-4">
                                          ${icons.ghost}
                                      </div>
                                      <p>No Ad Breaks Detected</p>
                                  </div>
                              `
                            : html`
                                  <div class="space-y-3">
                                      ${vm.avails.map((avail) =>
                                          breakCardTemplate(
                                              avail,
                                              avail.id === selectedAvailId,
                                              handleSelect
                                          )
                                      )}
                                  </div>
                              `}
                    </div>
                </div>

                <!-- Right Column: Inspector Panel -->
                <!-- Fixed width on desktop, slides over on mobile (not implemented here for brevity) -->
                <div
                    class="w-[400px] xl:w-[500px] shrink-0 bg-slate-900 h-full relative z-20"
                >
                    ${inspectorTemplate(selectedAvail)}
                </div>
            </div>
        </div>
    `;

    render(template, container);
}

export const advertisingView = {
    mount(containerElement) {
        container = containerElement;
        if (unsubscribe) unsubscribe();
        unsubscribe = useAnalysisStore.subscribe(renderView);
        renderView();
    },
    unmount() {
        if (unsubscribe) unsubscribe();
        unsubscribe = null;
        if (container) render(html``, container);
        container = null;
    },
};
