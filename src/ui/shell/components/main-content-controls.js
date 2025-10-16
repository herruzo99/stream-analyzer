import { html } from 'lit-html';
import { useUiStore, uiActions } from '@/state/uiStore';
import * as icons from '@/ui/icons';

const contextualSidebarToggle = () => {
    const { activeTab } = useUiStore.getState();
    const visible =
        activeTab === 'compliance' || activeTab === 'parser-coverage';
    if (!visible) return html``;

    return html`
        <button
            @click=${() => uiActions.setActiveSidebar('contextual')}
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
