import { html, render } from 'lit-html';
import { useUiStore, uiActions } from '@/state/uiStore';
import { GraphsViewComponent } from './graphs-view.js';
import { ControlsViewComponent } from './controls-view.js';
import { EventLogComponent } from './event-log.js';

if (!customElements.get('graphs-view-component'))
    customElements.define('graphs-view-component', GraphsViewComponent);
if (!customElements.get('controls-view-component'))
    customElements.define('controls-view-component', ControlsViewComponent);
if (!customElements.get('event-log-component'))
    customElements.define('event-log-component', EventLogComponent);

export class SidebarShellComponent extends HTMLElement {
    constructor() {
        super();
        this.unsubscribe = null;
    }

    connectedCallback() {
        this.render();
        this.unsubscribe = useUiStore.subscribe(() => this.render());
    }

    disconnectedCallback() {
        if (this.unsubscribe) this.unsubscribe();
    }

    render() {
        const { multiPlayerActiveTab } = useUiStore.getState();

        const tabButton = (label, key) => html`
            <button
                @click=${() => uiActions.setMultiPlayerActiveTab(key)}
                class="px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${multiPlayerActiveTab ===
                key
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-900/50 text-slate-400 hover:bg-slate-700/50'}"
            >
                ${label}
            </button>
        `;

        let viewContent;
        switch (multiPlayerActiveTab) {
            case 'graphs':
                viewContent = html`<graphs-view-component></graphs-view-component>`;
                break;
            case 'event-log':
            default:
                viewContent = html`<event-log-component></event-log-component>`;
                break;
        }

        const template = html`
            <div class="flex flex-col h-full">
                <div
                    class="shrink-0 border-b border-slate-700 flex space-x-2 px-2 pt-2 sticky top-0 bg-slate-800/80 backdrop-blur-sm z-10"
                >
                    ${tabButton('Event Log', 'event-log')}
                    ${tabButton('Graphs', 'graphs')}
                </div>
                <div class="grow p-4 overflow-y-auto min-h-0">
                    ${viewContent}
                </div>
            </div>
        `;
        render(template, this);
    }
}