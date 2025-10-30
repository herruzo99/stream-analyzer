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
        const { players, activeLayout } = useMultiPlayerStore.getState();

        // Orchestrate player creation if they exist in state but not in the service
        for (const playerState of players.values()) {
            if (!multiPlayerService.players.has(playerState.streamId)) {
                multiPlayerService.createVideoElement(playerState.streamId);
                multiPlayerService.createAndLoadPlayer(playerState);
            }
        }

        const { cards: viewModel } = createMultiPlayerGridViewModel(players);

        const layoutClasses = {
            auto: 'grid-cols-[repeat(auto-fill,minmax(320px,1fr))]',
            'grid-2': 'grid-cols-1 md:grid-cols-2',
            'grid-1': 'grid-cols-1',
        };

        const template = html`
            <div
                id="player-grid-container"
                class="grow overflow-y-auto grid ${layoutClasses[
                    activeLayout
                ]} gap-4 content-start h-full p-1"
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
