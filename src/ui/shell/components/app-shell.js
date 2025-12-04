import '@/features/streamInput/ui/components/library-modal.js';
import { useAnalysisStore } from '@/state/analysisStore';
import { usePlayerStore } from '@/state/playerStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { renderContextSwitcher } from './context-switcher.js';
import { globalControlsTemplate } from './global-controls.js';
import { mainContentControlsTemplate } from './main-content-controls.js';
import { sidebarNavTemplate } from './sidebar-nav.js';

class AppShellComponent extends HTMLElement {
    connectedCallback() {
        this.render();
        this.uiUnsubscribe = useUiStore.subscribe(() => this.updateDOM());
        this.analysisUnsubscribe = useAnalysisStore.subscribe(() =>
            this.updateDOM()
        );
        this.playerUnsubscribe = usePlayerStore.subscribe(() =>
            this.updateDOM()
        );
    }

    disconnectedCallback() {
        if (this.uiUnsubscribe) this.uiUnsubscribe();
        if (this.analysisUnsubscribe) this.analysisUnsubscribe();
        if (this.playerUnsubscribe) this.playerUnsubscribe();
    }

    updateDOM() {
        const { activeSidebar } = useUiStore.getState();
        const isPrimaryOpen = activeSidebar === 'primary';
        const isContextualOpen = activeSidebar === 'contextual';

        const sidebarContainer = this.querySelector('#sidebar-container');
        const sidebarOverlay = this.querySelector('#sidebar-overlay');

        if (sidebarContainer) {
            if (isPrimaryOpen) {
                sidebarContainer.classList.remove('-translate-x-full');
                sidebarContainer.classList.add('translate-x-0');
            } else {
                sidebarContainer.classList.add('-translate-x-full');
                sidebarContainer.classList.remove('translate-x-0');
            }
        }

        if (sidebarOverlay) {
            if (isPrimaryOpen) {
                sidebarOverlay.classList.remove('hidden');
                sidebarOverlay.classList.add('block', 'animate-fadeIn');
            } else {
                sidebarOverlay.classList.add('hidden');
                sidebarOverlay.classList.remove('block', 'animate-fadeIn');
            }
        }

        const contextSidebar = this.querySelector('#contextual-sidebar');
        if (contextSidebar) {
            if (isContextualOpen) {
                contextSidebar.classList.remove('translate-x-full');
                contextSidebar.classList.add('translate-x-0');
                document.body.classList.add('contextual-sidebar-open');
            } else {
                contextSidebar.classList.add('translate-x-full');
                contextSidebar.classList.remove('translate-x-0');
                document.body.classList.remove('contextual-sidebar-open');
            }
        }

        if (sidebarContainer) {
            const headerContainer = sidebarContainer.querySelector(
                '#stream-identity-header'
            );
            if (headerContainer) {
                render(
                    renderContextSwitcher(),
                    /** @type {HTMLElement} */ (headerContainer)
                );
            }

            const navContainer = sidebarContainer.querySelector('#sidebar-nav');
            if (navContainer) {
                render(
                    sidebarNavTemplate(),
                    /** @type {HTMLElement} */ (navContainer)
                );
            }

            const footerContainer =
                sidebarContainer.querySelector('#sidebar-footer');
            if (footerContainer) {
                render(
                    globalControlsTemplate(),
                    /** @type {HTMLElement} */ (footerContainer)
                );
            }
        }

        const contextHeader = this.querySelector('#context-header');
        if (contextHeader) {
            render(
                mainContentControlsTemplate(),
                /** @type {HTMLElement} */ (contextHeader)
            );
        }
    }

    render() {
        const template = html`
            <div
                id="app-root-inner"
                class="h-[100dvh] w-full max-w-[100vw] xl:grid xl:grid-cols-[var(--sidebar-width)_minmax(0,1fr)_auto] xl:grid-rows-[1fr] overflow-hidden bg-slate-950 fixed inset-0"
            >
                <!-- Mobile Overlay -->
                <div
                    id="sidebar-overlay"
                    class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] hidden xl:hidden"
                    @click=${() => uiActions.setActiveSidebar(null)}
                ></div>

                <!-- Sidebar -->
                <!-- Added overflow-hidden to enforce flex boundaries and prevent footer push-out -->
                <aside
                    id="sidebar-container"
                    class="glass-panel flex flex-col fixed xl:relative top-0 left-0 bottom-0 z-[70] w-[var(--sidebar-width)] -translate-x-full xl:translate-x-0 transition-transform duration-300 ease-out shadow-2xl xl:shadow-none h-full max-h-full overflow-hidden"
                >
                    <div
                        id="stream-identity-header"
                        class="shrink-0 z-10 relative"
                    ></div>

                    <!-- Nav area: grow to fill space, min-h-0 to allow shrinking/scrolling -->
                    <nav
                        id="sidebar-nav"
                        class="flex flex-col grow min-h-0 overflow-y-auto scrollbar-hide pt-2 relative z-0"
                    ></nav>

                    <!-- Footer: shrink-0 to prevent compression, z-10 to sit above if needed -->
                    <footer
                        id="sidebar-footer"
                        class="shrink-0 z-10 relative"
                    ></footer>
                </aside>

                <!-- Main Content Area -->
                <div
                    class="flex flex-col min-h-0 bg-slate-900 relative w-full max-w-full h-full"
                >
                    <!-- Mobile Header -->
                    <header
                        class="xl:hidden shrink-0 bg-slate-900/90 border-b border-slate-800 p-3 flex items-center justify-between gap-4 z-20"
                    >
                        <button
                            @click=${() =>
                                uiActions.setActiveSidebar('primary')}
                            class="text-slate-300 p-2 -ml-2 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            ${icons.menu}
                        </button>
                        <span class="font-bold text-slate-200"
                            >Stream Analyzer</span
                        >
                        <div class="w-8"></div>
                    </header>

                    <!-- Desktop Header -->
                    <header
                        class="hidden xl:flex shrink-0 h-14 items-center justify-between px-6 border-b border-slate-800 bg-slate-900"
                    >
                        <div
                            id="context-header"
                            class="w-full flex items-center"
                        ></div>
                    </header>

                    <!-- View Container -->
                    <main
                        id="tab-view-container"
                        class="grow flex flex-col min-h-0 relative w-full max-w-full overflow-hidden h-full"
                    ></main>

                    <div
                        id="persistent-player-container"
                        class="hidden p-4"
                    ></div>
                </div>

                <!-- Contextual Sidebar -->
                <aside
                    id="contextual-sidebar"
                    class="bg-slate-900 border-l border-slate-800 fixed xl:relative top-0 right-0 bottom-0 z-40 w-96 translate-x-full xl:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col min-h-0 shadow-2xl xl:shadow-none h-full max-h-full"
                ></aside>

                <!-- Library Modal -->
                <library-modal-component></library-modal-component>
            </div>
        `;
        render(template, this);
    }
}

customElements.define('app-shell-component', AppShellComponent);
