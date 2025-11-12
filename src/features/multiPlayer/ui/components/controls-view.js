import { html, render } from 'lit-html';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import './global-controls.js';
import './player-roster.js';
import './playback-controls.js';
import '@/ui/components/labeled-control';

class ControlsViewComponent extends HTMLElement {
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
        const { players } = useMultiPlayerStore.getState();
        const allLangs = new Set();
        for (const player of players.values()) {
            player.audioTracks.forEach((track) => allLangs.add(track.language));
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
            globalBandwidthCap: state.globalBandwidthCap,
            globalMaxHeight: state.globalMaxHeight,
            availableAudioLangs: this.getAvailableAudioLangs(),
        };

        const template = html`
            <div class="space-y-6">
                <global-controls
                    .state=${globalControlsState}
                ></global-controls>
                <player-roster></player-roster>
                <playback-controls
                    selected-count=${selectedCount}
                ></playback-controls>
            </div>
        `;
        render(template, this);
    }
}

if (!customElements.get('controls-view-component')) {
    customElements.define('controls-view-component', ControlsViewComponent);
}