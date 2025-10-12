import { render, html } from 'lit-html';
import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore } from '@/state/uiStore';
import { inputViewTemplate } from '@/ui/views/input-view';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { renderAppShell } from './components/app-shell.js';

let initialDomContext;
let appShellDomContext;
let isShellRendered = false;

const appShellTemplate = () => html`
    <!-- Mobile-specific header is outside the main grid to remain fixed -->
    <header id="mobile-header" class="hidden xl:hidden flex-shrink-0 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 p-3 flex items-center justify-between gap-4 fixed top-0 left-0 right-0 z-20">
        <button id="sidebar-toggle-btn" class="text-gray-300 hover:text-white p-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
        </button>
        <h2 id="mobile-page-title" class="text-lg font-bold text-white"></h2>
        <div class="w-7"></div>
    </header>

    <!-- Main grid for desktop -->
    <div id="app-root-inner" class="h-screen xl:grid xl:grid-cols-[auto_1fr_auto]">
        <!-- The overlay MUST be a sibling of the sidebars for z-index to work correctly -->
        <div id="sidebar-overlay" class="fixed inset-0 bg-black/50 z-30 hidden xl:hidden"></div>
    
        <!-- Primary Sidebar (Left) -->
        <aside id="sidebar-container" class="bg-gray-900 border-r border-gray-800 flex-col fixed xl:relative xl:flex top-0 left-0 bottom-0 z-40 w-72 xl:w-auto -translate-x-full xl:translate-x-0 transition-transform duration-300 ease-in-out">
            <header class="p-3">
                <h2 class="text-xl font-bold text-white mb-4 px-2">Stream Analyzer</h2>
                <div id="sidebar-context-switchers" class="space-y-2 px-2"></div>
            </header>
            <nav id="sidebar-nav" class="flex flex-col flex-grow overflow-y-auto p-3"></nav>
            <footer id="sidebar-footer" class="flex-shrink-0 p-3"></footer>
        </aside>

        <!-- Main Content Area -->
        <div id="app-shell" class="h-full flex flex-col min-h-0">
            <div id="main-content-wrapper" class="flex flex-col overflow-hidden flex-grow pt-[60px] xl:pt-0">
                <header id="main-header" class="flex-shrink-0 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 p-3 flex items-center justify-between gap-4">
                    <div id="context-header" class="flex items-center gap-2 sm:gap-4 flex-wrap justify-start w-full"></div>
                </header>
                <main id="main-content" class="flex-grow overflow-y-auto p-4 sm:p-6"></main>
            </div>
        </div>

        <!-- Contextual Sidebar (Right, Hybrid) -->
        <aside id="contextual-sidebar" class="bg-gray-800/80 backdrop-blur-sm border-l border-gray-700/50 fixed xl:relative top-0 right-0 bottom-0 z-40 w-96 max-w-[90vw] translate-x-full xl:translate-x-0 transition-transform duration-300 ease-in-out flex-col"></aside>
    </div>
`;

/**
 * Sets the DOM context for the renderer.
 * @param {object} domContext The application's DOM context from boot.js.
 */
export function initializeRenderer(domContext) {
    initialDomContext = domContext;
    useAnalysisStore.subscribe(renderApp);
    useUiStore.subscribe(renderApp);
    useSegmentCacheStore.subscribe(renderApp);
}

/**
 * The main application render function. It handles rendering for both the input and results views.
 */
export function renderApp() {
    if (!initialDomContext) return;

    const { streams } = useAnalysisStore.getState();
    const { viewState } = useUiStore.getState();
    const isResultsView = viewState === 'results' && streams.length > 0;

    initialDomContext.inputSection.classList.toggle('hidden', isResultsView);
    initialDomContext.appRoot.classList.toggle('hidden', !isResultsView);

    if (isResultsView) {
        if (!isShellRendered) {
            render(appShellTemplate(), initialDomContext.appRoot);
            
            appShellDomContext = {
                ...initialDomContext, // Include boot-time globals
                appRoot: initialDomContext.appRoot,
                sidebarContainer: document.body.querySelector('#sidebar-container'),
                sidebarNav: document.body.querySelector('#sidebar-nav'),
                sidebarFooter: document.body.querySelector('#sidebar-footer'),
                sidebarContextSwitchers: document.body.querySelector('#sidebar-context-switchers'),
                appShell: initialDomContext.appRoot.querySelector('#app-shell'),
                mainContentWrapper: initialDomContext.appRoot.querySelector('#main-content-wrapper'),
                contextHeader: initialDomContext.appRoot.querySelector('#context-header'),
                mainContent: initialDomContext.appRoot.querySelector('#main-content'),
                contextualSidebar: document.body.querySelector('#contextual-sidebar'),
                mobileHeader: document.body.querySelector('#mobile-header'),
                sidebarOverlay: document.body.querySelector('#sidebar-overlay'),
                sidebarToggleBtn: document.body.querySelector('#sidebar-toggle-btn'),
                mobilePageTitle: document.body.querySelector('#mobile-page-title'),
            };
            
            isShellRendered = true;
        }
        
        renderAppShell(appShellDomContext);

    } else {
        isShellRendered = false;
        appShellDomContext = null;
        if(initialDomContext.appRoot.innerHTML) {
            render(html``, initialDomContext.appRoot);
        }
        render(inputViewTemplate(renderApp), initialDomContext.inputSection);
    }
}