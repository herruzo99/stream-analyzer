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
        const {
            activeTab,
            currentStats,
            eventLog,
            hasUnreadLogs,
            isLoaded,
            isAutoResetEnabled,
        } = usePlayerStore.getState();

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
            <div
                class="p-4 border-t border-slate-700 space-y-3 shrink-0 bg-slate-800 rounded-b-lg"
            >
                <h4
                    class="font-bold text-slate-400 text-xs uppercase tracking-wider"
                >
                    Session Control
                </h4>
                <div class="flex items-center justify-between">
                    <label
                        for="auto-reset-toggle"
                        class="text-sm font-medium text-slate-300"
                        >Auto-reset on failure</label
                    >
                    <button
                        @click=${() => playerActions.toggleAutoReset()}
                        role="switch"
                        aria-checked="${isAutoResetEnabled}"
                        id="auto-reset-toggle"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isAutoResetEnabled
                            ? 'bg-blue-600'
                            : 'bg-slate-600'}"
                    >
                        <span
                            class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAutoResetEnabled
                                ? 'translate-x-6'
                                : 'translate-x-1'}"
                        ></span>
                    </button>
                </div>
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