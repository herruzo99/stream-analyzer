import '@/features/streamInput/ui/components/library-modal.js';
import { useAnalysisStore } from '@/state/analysisStore';
import { usePlayerStore } from '@/state/playerStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { renderContextSwitcher } from './context-switcher.js';
import { globalControlsTemplate } from './global-controls.js';
import { mainContentControlsTemplate } from './main-content-controls.js';
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
        this.unsubs.push(useUiStore.subscribe(() => {
            this.updateLayoutState();
            this.updateSubComponents();
        }));
        
        this.unsubs.push(useAnalysisStore.subscribe(() => this.updateSubComponents()));
        this.unsubs.push(usePlayerStore.subscribe(() => this.updateSubComponents()));
        
        // Trigger initial updates
        this.updateLayoutState();
        this.updateSubComponents();
    }

    disconnectedCallback() {
        this.unsubs.forEach(u => u());
        this.unsubs = [];
    }

    // Handles CSS class toggling for sidebar visibility
    updateLayoutState() {
        const { activeSidebar } = useUiStore.getState();
        const isPrimaryOpen = activeSidebar === 'primary';
        const isContextualOpen = activeSidebar === 'contextual';

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
                sidebarOverlay.classList.add('block', 'animate-fadeIn');
            } else {
                sidebarOverlay.classList.add('hidden');
                sidebarOverlay.classList.remove('block', 'animate-fadeIn');
            }
        }

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
    }

    // Handles rendering of dynamic sub-components (Header, Footer)
    updateSubComponents() {
        // ARCHITECTURAL CHANGE: Context Switcher is now at the bottom (stream-context-container)
        const contextContainer = this.querySelector('#stream-context-container');
        if (contextContainer) {
            render(renderContextSwitcher(), /** @type {HTMLElement} */ (contextContainer));
        }

        const footerContainer = this.querySelector('#sidebar-footer');
        if (footerContainer) {
            render(globalControlsTemplate(), /** @type {HTMLElement} */ (footerContainer));
        }

        const contextHeader = this.querySelector('#context-header');
        if (contextHeader) {
            render(mainContentControlsTemplate(), /** @type {HTMLElement} */ (contextHeader));
        }
    }

    render() {
        // The <sidebar-nav> is now permanently in the DOM structure.
        // It manages its own state updates internally via store subscriptions.
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
                <aside
                    id="sidebar-container"
                    class="glass-panel flex flex-col fixed xl:relative top-0 left-0 bottom-0 z-[70] w-[var(--sidebar-width)] -translate-x-full xl:translate-x-0 transition-transform duration-300 ease-out shadow-2xl xl:shadow-none h-full max-h-full overflow-hidden"
                >
                    <!-- Static Branding Header -->
                    <div class="shrink-0 p-5 flex items-center gap-3 border-b border-white/5 bg-slate-950/50 backdrop-blur-sm z-20">
                        <div class="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                            <img src="/icon.png" class="w-5 h-5 object-contain opacity-90" alt="Logo" />
                        </div>
                        <div class="flex flex-col">
                            <span class="font-bold text-slate-200 text-sm leading-tight tracking-tight">Stream Analyzer</span>
                            <span class="text-[10px] text-slate-500 font-medium">Professional Workbench</span>
                        </div>
                    </div>

                    <!-- Navigation (Scrollable, Stable Top) -->
                    <div id="sidebar-nav-container" class="flex flex-col grow min-h-0 overflow-y-auto scrollbar-hide pt-4 relative z-0">
                        <sidebar-nav></sidebar-nav>
                    </div>

                    <!-- Context Switcher (Moved to Bottom to prevent Nav Jumps) -->
                    <div id="stream-context-container" class="shrink-0 z-10 relative bg-slate-900/50 border-t border-white/5"></div>

                    <!-- Global Controls (Fixed Footer) -->
                    <footer id="sidebar-footer" class="shrink-0 z-10 relative"></footer>
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
                        <div class="flex items-center gap-2">
                             <img src="/icon.png" class="w-5 h-5 object-contain" alt="Logo" />
                             <span class="font-bold text-slate-200">Stream Analyzer</span>
                        </div>
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