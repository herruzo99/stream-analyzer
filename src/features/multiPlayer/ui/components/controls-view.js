import { html, render } from 'lit-html';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { multiPlayerService } from '../../application/multiPlayerService';
import './global-controls.js';
import './player-roster.js';
import './playback-controls.js';
import './session-management.js';

export class ControlsViewComponent extends HTMLElement {
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

    getAvailableAudioLangs() {
        const allLangs = new Set();
        for (const player of multiPlayerService.players.values()) {
            player.getAudioLanguages().forEach((lang) => allLangs.add(lang));
        }
        return Array.from(allLangs).sort();
    }

    render() {
        const state = useMultiPlayerStore.getState();
        const selectedCount = Array.from(state.players.values()).filter(
            (p) => p.selectedForAction
        ).length;

        const globalControlsState = {
            globalAbrEnabled: state.globalAbrEnabled,
            globalMaxHeight: state.globalMaxHeight,
            globalBufferingGoal: state.globalBufferingGoal,
            globalBandwidthCap: state.globalBandwidthCap,
            availableAudioLangs: this.getAvailableAudioLangs(),
        };

        const template = html`
            <div class="space-y-4 p-1">
                <h3 class="text-xl font-bold text-white">
                    Multi-Player Controls
                </h3>

                <global-controls
                    .state=${globalControlsState}
                ></global-controls>

                <player-roster .players=${Array.from(state.players.entries())}>
                </player-roster>

                <playback-controls
                    selected-count=${selectedCount}
                ></playback-controls>

                <session-management></session-management>
            </div>
        `;
        render(template, this);
    }
}
