import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore } from '@/state/uiStore';
import { html, render } from 'lit-html';
import { landingViewTemplate } from './components/landing-view.js';
import './components/library-modal.js';
import './components/staging-sidebar.js'; // Ensure registered
import './components/staging-main.js';    // Ensure registered

// --- Landing View Controller (Non-Shell) ---
let landingContainer = null;
let landingUnsubAnalysis = null;
let landingUnsubUi = null;

function renderLanding() {
    if (!landingContainer) return;

    // Only render if we have no inputs? 
    // Actually mainRenderer controls when this is mounted.
    // But we might want to be reactive to store changes if needed.

    const template = html`
        <div
            class="h-full w-full text-slate-200 font-sans relative overflow-hidden selection:bg-blue-500/30 pointer-events-auto"
        >
            ${landingViewTemplate()}
            <library-modal-component></library-modal-component>
        </div>
    `;

    render(template, landingContainer);
}

export const landingView = {
    mount(containerElement) {
        landingContainer = containerElement;
        // Subscriptions might be needed for library modal or other updates
        landingUnsubAnalysis = useAnalysisStore.subscribe(renderLanding);
        landingUnsubUi = useUiStore.subscribe(renderLanding);
        renderLanding();
    },
    unmount() {
        if (landingUnsubAnalysis) landingUnsubAnalysis();
        if (landingUnsubUi) landingUnsubUi();
        landingUnsubAnalysis = null;
        landingUnsubUi = null;
        if (landingContainer) render(html``, landingContainer);
        landingContainer = null;
    },
};

// --- Staging View Controller (Independent Layout) ---
let stagingContainer = null;

export const stagingView = {
    mount(container) {
        stagingContainer = container;
        render(html`
            <div class="flex h-full w-full overflow-hidden" style="gap: 0.75rem; padding: 0.75rem;">
                <!-- Staging Sidebar -->
                <aside class="w-[320px] md:w-[380px] xl:w-[420px] shrink-0 flex flex-col relative z-30 transition-all duration-300 pointer-events-auto">
                    <staging-sidebar class="h-full w-full"></staging-sidebar>
                </aside>
                
                <!-- Main Content -->
                <main class="grow min-w-0 h-full relative flex flex-col overflow-hidden transition-all duration-300 pointer-events-auto">
                    <staging-main class="h-full w-full"></staging-main>
                </main>
            </div>
            <!-- Modal placed outside overflow container -->
            <library-modal-component class="pointer-events-auto"></library-modal-component>
        `, container);
    },

    unmount() {
        if (stagingContainer) {
            render(html``, stagingContainer);
            stagingContainer = null;
        }
    }
};

// Backward compatibility (if needed temporarily)
export const inputView = landingView;
