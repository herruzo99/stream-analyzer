import { uiActions, useUiStore } from '@/state/uiStore';
import { html, render } from 'lit-html';
import './controls-view.js';
import './event-log.js';
import './graphs-view.js';

class SidebarShellComponent extends HTMLElement {
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
                class="px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-t-lg transition-all duration-200 border-t border-x ${multiPlayerActiveTab ===
                key
                    ? 'bg-slate-900 border-slate-700 text-white -mb-px'
                    : 'bg-slate-950 border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'}"
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

        // Changed: Container now uses 'overflow-hidden' instead of 'overflow-y-auto' to allow
        // child components to fully control their scrolling behavior.
        const template = html`
            <div
                class="flex flex-col h-full bg-slate-950 border-l border-slate-800"
            >
                <div
                    class="shrink-0 border-b border-slate-700 flex space-x-1 px-3 pt-3 bg-slate-950 z-10"
                >
                    ${tabButton('Event Log', 'event-log')}
                    ${tabButton('Graphs', 'graphs')}
                </div>
                <div
                    class="grow min-h-0 overflow-hidden relative p-0 bg-slate-900"
                >
                    ${viewContent}
                </div>
            </div>
        `;
        render(template, this);
    }
}

if (!customElements.get('sidebar-shell-component')) {
    customElements.define('sidebar-shell-component', SidebarShellComponent);
}
