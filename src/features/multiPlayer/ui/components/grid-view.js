import { html, render } from 'lit-html';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { createMultiPlayerGridViewModel } from '../view-model.js';
import { multiPlayerService } from '../../application/multiPlayerService.js';
import './player-card.js';
import './event-log.js';

export class GridViewComponent extends HTMLElement {
    constructor() {
        super();
        this.unsubscribe = null;
    }

    connectedCallback() {
        this.render();
        this.unsubscribe = useMultiPlayerStore.subscribe(() => this.render());
    }

    disconnectedCallback() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }

    render() {
        const { players } = useMultiPlayerStore.getState();

        // --- NEW INITIALIZATION LOGIC ---
        // The component is now responsible for triggering the creation of player instances
        // if they exist in the store but not yet in the service.
        for (const playerState of players.values()) {
            if (!multiPlayerService.players.has(playerState.streamId)) {
                // This creates the video element and queues the player creation.
                multiPlayerService.createVideoElement(playerState.streamId);
                multiPlayerService.createAndLoadPlayer(playerState);
            }
        }
        // --- END ---

        const viewModel = createMultiPlayerGridViewModel(players);

        const template = html`
            <div
                id="player-grid-container"
                class="grow overflow-y-auto grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4 content-start h-full p-1"
            >
                ${viewModel.map(
                    (cardViewModel) =>
                        html`<player-card-component
                            stream-id=${cardViewModel.streamId}
                            .viewModel=${cardViewModel}
                        ></player-card-component>`
                )}
            </div>
        `;
        render(template, this);
    }
}