import { useAnalysisStore } from '@/state/analysisStore';
import { useDecryptionStore } from '@/state/decryptionStore';
import { useNetworkStore } from '@/state/networkStore';
import { usePlayerStore } from '@/state/playerStore';
import { playerActiveWarningTemplate } from '@/ui/components/player-active-warning.js';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { sessionDetailTemplate } from './components/session-detail.js';
import { sessionListTemplate } from './components/session-list.js';
import { createDrmViewModel } from './view-model.js';

let container = null;
let unsubs = [];

function renderDrmView() {
    if (!container) return;

    const vm = createDrmViewModel();
    const { streams, activeStreamId } = useAnalysisStore.getState();
    const activeStream = streams.find((s) => s.id === activeStreamId);
    const isEncrypted = activeStream?.manifest?.summary?.security?.isEncrypted;

    // Logic: If no sessions AND stream is not encrypted, show clear content state.
    // If no sessions but encrypted, show waiting for playback state.
    const showEmptyState = vm.sessionList.length === 0;

    let emptyStateTemplate = html``;

    if (showEmptyState) {
        if (!isEncrypted) {
            emptyStateTemplate = html`
                <div
                    class="flex flex-col items-center justify-center h-full text-slate-500 bg-slate-950/50"
                >
                    <div
                        class="p-4 rounded-full bg-slate-800/50 mb-3 border border-slate-700"
                    >
                        ${icons.lockOpen}
                    </div>
                    <h3 class="text-lg font-medium text-slate-300">
                        Clear Content
                    </h3>
                    <p class="text-sm mt-1 max-w-xs text-center text-slate-500">
                        No DRM signaling detected in the current stream
                        manifest.
                    </p>
                </div>
            `;
        } else {
            emptyStateTemplate = html`
                <div
                    class="flex flex-col items-center justify-center h-full text-slate-500 bg-slate-950/50"
                >
                    <div
                        class="p-4 rounded-full bg-slate-800/50 mb-3 border border-slate-700"
                    >
                        ${icons.key}
                    </div>
                    <h3 class="text-lg font-medium text-slate-300">
                        Waiting for Key Session
                    </h3>
                    <p class="text-sm mt-1 max-w-xs text-center text-slate-500">
                        Start playback in the Player Simulation tab to generate
                        DRM license requests.
                    </p>
                </div>
            `;
        }
    }

    const template = html`
        <div class="flex flex-col h-full w-full overflow-hidden bg-slate-950">
            ${!showEmptyState || (showEmptyState && isEncrypted)
                ? playerActiveWarningTemplate('DRM Workbench')
                : ''}

            <div class="flex grow min-h-0 overflow-hidden">
                ${showEmptyState
                    ? emptyStateTemplate
                    : html`
                          <!-- Left Sidebar -->
                          ${sessionListTemplate(
                              vm.sessionList,
                              vm.activeSession?.internalId
                          )}

                          <!-- Main Content -->
                          <div class="grow min-w-0 h-full">
                              ${sessionDetailTemplate(
                                  vm.activeSession,
                                  vm.timeline
                              )}
                          </div>
                      `}
            </div>
        </div>
    `;

    render(template, container);
}

export const drmView = {
    mount(containerElement) {
        container = containerElement;
        unsubs.push(useDecryptionStore.subscribe(renderDrmView));
        unsubs.push(useNetworkStore.subscribe(renderDrmView));
        unsubs.push(usePlayerStore.subscribe(renderDrmView));
        unsubs.push(useAnalysisStore.subscribe(renderDrmView));
        renderDrmView();
    },
    unmount() {
        unsubs.forEach((u) => u());
        unsubs = [];
        if (container) render(html``, container);
        container = null;
    },
};
