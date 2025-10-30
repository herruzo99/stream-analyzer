import { html, render } from 'lit-html';
import { eventBus } from '@/application/event-bus';
import * as icons from '@/ui/icons';

const sessionManagementTemplate = () => {
    const buttonClasses = `
        bg-gray-700/50 hover:bg-gray-600/50 text-white font-bold
        p-2 rounded-md transition-colors flex-1 flex items-center
        justify-center text-sm
    `;

    return html`
        <div
            class="bg-gray-800 p-3 rounded-lg border border-gray-700 space-y-3"
        >
            <h4 class="text-md font-bold text-gray-300">Session Management</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                    @click=${() =>
                        eventBus.dispatch('ui:multi-player:reset-all')}
                    class="${buttonClasses} !bg-blue-600/80 hover:!bg-blue-700/80"
                >
                    ${icons.sync} Reset All Players
                </button>
                <button
                    @click=${() =>
                        eventBus.dispatch('ui:multi-player:clear-all')}
                    class="${buttonClasses} !bg-red-600/80 hover:!bg-red-700/80"
                >
                    ${icons.xCircle} Clear Duplicates
                </button>
            </div>
        </div>
    `;
};

export class SessionManagementComponent extends HTMLElement {
    connectedCallback() {
        this.render();
    }

    render() {
        render(sessionManagementTemplate(), this);
    }
}

customElements.define('session-management', SessionManagementComponent);
