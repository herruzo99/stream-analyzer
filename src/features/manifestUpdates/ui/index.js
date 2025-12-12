import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { diffViewerTemplate } from './components/diff-viewer.js';
import { hlsDeltaVisualizerTemplate } from './components/hls-delta-visualizer.js';
import { metricsHeaderTemplate } from './components/metrics-header.js';
import { updateFeedTemplate } from './components/update-feed.js';
import { createManifestUpdatesViewModel } from './view-model.js';

let container = null;
let currentStreamId = null;
let unsubAnalysis = null;
let unsubUi = null;

// Local state to manage "Sticky Live" behavior
let isStickToLive = true;

function renderView() {
    if (!container || currentStreamId === null) return;

    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === currentStreamId);
    if (!stream) {
        render(
            html`<div class="p-8 text-center text-slate-500">
                Stream not found.
            </div>`,
            container
        );
        return;
    }

    const vm = createManifestUpdatesViewModel(stream);

    // Sticky Logic: Only update active ID if stickiness is enabled
    if (isStickToLive && vm.updates.length > 0) {
        const latestId = vm.updates[0].id;
        if (stream.activeManifestUpdateId !== latestId) {
            // Use setTimeout to avoid render loops when dispatching from render
            setTimeout(
                () =>
                    analysisActions.setActiveManifestUpdate(
                        stream.id,
                        latestId
                    ),
                0
            );
        }
    }

    const toggleSticky = () => {
        isStickToLive = !isStickToLive;
        renderView();
    };

    // Callback when user manually selects an update from the feed
    const handleUpdateSelect = (updateId) => {
        isStickToLive = false; // Disable sticky mode to allow viewing history
        analysisActions.setActiveManifestUpdate(stream.id, updateId);
        renderView();
    };

    const showHlsViz =
        stream.protocol === 'hls' && vm.activeUpdate?.serializedManifest;

    const template = html`
        <div class="flex flex-col h-full bg-slate-950 overflow-hidden">
            ${metricsHeaderTemplate(vm)}

            <div class="flex grow min-h-0">
                <!-- Feed Sidebar -->
                <div
                    class="flex flex-col border-r border-slate-800 bg-slate-950 w-72 shrink-0"
                >
                    <div class="p-2 border-b border-slate-800 bg-slate-900/30">
                        <button
                            @click=${toggleSticky}
                            class="w-full flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${isStickToLive
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}"
                        >
                            ${isStickToLive ? icons.lockClosed : icons.lockOpen}
                            ${isStickToLive ? 'Following Live' : 'History Mode'}
                        </button>
                    </div>
                    <div class="grow min-h-0">
                        ${updateFeedTemplate(
                            vm.updates,
                            vm.activeUpdate?.id,
                            stream.id,
                            handleUpdateSelect // Pass handler
                        )}
                    </div>
                </div>

                <!-- Main Content Area -->
                <div
                    class="grow min-w-0 bg-slate-900 relative flex flex-col overflow-hidden"
                >
                    <!-- Diff Viewer (Takes available space) -->
                    <div class="grow min-h-0 relative">
                        ${diffViewerTemplate(vm.activeUpdate, stream.protocol)}
                    </div>

                    <!-- HLS Delta Visualization (Bottom Panel) -->
                    ${showHlsViz
                        ? html`
                              <div
                                  class="h-32 shrink-0 border-t border-slate-800"
                              >
                                  ${hlsDeltaVisualizerTemplate(vm.activeUpdate)}
                              </div>
                          `
                        : ''}
                </div>
            </div>
        </div>
    `;

    render(template, container);
}

export const manifestUpdatesView = {
    mount(el, { stream }) {
        container = el;
        currentStreamId = stream.id;
        isStickToLive = true;

        unsubAnalysis = useAnalysisStore.subscribe(renderView);
        unsubUi = useUiStore.subscribe(renderView);
        renderView();
    },
    unmount() {
        if (unsubAnalysis) unsubAnalysis();
        if (unsubUi) unsubUi();
        unsubAnalysis = null;
        unsubUi = null;
        if (container) render(html``, container);
        container = null;
        currentStreamId = null;
    },
};