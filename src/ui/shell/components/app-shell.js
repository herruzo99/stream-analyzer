import { html, render } from 'lit-html';
import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import { sidebarNavTemplate, getNavGroups } from './sidebar-nav.js';
import { renderContextSwitcher } from './context-switcher.js';
import { globalControlsTemplate } from './global-controls.js';
import { mainContentControlsTemplate } from './main-content-controls.js';

import { startLiveSegmentHighlighter } from '@/features/segmentExplorer/ui/components/hls/index';

let dom;

const handleTabClick = (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const targetTab = /** @type {HTMLElement} */ (target.closest('[data-tab]'));
    if (!targetTab) return;

    e.preventDefault();
    const tabKey = targetTab.dataset.tab;
    const { activeTab } = useUiStore.getState();

    if (activeTab === tabKey) {
        uiActions.setActiveSidebar(null);
        return;
    }

    uiActions.setActiveTab(tabKey);
    uiActions.setActiveSidebar(null);
};

export function renderAppShell(domContext) {
    dom = domContext;
    const { activeStreamId } = useAnalysisStore.getState();
    const { activeTab, activeSidebar } = useUiStore.getState();
    const activeStream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === activeStreamId);

    if (dom.sidebarNav && !dom.sidebarNav.dataset.listenerAttached) {
        dom.sidebarNav.addEventListener('click', handleTabClick);
        dom.sidebarNav.dataset.listenerAttached = 'true';
    }

    if (
        dom.sidebarToggleBtn &&
        !dom.sidebarToggleBtn.dataset.listenerAttached
    ) {
        dom.sidebarToggleBtn.addEventListener('click', () =>
            uiActions.setActiveSidebar('primary')
        );
        dom.sidebarOverlay.addEventListener('click', () =>
            uiActions.setActiveSidebar(null)
        );
        dom.sidebarToggleBtn.dataset.listenerAttached = 'true';
    }

    if (dom.mobilePageTitle) {
        const navGroups = getNavGroups();
        const allNavItems = navGroups.flatMap((g) =>
            g.items.flatMap((i) => (i.type === 'submenu' ? i.items : i))
        );
        const currentTab = allNavItems.find((item) => item.key === activeTab);
        dom.mobilePageTitle.textContent = currentTab ? currentTab.label : '';
        dom.mobileHeader.classList.toggle('hidden', !activeStream);
    }

    document.body.classList.toggle(
        'primary-sidebar-open',
        activeSidebar === 'primary'
    );
    document.body.classList.toggle(
        'contextual-sidebar-open',
        activeSidebar === 'contextual'
    );

    render(sidebarNavTemplate(), dom.sidebarNav);
    render(globalControlsTemplate(), dom.sidebarFooter);
    render(renderContextSwitcher(), dom.sidebarContextSwitchers);
    render(mainContentControlsTemplate(), dom.contextHeader);

    if (
        activeStream &&
        activeStream.manifest.type === 'dynamic' &&
        activeStream.protocol === 'hls' &&
        activeTab === 'explorer'
    ) {
        startLiveSegmentHighlighter(dom.mainContent, activeStream);
    }
}

export const appShellTemplate = () => html`
    <header
        id="mobile-header"
        class="hidden xl:hidden shrink-0 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 p-3 flex items-center justify-between gap-4 fixed top-0 left-0 right-0 z-20"
    >
        <button
            id="sidebar-toggle-btn"
            class="text-gray-300 hover:text-white p-1"
        >
            <i data-lucide="menu" class="h-6 w-6"></i>
        </button>
        <h2 id="mobile-page-title" class="text-lg font-bold text-white"></h2>
        <div class="w-7"></div>
    </header>
    <div
        id="app-root-inner"
        class="h-screen xl:grid xl:grid-cols-[auto_1fr_auto]"
    >
        <div
            id="sidebar-overlay"
            class="fixed inset-0 bg-black/50 z-30 hidden xl:hidden"
        ></div>
        <aside
            id="sidebar-container"
            class="bg-gray-900 border-r border-gray-800 flex flex-col fixed xl:relative top-0 left-0 bottom-0 z-40 w-72 xl:w-72 -translate-x-full xl:translate-x-0 transition-transform duration-300 ease-in-out"
        >
            <header class="p-3">
                <h2 class="text-xl font-bold text-white mb-4 px-2">
                    Stream Analyzer
                </h2>
                <div
                    id="sidebar-context-switchers"
                    class="space-y-2 px-2"
                ></div>
            </header>
            <nav
                id="sidebar-nav"
                class="flex flex-col grow overflow-y-auto p-3"
            ></nav>
            <footer id="sidebar-footer" class="shrink-0 p-3 space-y-4"></footer>
        </aside>
        <div id="app-shell" class="h-full flex flex-col min-h-0">
            <div
                id="main-content-wrapper"
                class="flex flex-col overflow-y-auto grow pt-[60px] xl:pt-0"
            >
                <header
                    id="main-header"
                    class="shrink-0 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 p-3 flex items-center justify-between gap-4"
                >
                    <div
                        id="context-header"
                        class="flex items-center gap-2 sm:gap-4 flex-wrap justify-start w-full"
                    ></div>
                </header>
                <main id="content-area" class="grow flex flex-col relative">
                    <div
                        id="tab-view-container"
                        class="grow flex flex-col p-4 sm:p-6"
                    ></div>
                    <div
                        id="persistent-player-container"
                        class="grow flex flex-col hidden"
                    ></div>
                </main>
            </div>
        </div>
        <aside
            id="contextual-sidebar"
            class="bg-gray-800/80 backdrop-blur-sm border-l border-gray-700/50 fixed xl:relative top-0 right-0 bottom-0 z-40 w-96 max-w-[90vw] translate-x-full xl:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col min-h-0"
        ></aside>
    </div>
`;