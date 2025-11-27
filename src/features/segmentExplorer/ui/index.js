import { useAnalysisStore } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { explorerToolbarTemplate } from './components/explorer-toolbar.js';
import { segmentBottomPanelTemplate } from './components/segment-bottom-panel.js';
import { timelineGridTemplate } from './components/timeline-grid.js';
import { createSegmentExplorerViewModel } from './view-model.js';

let container = null;
let unsubs = [];

function renderExplorer() {
    if (!container) return;

    const { streams, activeStreamId } = useAnalysisStore.getState();
    const uiState = useUiStore.getState();
    const stream = streams.find((s) => s.id === activeStreamId);

    if (!stream) {
        render(
            html`
                <div
                    class="h-full flex flex-col items-center justify-center text-slate-500 bg-slate-950"
                >
                    <div
                        class="p-6 bg-slate-900 rounded-2xl shadow-xl border border-slate-800 mb-4 animate-pulse"
                    >
                        ${icons.search}
                    </div>
                    <p class="font-medium">No stream loaded.</p>
                </div>
            `,
            container
        );
        return;
    }

    // Use the singleton engine to process view model
    const viewModel = createSegmentExplorerViewModel(stream, uiState);

    const template = html`
        <div
            class="h-full flex flex-col relative bg-slate-950 overflow-hidden w-full"
        >
            ${explorerToolbarTemplate()}

            <div class="grow min-h-0 relative z-0 w-full">
                ${timelineGridTemplate(viewModel, stream)}
            </div>

            ${segmentBottomPanelTemplate(stream)}
        </div>
    `;

    render(template, container);
}

export const segmentExplorerView = {
    hasContextualSidebar: false,
    mount(containerElement) {
        container = containerElement;

        const scheduleRender = () => requestAnimationFrame(renderExplorer);

        unsubs.push(useAnalysisStore.subscribe(scheduleRender));
        unsubs.push(useUiStore.subscribe(scheduleRender));
        unsubs.push(useSegmentCacheStore.subscribe(scheduleRender));

        renderExplorer();
    },
    unmount() {
        unsubs.forEach((u) => u());
        unsubs = [];
        if (container) render(html``, container);
        container = null;
    },
};
