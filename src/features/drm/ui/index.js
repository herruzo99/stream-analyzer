import { useDecryptionStore } from '@/state/decryptionStore';
import { useNetworkStore } from '@/state/networkStore';
import { usePlayerStore } from '@/state/playerStore'; // Listen to player state changes
import { playerActiveWarningTemplate } from '@/ui/components/player-active-warning.js';
import { html, render } from 'lit-html';
import { sessionDetailTemplate } from './components/session-detail.js';
import { sessionListTemplate } from './components/session-list.js';
import { createDrmViewModel } from './view-model.js';

let container = null;
let unsubs = [];

function renderDrmView() {
    if (!container) return;

    const vm = createDrmViewModel();

    const template = html`
        <div class="flex flex-col h-full w-full overflow-hidden bg-slate-950">
            ${playerActiveWarningTemplate('DRM Workbench')}

            <div class="flex grow min-h-0 overflow-hidden">
                <!-- Left Sidebar -->
                ${sessionListTemplate(
                    vm.sessionList,
                    vm.activeSession?.internalId
                )}

                <!-- Main Content -->
                <div class="grow min-w-0 h-full">
                    ${sessionDetailTemplate(vm.activeSession, vm.timeline)}
                </div>
            </div>
        </div>
    `;

    render(template, container);
}

export const drmView = {
    mount(containerElement) {
        container = containerElement;
        // Subscribe to stores
        unsubs.push(useDecryptionStore.subscribe(renderDrmView));
        unsubs.push(useNetworkStore.subscribe(renderDrmView));
        unsubs.push(usePlayerStore.subscribe(renderDrmView)); // Subscribe to player updates
        renderDrmView();
    },
    unmount() {
        unsubs.forEach((u) => u());
        unsubs = [];
        if (container) render(html``, container);
        container = null;
    },
};
