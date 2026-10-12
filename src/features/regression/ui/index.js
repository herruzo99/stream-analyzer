import { useAnalysisStore } from '@/state/analysisStore';
import { useTestSuiteStore } from '@/state/testSuiteStore';
import { html, render } from 'lit-html';
import { testRunnerTemplate } from './components/test-runner.js';
import { suiteLibrarySidebarTemplate } from './components/suite-library-sidebar.js';
import { suiteHeaderTemplate } from './components/suite-header.js';
import './components/test-suite-manager.js';

class RegressionView {
    // Port note: was `extends BaseView` (never committed). Plain class
    // with inlined mount/unmount/subscribe; slots composed in-container
    // (no shell slots in 1.2.0).
    constructor() {
        this.hasContextualSidebar = false;
        this._unsubs = [];
        this._sidebarPanel = null;
        this._headerPanel = null;
        this.container = null;
        this.stream = null;
    }

    onMount() {
        // Subscribe to stores
        // We need AnalysisStore for the current stream
        this.subscribe(useAnalysisStore, () => {
            this.updateShell();
            this.render();
        });

        // We need TestSuiteStore for the suites data
        this.subscribe(useTestSuiteStore, () => {
            this.updateShell();
            this.render();
        });

        // BaseView handles generic UI store changes safely (filtering out shell updates).
        // We do NOT need to subscribe manually here, as it causes infinite recursion 
        // if we update shell in render().

        // Set up the Shell Layout initially
        this.updateShell();
        this.render();
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

    onUnmount() {
        // Subscriptions release in unmount().
    }

    updateShell() {
        const { streams, activeStreamId } = useAnalysisStore.getState();
        const stream = streams.find((s) => s.id === activeStreamId) ?? streams[0];

        // 1. Sidebar panel + 2. header panel, composed in-container below.
        this._sidebarPanel = suiteLibrarySidebarTemplate();
        this._headerPanel = suiteHeaderTemplate(stream);
        // (Port: no shell padding helper in 1.2.0; layout uses in-flow spacing.)
    }

    renderWithStream(stream) {
        // The Main Slot Content
        // We wrapp it in a div that fills height for the internal scroll
        return html`
            <div class="h-full w-full">
                ${testRunnerTemplate(stream)}
            </div>
        `;
    }

    render() {
        if (!this.container) return;

        const { streams, activeStreamId } = useAnalysisStore.getState();
        const stream = streams.find((s) => s.id === activeStreamId) ?? streams[0];
        // Refresh panels every render (cheap templates; avoids stale
        // sidebar/header after store updates outside subscriptions).
        if (stream?.manifest) this.updateShell();

        // Re-inject shell slots on render to ensure reactivity
        // (Optimization: modify components to handle their own reactivity internally, 
        // but for now re-rendering the template is fine as lit-html is efficient)
        // this.updateShell(); // REMOVED to prevent infinite recursion loop/side effects. Handled in subscriptions.

        if (!stream || !stream.manifest) {
            render(
                html`
                    <div class="flex flex-col items-center justify-center h-full p-8 text-center">
                        <p class="text-[15px] font-medium text-slate-200 mb-1">
                            No stream loaded.
                        </p>
                        <p class="mono text-[11px] text-slate-600">
                            Analyze a manifest to run regression suites here.
                        </p>
                    </div>
                `,
                this.container
            );
            return;
        }

        render(
            html`
            <div class="flex flex-col h-full w-full overflow-hidden bg-[#06090f]">
                ${this._headerPanel
                    ? html`<div class="shrink-0 px-4 pt-3">${this._headerPanel}</div>`
                    : ''}
                <div class="grow min-h-0 flex overflow-hidden">
                    ${this._sidebarPanel
                        ? html`<div
                              class="w-72 shrink-0 border-r border-white/5 overflow-y-auto custom-scrollbar hidden md:block"
                          >
                              ${this._sidebarPanel}
                          </div>`
                        : ''}
                    <div class="grow min-h-0 overflow-hidden">
                        ${this.renderWithStream(stream)}
                    </div>
                </div>
            </div>
        `,
            this.container
        );
    }
}

export const regressionView = new RegressionView();
