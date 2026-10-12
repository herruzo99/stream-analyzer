import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { repeat } from 'lit-html/directives/repeat.js';
import './player-card.js';

class PlayerGridComponent extends HTMLElement {
    constructor() {
        super();
        this.unsubscribeMultiPlayer = null;
        this.unsubscribeUi = null;
    }

    connectedCallback() {
        const listener = () => this.render();
        this.unsubscribeMultiPlayer = useMultiPlayerStore.subscribe(listener);
        this.unsubscribeUi = useUiStore.subscribe(listener);
        this.render();
    }

    disconnectedCallback() {
        if (this.unsubscribeMultiPlayer) this.unsubscribeMultiPlayer();
        if (this.unsubscribeUi) this.unsubscribeUi();
    }

    render() {
        const { players, gridColumns, layoutMode, focusedStreamId } =
            useMultiPlayerStore.getState();
        const playerIds = Array.from(players.keys());

        if (playerIds.length === 0) {
            render(
                html`
                    <div
                        class="flex flex-col items-center justify-center h-full text-slate-400 gap-4"
                    >
                        <div
                            class="p-6 bg-white/5 rounded-full border border-white/10"
                        >
                            ${icons.grid}
                        </div>
                        <div class="text-center">
                            <p
                                class="text-lg font-bold text-slate-100"
                            >
                                Multi-View Empty
                            </p>
                            <p class="text-sm mt-1">
                                Add streams from the Analysis tab or Library.
                            </p>
                        </div>
                    </div>
                `,
                this
            );
            return;
        }

        const isFocusMode =
            layoutMode === 'focus' &&
            focusedStreamId !== null &&
            players.has(focusedStreamId);

        // Dynamic Grid Layout Configuration
        let containerStyle = '';

        if (isFocusMode) {
            // Focus Layout: Main area takes remaining space, sidebar is fixed width
            containerStyle = `
                display: grid;
                grid-template-columns: 1fr 320px;
                grid-template-rows: 100%;
                gap: 0.75rem;
                padding: 0.75rem;
                height: 100%;
                overflow: hidden;
            `;
        } else {
            // Standard Grid Layout
            let columnsStyle = 'repeat(auto-fill, minmax(400px, 1fr))';
            if (gridColumns !== 'auto') {
                columnsStyle = `repeat(${gridColumns}, 1fr)`;
            }

            containerStyle = `
                display: grid;
                grid-template-columns: ${columnsStyle};
                grid-auto-rows: max-content; 
                gap: 0.75rem;
                padding: 0.75rem;
                height: 100%;
                overflow-y: auto;
            `;
        }

        // SPLIT LAYOUT LOGIC

        if (isFocusMode) {
            const otherPlayerIds = playerIds.filter(
                (id) => id !== focusedStreamId
            );

            const template = html`
                <div
                    class="h-full w-full bg-white/5 flex overflow-hidden"
                >
                    <!-- Main Stage -->
                    <div class="grow relative flex flex-col min-w-0" style="padding: 0.75rem">
                        <div
                            class="relative w-full h-full rounded-md overflow-hidden border bg-white/5"
                        >
                            <!-- Force height 100% and reset aspect ratio for the focused player -->
                            <player-card-component
                                stream-id="${focusedStreamId}"
                                class="h-full w-full block"
                                style="height: 100%; aspect-ratio: auto;"
                            ></player-card-component>
                        </div>
                    </div>

                    <!-- Sidebar (List View) -->
                    ${otherPlayerIds.length > 0
                    ? html`
                              <div
                                  class="w-80 shrink-0 border-l border-white/10 bg-white/5 flex flex-col"
                              >
                                  <div
                                      class="p-3 border-b border-white/10 text-xs font-bold text-slate-400 r flex justify-between"
                                  >
                                      <span
                                          >Queue
                                          (${otherPlayerIds.length})</span
                                      >
                                  </div>
                                  <div
                                      class="grow overflow-y-auto p-3 space-y-3 custom-scrollbar"
                                  >
                                      ${repeat(
                        otherPlayerIds,
                        (id) => id,
                        (id) => html`
                                              <div class="w-full">
                                                  <player-card-component
                                                      stream-id="${id}"
                                                  ></player-card-component>
                                              </div>
                                          `
                    )}
                                  </div>
                              </div>
                          `
                    : ''}
                </div>
            `;
            render(template, this);
            return;
        }

        // Grid Mode Template
        const template = html`
            <div
                class="h-full w-full bg-white/5"
            >
                <div style="${containerStyle}" class="custom-scrollbar">
                    ${repeat(
            playerIds,
            (id) => id,
            (id) => html`
                            <player-card-component
                                stream-id="${id}"
                            ></player-card-component>
                        `
        )}
                </div>
            </div>
        `;

        render(template, this);
    }
}

customElements.define('player-grid-component', PlayerGridComponent);
