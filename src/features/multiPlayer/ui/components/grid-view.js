import { html, render } from 'lit-html';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { createMultiPlayerGridViewModel } from '../view-model.js';
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
