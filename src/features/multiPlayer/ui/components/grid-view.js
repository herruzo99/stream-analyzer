import { html, render } from 'lit-html';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { createMultiPlayerGridViewModel } from '../view-model.js';
import { multiPlayerService } from '../../application/multiPlayerService.js';
import './player-card.js';

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

        // Orchestrate player creation if they exist in state but not in the service
        for (const playerState of players.values()) {
            if (!multiPlayerService.players.has(playerState.streamId)) {
                multiPlayerService.createVideoElement(playerState.streamId);
                multiPlayerService.createAndLoadPlayer(playerState);
            }
        }

        const { cards: viewModel } = createMultiPlayerGridViewModel(players);

        const template = html`
            <div
                id="player-grid-container"
                class="flex flex-wrap justify-center gap-4 content-start h-full"
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