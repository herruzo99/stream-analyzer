import { html, render } from 'lit-html';
import { eventBus } from '@/application/event-bus';
import './player-control-card.js';

const playerRosterTemplate = ({ players }) => {
    const playersArray = Array.from(players.values());
    const isAllSelected =
        playersArray.length > 0 &&
        playersArray.every((p) => p.selectedForAction);

    const groupedPlayers = playersArray.reduce((acc, player) => {
        const key = player.sourceStreamId;
        if (!acc[key]) acc[key] = [];
        acc[key].push(player);
        return acc;
    }, {});

    const handleToggleAll = () => {
        if (isAllSelected) {
            eventBus.dispatch('ui:multi-player:deselect-all');
        } else {
            eventBus.dispatch('ui:multi-player:select-all');
        }
    };

    return html`
        <div class="space-y-3">
            <h4 class="text-md font-bold text-gray-300">Player Roster</h4>
            <div class="flex items-center">
                <input
                    type="checkbox"
                    id="select-all-toggle"
                    .checked=${isAllSelected}
                    @change=${handleToggleAll}
                    class="rounded bg-gray-600 border-gray-500 text-blue-500 focus:ring-blue-600 h-5 w-5"
                />
                <label
                    for="select-all-toggle"
                    class="ml-2 text-sm text-gray-400"
                    >Select/Deselect All</label
                >
            </div>
            <div class="space-y-2">
                ${Object.values(groupedPlayers).map((group) =>
                    group.map(
                        (p) => html`
                            <player-control-card
                                .player=${p}
                                .isLastInGroup=${group.length <= 1}
                            ></player-control-card>
                        `
                    )
                )}
            </div>
        </div>
    `;
};

export class PlayerRosterComponent extends HTMLElement {
    constructor() {
        super();
        this._players = new Map();
    }

    set players(newPlayers) {
        if (this._players === newPlayers) return;
        // Expects an array of [key, value] entries
        this._players = new Map(newPlayers);
        this.render();
    }

    get players() {
        return this._players;
    }

    connectedCallback() {
        this.render();
    }

    render() {
        render(playerRosterTemplate({ players: this._players }), this);
    }
}

customElements.define('player-roster', PlayerRosterComponent);
