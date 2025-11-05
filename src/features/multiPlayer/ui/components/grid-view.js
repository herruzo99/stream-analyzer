import { html, render } from 'lit-html';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import './player-card.js';

export class GridViewComponent extends HTMLElement {
    constructor() {
        super();
        this.unsubscribe = null;
        this.lastPlayerIds = [];
    }

    connectedCallback() {
        const listener = (state) => {
            // Only re-render if the list of players has changed.
            // This prevents re-rendering on every stats update.
            const playerIds = Array.from(state.players.keys());
            const hasChanged =
                playerIds.length !== this.lastPlayerIds.length ||
                playerIds.some((id, i) => id !== this.lastPlayerIds[i]);

            if (hasChanged) {
                this.lastPlayerIds = playerIds;
                this.renderComponent(playerIds);
            }
        };

        this.unsubscribe = useMultiPlayerStore.subscribe(listener);

        // Initial render
        listener(useMultiPlayerStore.getState());
    }

    disconnectedCallback() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }

    renderComponent(playerIds) {
        const template = html`
            <div
                id="player-grid-container"
                class="flex flex-wrap justify-center gap-4 content-start h-full"
            >
                ${playerIds.map(
                    (streamId) =>
                        html`<player-card-component
                            stream-id=${streamId}
                        ></player-card-component>`
                )}
            </div>
        `;
        render(template, this);
    }
}