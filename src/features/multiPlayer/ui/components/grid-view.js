import { html, render } from 'lit-html';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { useUiStore } from '@/state/uiStore';
import { classMap } from 'lit-html/directives/class-map.js';
import './player-card.js';

class GridViewComponent extends HTMLElement {
    constructor() {
        super();
        this.unsubscribeMultiPlayer = null;
        this.unsubscribeUi = null;
        this.lastPlayerIds = [];
        this.lastViewMode = 'grid';
    }

    connectedCallback() {
        const listener = () => {
            const multiPlayerState = useMultiPlayerStore.getState();
            const uiState = useUiStore.getState();

            const playerIds = Array.from(multiPlayerState.players.keys());
            const viewMode = uiState.multiPlayerViewMode;

            const hasPlayerListChanged =
                playerIds.length !== this.lastPlayerIds.length ||
                playerIds.some((id, i) => id !== this.lastPlayerIds[i]);

            const hasViewModeChanged = viewMode !== this.lastViewMode;

            if (hasPlayerListChanged || hasViewModeChanged) {
                this.lastPlayerIds = playerIds;
                this.lastViewMode = viewMode;
                this.renderComponent(playerIds, viewMode);
            }
        };

        this.unsubscribeMultiPlayer = useMultiPlayerStore.subscribe(listener);
        this.unsubscribeUi = useUiStore.subscribe(listener);

        listener();
    }

    disconnectedCallback() {
        if (this.unsubscribeMultiPlayer) this.unsubscribeMultiPlayer();
        if (this.unsubscribeUi) this.unsubscribeUi();
    }

    renderComponent(playerIds, viewMode) {
        const isImmersive = viewMode === 'immersive';

        const gridClasses = {
            flex: !isImmersive,
            'flex-wrap': !isImmersive,
            'justify-center': !isImmersive,
            'gap-4': !isImmersive,
            'content-start': !isImmersive,
            'h-full': !isImmersive,
            grid: isImmersive,
            'gap-2': isImmersive,
            'w-full': isImmersive,
            'items-start': isImmersive, // Align items to the top of the grid cell
        };

        const gridStyle = isImmersive
            ? `grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));`
            : '';

        const template = html`
            <div
                id="player-grid-container"
                class=${classMap(gridClasses)}
                style=${gridStyle}
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

if (!customElements.get('grid-view-component')) {
    customElements.define('grid-view-component', GridViewComponent);
}
