import { html, render } from 'lit-html';
import { createIcons, icons } from 'lucide';
import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import { sidebarNavTemplate, getNavGroups } from './sidebar-nav.js';
import { renderContextSwitcher } from './context-switcher.js';
import { globalControlsTemplate } from './global-controls.js';
import { mainContentControlsTemplate } from './main-content-controls.js';
import { startLiveSegmentHighlighter } from '@/features/segmentExplorer/ui/components/hls/index';

class AppShellComponent extends HTMLElement {
    constructor() {
        super();
        this.dom = {};
    }

    connectedCallback() {
        this.render();
    }

    disconnectedCallback() {
        this.removeEventListeners();
    }

    removeEventListeners() {
        if (this.dom.sidebarNav) {
            this.dom.sidebarNav.removeEventListener(
                'click',
                this.handleTabClick
            );
        }
        if (this.dom.sidebarToggleBtn) {
            this.dom.sidebarToggleBtn.removeEventListener(
                'click',
                this.handleSidebarToggle
            );
            this.dom.sidebarOverlay.removeEventListener(
                'click',
                this.handleOverlayClick
            );
        }
    }

    handleTabClick(e) {
        const target = /** @type {HTMLElement} */ (e.target);
        const targetTab = /** @type {HTMLElement} */ (
            target.closest('[data-tab]')
        );
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
    }

    handleSidebarToggle() {
        uiActions.setActiveSidebar('primary');
    }

    handleOverlayClick() {
        uiActions.setActiveSidebar(null);
    }

    render() {
        const appShellTemplate = html`
            <header
                id="mobile-header"
                class="hidden xl:hidden shrink-0 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 p-3 flex items-center justify-between gap-4 fixed top-0 left-0 right-0 z-20"
            >
                <button
                    id="sidebar-toggle-btn"
                    class="text-slate-300 hover:text-white p-1"
                >
                    <i data-lucide="menu" class="h-6 w-6"></i>
                </button>
                <h2
                    id="mobile-page-title"
                    class="text-lg font-bold text-white"
                ></h2>
                <div class="w-7"></div>
            </header>
            <div
                id="app-root-inner"
                class="h-screen xl:grid xl:grid-cols-[18rem_1fr_auto]"
            >
                <div
                    id="sidebar-overlay"
                    class="fixed inset-0 bg-black/50 z-30 hidden xl:hidden"
                ></div>
                <aside
                    id="sidebar-container"
                    class="bg-slate-950 border-r border-slate-800 flex flex-col fixed xl:relative top-0 left-0 bottom-0 z-40 w-72 -translate-x-full xl:translate-x-0 transition-transform duration-300 ease-in-out flex-shrink-0"
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
                    <footer
                        id="sidebar-footer"
                        class="shrink-0 p-3 space-y-4"
                    ></footer>
                </aside>
                <div
                    id="app-shell"
                    class="h-full flex flex-col min-h-0 bg-slate-900"
                >
                    <div
                        id="main-content-wrapper"
                        class="flex flex-col overflow-y-auto grow pt-[60px] xl:pt-0"
                    >
                        <header
                            id="main-header"
                            class="shrink-0 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 p-3 flex items-center justify-between gap-4"
                        >
                            <div
                                id="context-header"
                                class="flex items-center gap-2 sm:gap-4 flex-wrap justify-start w-full"
                            ></div>
                        </header>
                        <main class="grow flex flex-col relative bg-slate-900 ">
                            <div
                                id="tab-view-container"
                                class="grow flex flex-col p-4 sm:p-6"
                            ></div>
                            <div
                                id="persistent-player-container"
                                class="grow flex flex-col hidden p-4 sm:p-6"
                            ></div>
                        </main>
                    </div>
                </div>
                <aside
                    id="contextual-sidebar"
                    class="bg-slate-800 border-l border-slate-700/50 fixed xl:relative top-0 right-0 bottom-0 z-40 w-96 max-w-[90vw] translate-x-full xl:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col min-h-0"
                ></aside>
            </div>
        `;
        render(appShellTemplate, this);

        // After render, query for DOM elements within the component's scope
        this.dom = {
            mainContent: this.querySelector('#tab-view-container'),
            sidebarNav: this.querySelector('#sidebar-nav'),
            sidebarFooter: this.querySelector('#sidebar-footer'),
            sidebarContextSwitchers: this.querySelector(
                '#sidebar-context-switchers'
            ),
            contextHeader: this.querySelector('#context-header'),
            mobileHeader: this.querySelector('#mobile-header'),
            sidebarOverlay: this.querySelector('#sidebar-overlay'),
            sidebarToggleBtn: this.querySelector('#sidebar-toggle-btn'),
            mobilePageTitle: this.querySelector('#mobile-page-title'),
        };

        this.updateDOM();
    }

    updateDOM() {
        const { activeStreamId } = useAnalysisStore.getState();
        const { activeTab, activeSidebar } = useUiStore.getState();
        const activeStream = useAnalysisStore
            .getState()
            .streams.find((s) => s.id === activeStreamId);

        this.removeEventListeners();
        if (this.dom.sidebarNav)
            this.dom.sidebarNav.addEventListener('click', this.handleTabClick);
        if (this.dom.sidebarToggleBtn) {
            this.dom.sidebarToggleBtn.addEventListener(
                'click',
                this.handleSidebarToggle
            );
            this.dom.sidebarOverlay.addEventListener(
                'click',
                this.handleOverlayClick
            );
        }

        if (this.dom.mobilePageTitle) {
            const navGroups = getNavGroups();
            const allNavItems = navGroups.flatMap((g) =>
                g.items.flatMap((i) => (i.type === 'submenu' ? i.items : i))
            );
            const currentTab = allNavItems.find(
                (item) => item.key === activeTab
            );
            this.dom.mobilePageTitle.textContent = currentTab
                ? currentTab.label
                : '';
        }
        this.dom.mobileHeader?.classList.toggle('hidden', !activeStream);

        document.body.classList.toggle(
            'primary-sidebar-open',
            activeSidebar === 'primary'
        );
        document.body.classList.toggle(
            'contextual-sidebar-open',
            activeSidebar === 'contextual'
        );

        render(sidebarNavTemplate(), this.dom.sidebarNav);
        render(globalControlsTemplate(), this.dom.sidebarFooter);
        render(renderContextSwitcher(), this.dom.sidebarContextSwitchers);
        render(mainContentControlsTemplate(), this.dom.contextHeader);

        if (
            activeStream &&
            activeStream.manifest.type === 'dynamic' &&
            activeStream.protocol === 'hls' &&
            activeTab === 'explorer'
        ) {
            startLiveSegmentHighlighter(this.dom.mainContent, activeStream);
        }
        createIcons({ icons });
    }
}

customElements.define('app-shell-component', AppShellComponent);
