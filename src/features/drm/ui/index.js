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

class DrmView {
    // Port note: was `extends BaseView` (never committed). Plain class
    // with inlined mount/unmount/subscribe; the subNav slot renders into
    // the shell's #contextual-sidebar as in 1.2.0 (setShellConfig and
    // setShellSlot have no 1.2.0 equivalent and were dropped).
    constructor() {
        this.hasContextualSidebar = true;
        this._unsubs = [];
        this.container = null;
        this.stream = null;
    }

    subscribe(store, listener) {
        const unsubscribe = store.subscribe(listener);
        this._unsubs.push(unsubscribe);
        return unsubscribe;
    }

    /**
     * @param {HTMLElement} containerElement
     * @param {{ stream?: any }} [args]
     */
    mount(containerElement, { stream } = {}) {
        this.container = containerElement;
        this.stream = stream || null;
        this.onMount();
    }

    unmount() {
        for (const unsubscribe of this._unsubs.splice(0)) {
            try {
                unsubscribe();
            } catch {
                /* ignore late unsubscribe errors */
            }
        }
        if (this.container) render(html``, this.container);
        const sidebarContainer =
            document.getElementById('contextual-sidebar');
        if (sidebarContainer) render(html``, sidebarContainer);
        this.container = null;
        this.stream = null;
    }

    onMount() {
        // Subscriptions
        this.subscribe(useDecryptionStore, () => this.render());
        this.subscribe(useNetworkStore, () => this.render());
        this.subscribe(usePlayerStore, () => this.render());
        this.subscribe(useAnalysisStore, () => this.render());
    }

    renderTemplate() {
        const vm = createDrmViewModel();
        const { streams, activeStreamId } = useAnalysisStore.getState();
        const activeStream = streams.find((s) => s.id === activeStreamId) ?? streams[0];
        const isEncrypted = activeStream?.manifest?.summary?.security?.isEncrypted;


        // 2. Main Content Logic
        const showEmptyState = vm.sessionList.length === 0;

        let mainContent;

        if (showEmptyState) {
            if (!isEncrypted) {
                mainContent = html`
                    <div
                        class="flex flex-col items-center justify-center h-full w-full text-slate-400"
                    >
                        <div
                            class="p-6 rounded-full bg-white/5 mb-4 border border-white/10 generic-monitor-icon"
                        >
                            ${icons.lockOpen}
                        </div>
                        <h3
                            class="text-xl font-bold text-slate-200"
                        >
                            Clear Content
                        </h3>
                        <p
                            class="text-sm mt-2 max-w-xs text-center text-slate-400"
                        >
                            No DRM signaling detected in the current stream manifest.
                        </p>
                    </div>
                `;
            } else {
                mainContent = html`
                    <div
                        class="flex flex-col items-center justify-center h-full w-full text-slate-400"
                    >
                        <div
                            class="p-6 rounded-full bg-white/5 mb-4 border border-white/10 glass-pulse"
                        >
                            ${icons.key}
                        </div>
                        <h3
                            class="text-xl font-bold text-slate-200"
                        >
                            Waiting for Key Session
                        </h3>
                        <p
                            class="text-sm mt-2 max-w-xs text-center text-slate-400"
                        >
                            Start playback in the Player Simulation tab to generate
                            DRM license requests.
                        </p>
                    </div>
                `;
            }
        } else {
            mainContent = sessionDetailTemplate(vm.activeSession, vm.timeline);
        }

        // Return the final template for the Main container
        return html`
            <div class="flex flex-col h-full w-full overflow-hidden">
                ${!showEmptyState || (showEmptyState && isEncrypted)
                ? playerActiveWarningTemplate('DRM Workbench')
                : ''}
                <div class="grow overflow-hidden relative">
                    ${mainContent}
                </div>
            </div>
        `;
    }

    render() {
        if (!this.container) return;
        render(this.renderTemplate(), this.container);
        const sidebarContainer =
            document.getElementById('contextual-sidebar');
        if (sidebarContainer) {
            const vm = createDrmViewModel();
            render(
                sessionListTemplate(
                    vm.sessionList,
                    vm.activeSession?.internalId
                ),
                sidebarContainer
            );
        }
    }
}

export const drmView = new DrmView();
