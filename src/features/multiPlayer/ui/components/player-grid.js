import { eventBus } from '@/application/event-bus';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import './player-card.js';

class PlayerGridComponent extends HTMLElement {
    constructor() {
        super();
        this.unsubscribeMultiPlayer = null;
    }

    connectedCallback() {
        // Simply re-render on any store update.
        // Lit-html handles DOM diffing efficiently, so this is safe and robust.
        this.unsubscribeMultiPlayer = useMultiPlayerStore.subscribe(() =>
            this.render()
        );
        this.render();
    }

    disconnectedCallback() {
        if (this.unsubscribeMultiPlayer) this.unsubscribeMultiPlayer();
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

            const renderSidebarItem = (id) => {
                const p = players.get(id);
                if (!p) return '';
                return html`
                    <div
                        class="p-3 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-blue-500/50 cursor-pointer transition-all group"
                        @click=${() => handleSidebarClick(id)}
                    >
                        <div class="flex justify-between items-start mb-2">
                            <span
                                class="text-xs font-bold text-slate-200 truncate max-w-[180px]"
                                >${p.streamName}</span
                            >
                            <div
                                class="w-2 h-2 rounded-full ${p.state ===
                                'playing'
                                    ? 'bg-green-500'
                                    : 'bg-slate-500'}"
                            ></div>
                        </div>
                        <div
                            class="text-[10px] font-mono text-slate-500 truncate"
                        >
                            ${p.stats?.playbackQuality?.resolution || 'Init...'}
                        </div>
                    </div>
                `;
            };

            const template = html`
                <div
                    class="h-full w-full bg-slate-950 flex overflow-hidden animate-fadeIn"
                >
                    <!-- Main Stage -->
                    <div class="grow relative p-4 flex flex-col min-w-0">
                        <div
                            class="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-black"
                        >
                            <player-card-component
                                stream-id="${focusedStreamId}"
                                class="h-full w-full block"
                            ></player-card-component>
                        </div>
                    </div>

                    <!-- Sidebar (List View) -->
                    ${otherPlayerIds.length > 0
                        ? html`
                              <div
                                  class="w-64 shrink-0 border-l border-slate-800 bg-slate-900/50 flex flex-col"
                              >
                                  <div
                                      class="p-3 border-b border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider"
                                  >
                                      Queue (${otherPlayerIds.length})
                                  </div>
                                  <div
                                      class="grow overflow-y-auto p-3 space-y-3 custom-scrollbar"
                                  >
                                      ${otherPlayerIds.map(renderSidebarItem)}
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
                class="h-full w-full overflow-y-auto custom-scrollbar bg-slate-950 animate-fadeIn"
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
