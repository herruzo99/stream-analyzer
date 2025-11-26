import { html, render } from 'lit-html';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { eventBus } from '@/application/event-bus';
import './player-card.js';
import * as icons from '@/ui/icons';

class PlayerGridComponent extends HTMLElement {
    constructor() {
        super();
        this.unsubscribe = null;
    }

    connectedCallback() {
        this.render();
        this.unsubscribe = useMultiPlayerStore.subscribe(() => this.render());
    }

    disconnectedCallback() {
        if (this.unsubscribe) this.unsubscribe();
    }

    render() {
        const { players, gridColumns, layoutMode, focusedStreamId } =
            useMultiPlayerStore.getState();
        const playerIds = Array.from(players.keys());

        if (playerIds.length === 0) {
            render(
                html`
                    <div
                        class="flex flex-col items-center justify-center h-full text-slate-500 gap-4"
                    >
                        <div
                            class="p-6 bg-slate-900 rounded-full border border-slate-800 shadow-xl"
                        >
                            ${icons.grid}
                        </div>
                        <div class="text-center">
                            <p class="text-lg font-bold text-slate-300">
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

        // --- Focus Mode Logic ---
        if (
            layoutMode === 'focus' &&
            focusedStreamId !== null &&
            players.has(focusedStreamId)
        ) {
            const otherPlayerIds = playerIds.filter(
                (id) => id !== focusedStreamId
            );

            const handleSidebarClick = (id) => {
                eventBus.dispatch('ui:multi-player:set-focus', {
                    streamId: id,
                });
            };

            const template = html`
                <div class="h-full w-full bg-slate-950 flex overflow-hidden">
                    <!-- Main Stage -->
                    <div class="grow relative p-4 flex flex-col min-w-0">
                        <div
                            class="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-slate-800"
                        >
                            <player-card-component
                                stream-id="${focusedStreamId}"
                                class="h-full w-full block"
                            ></player-card-component>
                        </div>
                    </div>

                    <!-- Sidebar (Thumbnails) -->
                    ${otherPlayerIds.length > 0
                        ? html`
                              <div
                                  class="w-80 shrink-0 border-l border-slate-800 bg-slate-900/50 flex flex-col"
                              >
                                  <div
                                      class="p-3 border-b border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider"
                                  >
                                      Queue (${otherPlayerIds.length})
                                  </div>
                                  <div
                                      class="grow overflow-y-auto p-3 space-y-3 custom-scrollbar"
                                  >
                                      ${otherPlayerIds.map(
                                          (id) => html`
                                              <div
                                                  class="aspect-video relative rounded-lg overflow-hidden cursor-pointer hover:ring-2 ring-blue-500 transition-all group"
                                                  @click=${() =>
                                                      handleSidebarClick(id)}
                                              >
                                                  <!-- Overlay to block interaction in sidebar -->
                                                  <div
                                                      class="absolute inset-0 z-50 bg-transparent"
                                                  ></div>
                                                  <player-card-component
                                                      stream-id="${id}"
                                                      class="h-full w-full block pointer-events-none"
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

        // --- Grid Mode Logic ---
        let columnsStyle = 'repeat(auto-fill, minmax(400px, 1fr))';
        if (gridColumns !== 'auto') {
            columnsStyle = `repeat(${gridColumns}, 1fr)`;
        }

        const gridStyle = `
            display: grid;
            grid-template-columns: ${columnsStyle};
            grid-auto-rows: minmax(250px, 1fr);
            gap: 1rem;
            padding: 1rem;
            width: 100%;
        `;

        const template = html`
            <div
                class="h-full w-full overflow-y-auto custom-scrollbar bg-slate-950"
            >
                <div style="${gridStyle}">
                    ${playerIds.map(
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