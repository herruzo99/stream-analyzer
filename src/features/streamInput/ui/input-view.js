import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore } from '@/state/uiStore';
import { html, render } from 'lit-html';
import { landingViewTemplate } from './components/landing-view.js';
import './components/library-modal.js';
import './components/staging-sidebar.js'; // Ensure registered
import './components/staging-main.js'; // Ensure registered

// --- Landing View Controller (Non-Shell) ---
let landingContainer = null;
let landingUnsubAnalysis = null;
let landingUnsubUi = null;

function renderLanding() {
    if (!landingContainer) return;

    const template = html`
        <div
            class="h-full w-full text-slate-200 font-sans relative overflow-hidden selection:bg-emerald-500/10 pointer-events-auto"
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

// --- Staging View Controller (queue + configure workbench) ---
let stagingContainer = null;
let stagingUnsubAnalysis = null;
let stagingUnsubUi = null;

function renderStaging() {
    if (!stagingContainer) return;

    render(
        html`
            <div
                class="flex flex-col md:flex-row h-full w-full overflow-hidden bg-[#06090f] text-slate-200"
                style="gap: 1px; background-color: #1a2636;"
            >
                <!-- Queue -->
                <aside
                    class="w-full md:w-[320px] xl:w-[360px] shrink-0 flex flex-col min-h-0 bg-[#06090f] pointer-events-auto max-h-[40%] md:max-h-none"
                >
                    <staging-sidebar class="h-full w-full"></staging-sidebar>
                </aside>

                <!-- Configure -->
                <main
                    class="grow min-w-0 min-h-0 relative flex flex-col overflow-hidden bg-[#06090f] pointer-events-auto"
                >
                    <staging-main class="h-full w-full"></staging-main>
                </main>
            </div>
            <library-modal-component></library-modal-component>
        `,
        stagingContainer
    );
}

export const stagingView = {
    mount(container) {
        stagingContainer = container;
        stagingUnsubAnalysis = useAnalysisStore.subscribe(renderStaging);
        stagingUnsubUi = useUiStore.subscribe(renderStaging);
        renderStaging();
    },

    unmount() {
        if (stagingUnsubAnalysis) stagingUnsubAnalysis();
        if (stagingUnsubUi) stagingUnsubUi();
        stagingUnsubAnalysis = null;
        stagingUnsubUi = null;
        if (stagingContainer) {
            render(html``, stagingContainer);
            stagingContainer = null;
        }
    },
};

// --- Input root: landing until something is staged, then the workbench. ---
let inputContainer = null;
let inputUnsubAnalysis = null;
let inputUnsubUi = null;
let inputMode = null; // 'landing' | 'staging'
// Manual override so users can return to landing without clearing the queue.
let landingPinned = false;

function renderInput() {
    if (!inputContainer) return;

    const { streamInputs } = useAnalysisStore.getState();
    const next = streamInputs.length > 0 && !landingPinned ? 'staging' : 'landing';
    if (next !== inputMode) {
        if (inputMode === 'landing') landingView.unmount();
        if (inputMode === 'staging') stagingView.unmount();
        inputMode = next;
        if (next === 'landing') landingView.mount(inputContainer);
        else stagingView.mount(inputContainer);
    }
}

export const inputView = {
    mount(containerElement) {
        // Defensive: mainRenderer guards with currentMountedViewKey, but a
        // double-mount would leak store subscriptions. Unmount first.
        this.unmount();
        inputContainer = containerElement;
        inputMode = null;
        inputUnsubAnalysis = useAnalysisStore.subscribe(renderInput);
        inputUnsubUi = useUiStore.subscribe(renderInput);
        renderInput();
    },
    unmount() {
        if (inputUnsubAnalysis) inputUnsubAnalysis();
        if (inputUnsubUi) inputUnsubUi();
        inputUnsubAnalysis = null;
        inputUnsubUi = null;
        if (inputMode === 'landing') landingView.unmount();
        if (inputMode === 'staging') stagingView.unmount();
        inputMode = null;
        if (inputContainer) render(html``, inputContainer);
        inputContainer = null;
    },
    /** Return to the landing without clearing the staged queue. */
    showLanding() {
        landingPinned = true;
        renderInput();
    },
    /** Return to the staging workbench. */
    showStaging() {
        landingPinned = false;
        renderInput();
    },
};
