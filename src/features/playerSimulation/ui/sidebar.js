import { html, render } from 'lit-html';
import { usePlayerStore, playerActions } from '@/state/playerStore';
import { connectedTabBar } from '@/ui/components/tabs';
import { statsCardsTemplate } from './components/stats-cards.js';
import { eventLogTemplate } from './components/event-log.js';
import { playerService } from '../application/playerService.js';
import * as icons from '@/ui/icons';

export class PlayerSidebarComponent extends HTMLElement {
    constructor() {
        super();
        this.unsubscribe = null;
    }

    connectedCallback() {
        this.render();
        this.unsubscribe = usePlayerStore.subscribe(() => this.render());
    }

    disconnectedCallback() {
        if (this.unsubscribe) this.unsubscribe();
    }

    render() {
        const { activeTab, currentStats, eventLog, hasUnreadLogs, isLoaded } =
            usePlayerStore.getState();

        const logTabLabel = html`
            <div class="relative">
                <span>Log</span>
                ${hasUnreadLogs && activeTab !== 'log'
                    ? html`<span
                          class="absolute -top-1 -right-2.5 flex h-2 w-2"
                      >
                          <span
                              class="relative inline-flex rounded-full h-2 w-2 bg-blue-400"
                          ></span>
                      </span>`
                    : ''}
            </div>
        `;

        const tabs = [
            { key: 'stats', label: 'Stats' },
            { key: 'log', label: logTabLabel },
        ];

        let content;
        switch (activeTab) {
            case 'stats':
                content = html`<div class="h-full">
                    ${statsCardsTemplate(currentStats)}
                </div>`;
                break;
            case 'log':
            default:
                content = html`<div>${eventLogTemplate(eventLog)}</div>`;
                break;
        }

        const sessionControls = html`
            <div class="p-4 border-t border-slate-700">
                <h4
                    class="font-bold text-slate-400 text-xs uppercase tracking-wider mb-2"
                >
                    Session Control
                </h4>
                <button
                    @click=${() => playerService.destroy()}
                    ?disabled=${!isLoaded}
                    class="w-full bg-red-800 hover:bg-red-700 text-red-100 font-bold py-2 px-3 rounded-md transition-colors flex items-center justify-center gap-2 disabled:bg-slate-600 disabled:opacity-50"
                >
                    ${icons.xCircle} Stop & Reset Player
                </button>
            </div>
        `;

        const template = html`
            <div class="flex flex-col h-full">
                <div class="shrink-0 px-2 pt-2">
                    ${connectedTabBar(
                        tabs,
                        activeTab,
                        playerActions.setActiveTab
                    )}
                </div>
                <div
                    class="grow overflow-y-auto bg-slate-900 rounded-b-lg min-h-0 p-4"
                >
                    ${content}
                </div>
                ${sessionControls}
            </div>
        `;
        render(template, this);
    }
}

customElements.define('player-sidebar', PlayerSidebarComponent);