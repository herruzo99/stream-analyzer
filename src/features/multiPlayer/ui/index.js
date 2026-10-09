import { html, render } from 'lit-html';
import { multiPlayerService } from '../application/multiPlayerService';

// Import Components
import './components/multi-player-bottom-panel.js';
import './components/player-grid.js';
import './components/event-log.js';

class MultiPlayerView {
    // Port note: was `extends BaseView` (never committed). Plain class
    // with inlined mount/unmount; the bottomBar/rightSidebar slots are
    // composed in-container (1.2.0 has no shell slots).
    constructor() {
        this.hasContextualSidebar = false;
        this._unsubs = [];
        this.container = null;
        this.stream = null;
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
        multiPlayerService.startStatsCollection();
        this.render();
    }

    onUnmount() {
        multiPlayerService.stopStatsCollection();
        multiPlayerService.destroyAll();
    }

    render() {
        if (!this.container) return;
        render(
            html`
            <div class="relative h-full w-full bg-slate-900 overflow-hidden flex flex-col">
                <div class="grow min-h-0 z-0 w-full relative flex min-h-0">
                    <div class="grow min-h-0 relative">
                        <player-grid-component></player-grid-component>
                    </div>
                    <div
                        class="w-80 shrink-0 border-l border-slate-800 overflow-y-auto hidden xl:block"
                    >
                        <event-log-component></event-log-component>
                    </div>
                </div>
                <div class="shrink-0 border-t border-slate-800 h-60 min-h-0">
                    <multi-player-bottom-panel
                        class="w-full h-full block"
                    ></multi-player-bottom-panel>
                </div>
            </div>
        `,
            this.container
        );
    }
}

export const multiPlayerView = new MultiPlayerView();
