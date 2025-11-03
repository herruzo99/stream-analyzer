import { html } from 'lit-html';
import { useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';

const contextualSidebarToggle = () => {
    const { activeTab } = useUiStore.getState();
    const currentView = /** @type {any} */ (
        document.querySelector('app-shell-component')
    )?.viewMap?.[activeTab];
    const visible = currentView?.hasContextualSidebar;

    if (!visible) return html``;

    const handleToggle = () => {
        document.body.classList.add('contextual-sidebar-open');
    };

    return html`
        <button
            @click=${handleToggle}
            class="xl:hidden bg-gray-700/50 hover:bg-gray-600/50 text-white font-bold py-2 px-3 rounded-md transition duration-300 flex items-center text-sm"
            title="Toggle contextual sidebar"
        >
            ${icons.sidebar}
        </button>
    `;
};

export const mainContentControlsTemplate = () => {
    return html`
        <div class="grow"></div>
        <div class="flex items-center gap-4">${contextualSidebarToggle()}</div>
    `;
};
