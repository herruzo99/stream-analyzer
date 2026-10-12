import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { diffViewerTemplate } from './components/diff-viewer.js';
import { hlsDeltaVisualizerTemplate } from './components/hls-delta-visualizer.js';
import { metricsHeaderTemplate } from './components/metrics-header.js';
import { updateFeedTemplate } from './components/update-feed.js';
import { createManifestUpdatesViewModel } from './view-model.js';

class ManifestUpdatesView {
    // Port note: was `extends BaseView` (never committed); container and
    // subscribe() tracking are inlined for the 1.2.0 mount/unmount shape.
    // setShellConfig/setMainPadding had no 1.2.0 equivalent (dropped).
    constructor() {
        this.isStickToLive = true;
        this._unsubs = [];
        this.container = null;
        this.stream = null;
        this.boundHandleKeyDown = this.handleGlobalKeyDown.bind(this);
        this.currentStreamId = null;
    }

    // =========================================================================
    // LIFECYCLE
    // =========================================================================

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
        this.onUnmount();
        for (const unsubscribe of this._unsubs.splice(0)) {
            try {
                unsubscribe();
            } catch {
                /* ignore late unsubscribe errors */
            }
        }
        if (this.container) render(html``, this.container);
        this.container = null;
        this.stream = null;
    }

    onMount() {
        this.currentStreamId = this.stream ? this.stream.id : null;
        this.isStickToLive = true;

        this.subscribe(useAnalysisStore, () => this.render());
        document.addEventListener('keydown', this.boundHandleKeyDown);

        this.render();
    }

    onUnmount() {
        document.removeEventListener('keydown', this.boundHandleKeyDown);
        this.currentStreamId = null;
    }

    // =========================================================================
    // LOGIC
    // =========================================================================

    handleGlobalKeyDown(e) {
        if (!['ArrowUp', 'ArrowDown'].includes(e.key)) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        // Use fresh state
        const { streams } = useAnalysisStore.getState();
        const stream = streams.find((s) => s.id === this.currentStreamId);

        if (!stream || !stream.manifestUpdates || stream.manifestUpdates.length === 0) return;

        const vm = createManifestUpdatesViewModel(stream);
        const updates = vm.updates;
        if (updates.length === 0) return;

        const activeId = vm.activeUpdate?.id;
        const currentIndex = updates.findIndex((u) => u.id === activeId);

        let newIndex = currentIndex;

        if (e.key === 'ArrowUp') {
            if (currentIndex > 0) newIndex = currentIndex - 1;
        } else if (e.key === 'ArrowDown') {
            if (currentIndex < updates.length - 1) newIndex = currentIndex + 1;
        }

        if (newIndex !== currentIndex) {
            e.preventDefault();
            this.isStickToLive = false;
            analysisActions.setActiveManifestUpdate(stream.id, updates[newIndex].id);
            this.render();
        }
    }

    toggleSticky() {
        this.isStickToLive = !this.isStickToLive;
        this.render();
    }

    handleUpdateSelect(updateId) {
        this.isStickToLive = false;
        analysisActions.setActiveManifestUpdate(this.currentStreamId, updateId);
        this.render();
    }

    // =========================================================================
    // RENDERING
    // =========================================================================

    render() {
        if (!this.container || this.currentStreamId === null) return;

        const stream = useAnalysisStore.getState().streams.find((s) => s.id === this.currentStreamId);
        if (!stream) {
            render(
                html`<div class="p-8 text-center text-slate-400">Stream not found.</div>`,
                this.container
            );
            return;
        }

        const vm = createManifestUpdatesViewModel(stream);

        // Sticky Logic
        if (this.isStickToLive && vm.updates.length > 0) {
            const latestId = vm.updates[0].id;
            if (stream.activeManifestUpdateId !== latestId) {
                setTimeout(() => analysisActions.setActiveManifestUpdate(stream.id, latestId), 0);
            }
        }

        const showHlsViz = stream.protocol === 'hls' && vm.activeUpdate?.serializedManifest;

        // 1. Update feed panel (in-flow left column; 1.2.0 has no shell slots)
        const feedPanel = html`
            <div class="h-full flex flex-col overflow-hidden bg-white/5"
                 style=" border-radius: 0.75rem; backdrop-filter: blur(12px); box-shadow: 0 8px 30px rgb(0 0 0 / 0.35);">
                <!-- Lock Controls -->
                 <div class="pt-6 px-4 pb-2 border-b border-white/10 bg-white/5 shrink-0">
                    <button @click=${() => this.toggleSticky()}
                        class="w-full flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${this.isStickToLive ? 'bg-emerald-500/10 text-white ' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'}">
                        ${this.isStickToLive ? icons.lockClosed : icons.lockOpen}
                        ${this.isStickToLive ? 'Following Live' : 'History Mode'}
                    </button>
                    <div class="mt-2 text-center hidden lg:block">
                        <span class="text-[9px] text-slate-400 opacity-50">
                            Use <kbd class="font-sans bg-white/5 px-1 rounded border border-white/10">↑/↓</kbd> to navigate
                        </span>
                    </div>
                </div>

                <!-- Feed List -->
                <div class="grow min-h-0">
                    ${updateFeedTemplate(vm.updates, vm.activeUpdate?.id, stream.id, (id) => this.handleUpdateSelect(id))}
                </div>
            </div>
        `;

        // 2. Metrics header (in-flow, above the diff)
        const metricsPanel = metricsHeaderTemplate(vm);

        // 3. Main Content (feed + metrics composed in-flow)
        const template = html`
            <div class="flex h-full w-full relative overflow-hidden" style="gap: 0.75rem">
                <div class="w-80 shrink-0 min-h-0 hidden lg:block overflow-hidden">
                    ${feedPanel}
                </div>
                <div class="grow flex flex-col min-h-0 min-w-0" style="gap: 0.75rem">
                    ${metricsPanel}
                <!-- Diff Viewer -->
                <div class="grow min-h-0 relative rounded-md overflow-hidden">
                    ${diffViewerTemplate(vm.activeUpdate, stream.protocol)}
                </div>

                <!-- HLS Delta Visualization -->
                ${showHlsViz ? html`
                      <div class="h-48 shrink-0 rounded-md overflow-hidden">
                          ${hlsDeltaVisualizerTemplate(vm.activeUpdate)}
                      </div>
                  ` : ''}
                </div>
            </div>
        `;

        render(template, this.container);
    }
}

export const manifestUpdatesView = new ManifestUpdatesView();
