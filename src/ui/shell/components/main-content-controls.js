import { html } from 'lit-html';
import { useUiStore, uiActions } from '@/state/uiStore';

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
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
            >
                <path
                    d="M11 3a1 1 0 100 2h6a1 1 0 100-2h-6zM11 7a1 1 0 00-1 1v2a1 1 0 102 0V8a1 1 0 00-1-1zM11 13a1 1 0 00-1 1v2a1 1 0 102 0v-2a1 1 0 00-1-1zM4 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1z"
                />
            </svg>
        </button>
    `;
};

export const mainContentControlsTemplate = () => {
    return html`
        <div class="grow"></div>
        <div class="flex items-center gap-4">${contextualSidebarToggle()}</div>
    `;
};
