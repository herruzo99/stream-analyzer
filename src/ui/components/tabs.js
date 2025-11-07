import { html } from 'lit-html';

export const tabButton = (label, key, activeKey, clickHandler) => {
    const isActive = activeKey === key;
    return html`
        <button
            @click=${() => clickHandler(key)}
            class="px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${isActive
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}"
        >
            ${label}
        </button>
    `;
};

const connectedTabButton = (tab, activeKey, clickHandler) => {
    const { key, label, indicator } = tab;
    const isActive = activeKey === key;
    return html`
        <button
            @click=${() => clickHandler(key)}
            class="py-2 px-3 text-sm font-semibold rounded-t-md transition-colors border-t border-l border-r flex items-center gap-2 shrink-0 ${isActive
                ? 'bg-slate-900 border-slate-700 text-white -mb-px border-b-slate-900'
                : 'bg-slate-800/50 border-transparent text-slate-300 hover:bg-slate-700/50 hover:border-slate-700/50'}"
        >
            <span>${label}</span>
            ${indicator || ''}
        </button>
    `;
};

export const tabBar = (tabs, activeKey, clickHandler) => {
    return html`
        <div class="flex items-center gap-2 flex-wrap">
            ${tabs.map((tab) =>
                tabButton(
                    html`${tab.label}
                    ${tab.count !== undefined ? `(${tab.count})` : ''}`,
                    tab.key,
                    activeKey,
                    clickHandler
                )
            )}
        </div>
    `;
};

export const connectedTabBar = (tabs, activeKey, clickHandler) => {
    return html`
        <div class="overflow-x-auto scrollbar-hide">
            <nav class="flex space-x-2 border-b border-slate-700 flex-nowrap">
                ${tabs.map((tab) =>
                    connectedTabButton(tab, activeKey, clickHandler)
                )}
            </nav>
        </div>
    `;
};
