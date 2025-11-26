import { html, render } from 'lit-html';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { useUiStore } from '@/state/uiStore';
import { createManifestUpdatesViewModel } from './view-model.js';
import { metricsHeaderTemplate } from './components/metrics-header.js';
import { updateFeedTemplate } from './components/update-feed.js';
import { diffViewerTemplate } from './components/diff-viewer.js';
import * as icons from '@/ui/icons';

let container = null;
let currentStreamId = null;
let unsubAnalysis = null;
let unsubUi = null;

// Auto-scroll state
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

    // Auto-Select Logic: If sticky mode is on, and we aren't looking at the latest, switch to latest
    if (isStickToLive && vm.updates.length > 0) {
        const latestId = vm.updates[0].id;
        if (stream.activeManifestUpdateId !== latestId) {
            // Defer to avoid render loop
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

    // Manual navigation breaks sticky mode
    const onManualSelect = (id) => {
        isStickToLive = id === vm.updates[0]?.id;
        analysisActions.setActiveManifestUpdate(stream.id, id);
    };

    // Overwrite the store action in the template context locally?
    // No, better to just let the feed handle clicks naturally and detect state change in next render?
    // Actually, passing a callback to the feed is cleaner.
    // For now, relying on the store update is fine, but we need to know when USER clicked vs AUTO.
    // We'll assume any store update that sets an ID that ISN'T the latest disables sticky.
    // Since we can't easily hook the store action, we'll add a "Live" button to the UI.

    const template = html`
        <div class="flex flex-col h-full bg-slate-950 overflow-hidden">
            ${metricsHeaderTemplate(vm)}

            <div class="flex grow min-h-0">
                <!-- Feed Sidebar -->
                <div
                    class="flex flex-col border-r border-slate-800 bg-slate-950 w-72 shrink-0"
                >
                    <!-- Stick to Live Button -->
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
                            stream.id
                        )}
                    </div>
                </div>

                <!-- Main Diff Area -->
                <div class="grow min-w-0 bg-slate-900 relative">
                    ${diffViewerTemplate(vm.activeUpdate, stream.protocol)}
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
        isStickToLive = true; // Default to live following

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
