import { html, render } from 'lit-html';
import { usePlayerStore } from '@/state/playerStore';
import './player-controls.js';

export class PlayerDashboardComponent extends HTMLElement {
    constructor() {
        super();
        this.unsubscribe = null;
    }

    connectedCallback() {
        this.render();
        // No subscription needed if it only contains static controls
    }

    disconnectedCallback() {
        // No unsubscription needed
    }

    render() {
        const template = html`
            <div class="flex flex-col h-full">
                <div
                    class="grow overflow-y-auto bg-slate-900 rounded-lg min-h-0 p-4"
                >
                    <player-controls-component></player-controls-component>
                </div>
            </div>
        `;
        render(template, this);
    }
}

customElements.define('player-dashboard', PlayerDashboardComponent);
