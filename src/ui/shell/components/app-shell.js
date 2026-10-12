import '@/features/streamInput/ui/components/library-modal.js';
import { useAnalysisStore } from '@/state/analysisStore';
import { usePlayerStore } from '@/state/playerStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { renderContextSwitcher } from './context-switcher.js';
import { globalControlsTemplate } from './global-controls.js';
import './sidebar-nav.js'; // Registers <sidebar-nav>

class AppShellComponent extends HTMLElement {
    constructor() {
        super();
        this.unsubs = [];
    }

    connectedCallback() {
        // Initial render of the shell structure
        this.render();

        // Subscribe to stores that affect the shell layout (sidebar toggles) AND sub-components
        this.unsubs.push(
            useUiStore.subscribe(() => {
                this.updateLayoutState();
                this.updateSubComponents();
            })
        );

        this.unsubs.push(
            useAnalysisStore.subscribe(() => this.updateSubComponents())
        );
        this.unsubs.push(
            usePlayerStore.subscribe(() => this.updateSubComponents())
        );

        // Trigger initial updates
        this.updateLayoutState();
        this.updateSubComponents();
    }

    disconnectedCallback() {
        this.unsubs.forEach((u) => u());
        this.unsubs = [];
    }

    // Handles CSS class toggling for sidebar visibility
    updateLayoutState() {
        const { activeSidebar, isGlobalNavCompact } = useUiStore.getState();
        const isPrimaryOpen = activeSidebar === 'primary';
        const isContextualOpen = activeSidebar === 'contextual';

        const root = this.querySelector('#app-root-inner');
        if (root) {
            // Compact rail gets a narrow grid track instead of a 280px
            // void with floating icons.
            root.classList.toggle('sidebar-compact', !!isGlobalNavCompact);
        }

        const sidebarContainer = this.querySelector('#sidebar-container');
        const sidebarOverlay = this.querySelector('#sidebar-overlay');
        const contextSidebar = this.querySelector('#contextual-sidebar');

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
                sidebarOverlay.classList.add('block');
            } else {
                sidebarOverlay.classList.add('hidden');
                sidebarOverlay.classList.remove('block');
            }
        }

        if (contextSidebar) {
            // `hidden` collapses the grid's auto track (no 384px ghost
            // column); translate handles the slide animation.
            if (isContextualOpen) {
                contextSidebar.classList.remove('hidden');
                contextSidebar.classList.add('flex');
                requestAnimationFrame(() => {
                    contextSidebar.classList.remove('translate-x-full');
                    contextSidebar.classList.add('translate-x-0');
                });
                document.body.classList.add('contextual-sidebar-open');
            } else {
                contextSidebar.classList.add('translate-x-full');
                contextSidebar.classList.remove('translate-x-0');
                document.body.classList.remove('contextual-sidebar-open');
                window.setTimeout(() => {
                    if (
                        useUiStore.getState().activeSidebar !== 'contextual'
                    ) {
                        contextSidebar.classList.add('hidden');
                        contextSidebar.classList.remove('flex');
                    }
                }, 300);
            }
        }
    }

    // Handles rendering of dynamic sub-components (Header, Footer)
    updateSubComponents() {
        // ARCHITECTURAL CHANGE: Context Switcher is now at the bottom (stream-context-container)
        const contextContainer = this.querySelector(
            '#stream-context-container'
        );
        if (contextContainer) {
            render(
                renderContextSwitcher(),
                /** @type {HTMLElement} */ (contextContainer)
            );
        }

        const footerContainer = this.querySelector('#sidebar-footer');
        if (footerContainer) {
            render(
                globalControlsTemplate(),
                /** @type {HTMLElement} */ (footerContainer)
            );
        }

    }

    render() {
        // The <sidebar-nav> is now permanently in the DOM structure.
        // It manages its own state updates internally via store subscriptions.
        const template = html`
            <div
                id="app-root-inner"
                class="app-grid h-[100dvh] w-full max-w-[100vw] xl:grid xl:grid-cols-[var(--sidebar-width)_minmax(0,1fr)_auto] xl:grid-rows-[1fr] overflow-hidden bg-[#06090f] fixed inset-0"
            >
                <!-- Mobile Overlay -->
                <div
                    id="sidebar-overlay"
                    class="fixed inset-0 bg-black/60 z-[60] hidden xl:hidden"
                    @click=${() => uiActions.setActiveSidebar(null)}
                ></div>

                <!-- Sidebar -->
                <aside
                    id="sidebar-container"
                    class="sidebar-pane flex flex-col fixed xl:relative top-0 left-0 bottom-0 z-[70] w-[var(--sidebar-width)] -translate-x-full xl:translate-x-0 transition-transform duration-300 ease-out h-full max-h-full overflow-hidden bg-[#06090f] border-r border-white/5"
                >
                    <div
                        class="shrink-0 px-4 py-3.5 flex items-center gap-2.5 border-b border-white/5 z-20"
                    >
                        <span
                            class="w-6 h-6 bg-emerald-400 shrink-0"
                            style="mask-image: url(/icon.png); mask-size: contain; mask-position: center; mask-repeat: no-repeat; -webkit-mask-image: url(/icon.png); -webkit-mask-size: contain; -webkit-mask-position: center; -webkit-mask-repeat: no-repeat;"
                        ></span>
                        <span
                            class="font-medium text-slate-100 text-[15px]"
                            >Stream Analyzer</span
                        >
                        <span class="mono text-[10px] text-slate-600"
                            >ott debugger</span
                        >
                    </div>

                    <!-- Navigation (Scrollable, Stable Top) -->
                    <div
                        id="sidebar-nav-container"
                        class="flex flex-col grow min-h-0 overflow-y-auto custom-scrollbar pt-3 relative z-0"
                    >
                        <sidebar-nav></sidebar-nav>
                    </div>

                    <!-- Context Switcher (pinned above footer) -->
                    <div
                        id="stream-context-container"
                        class="shrink-0 z-10 relative border-t border-white/5"
                    ></div>

                    <!-- Global Controls (Fixed Footer) -->
                    <footer
                        id="sidebar-footer"
                        class="shrink-0 z-10 relative"
                    ></footer>
                </aside>

                <!-- Main Content Area -->
                <div
                    class="flex flex-col min-h-0 bg-[#06090f] relative w-full max-w-full h-full"
                >
                    <!-- Mobile Header -->
                    <header
                        class="xl:hidden shrink-0 bg-[#06090f] border-b border-white/5 px-4 py-2.5 flex items-center justify-between gap-4 z-20"
                    >
                        <button
                            @click=${() =>
                                uiActions.setActiveSidebar('primary')}
                            class="text-slate-400 p-2 -ml-2 hover:text-slate-100 transition-colors"
                            aria-label="Open navigation"
                        >
                            ${icons.menu}
                        </button>
                        <div class="flex items-center gap-2">
                            <span
                                class="w-5 h-5 bg-emerald-400"
                                style="mask-image: url(/icon.png); mask-size: contain; mask-position: center; mask-repeat: no-repeat; -webkit-mask-image: url(/icon.png); -webkit-mask-size: contain; -webkit-mask-position: center; -webkit-mask-repeat: no-repeat;"
                            ></span>
                            <span class="font-medium text-slate-100 text-sm"
                                >Stream Analyzer</span
                            >
                        </div>
                        <div class="w-8"></div>
                    </header>

                    <!-- View Container -->
                    <main
                        id="tab-view-container"
                        class="grow flex flex-col min-h-0 relative w-full max-w-full overflow-auto h-full"
                    ></main>

                    <div
                        id="persistent-player-container"
                        class="hidden p-4 h-full"
                    ></div>
                </div>

                <!-- Contextual Sidebar -->
                <aside
                    id="contextual-sidebar"
                    class="hidden bg-[#06090f] border-l border-white/5 fixed xl:relative top-0 right-0 bottom-0 z-40 w-96 translate-x-full transition-transform duration-300 ease-in-out flex-col min-h-0 h-full max-h-full"
                ></aside>

                <!-- Library Modal -->
                <library-modal-component></library-modal-component>
            </div>
        `;
        render(template, this);
    }
}

customElements.define('app-shell-component', AppShellComponent);
