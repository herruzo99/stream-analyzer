import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { openModalWithContent } from '@/ui/services/modalService';
import { html, render } from 'lit-html';
import { landingViewTemplate } from './components/landing-view.js';
import './components/library-modal.js';
import { stagingViewTemplate } from './components/staging-view.js';

let container = null;
let unsubAnalysis = null;
let unsubUi = null;

function renderInputView() {
    if (!container) return;

    const { streamInputs } = useAnalysisStore.getState();
    const hasInputs = streamInputs.length > 0;

    const aboutClickHandler = (e) => {
        e.preventDefault();
        openModalWithContent({
            title: '',
            url: '',
            content: { type: 'about', data: {} },
        });
    };

    const header = html`
        <div
            class="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-50 pointer-events-none"
        >
            <div class="pointer-events-auto flex items-center gap-3">
                <img
                    src="/icon.png"
                    class="w-10 h-10 object-contain drop-shadow-md"
                    alt="Stream Analyzer"
                />
                <span class="font-bold text-2xl text-white tracking-tight"
                    >Stream Analyzer</span
                >
            </div>
            <div class="flex gap-4 pointer-events-auto">
                <button
                    @click=${aboutClickHandler}
                    class="text-slate-400 hover:text-white transition-colors bg-slate-900/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/5 text-xs font-bold flex items-center gap-2 hover:bg-white/5"
                >
                    ${icons.info} About
                </button>
                <a
                    href="https://github.com/herruzo99/stream-analyzer"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-slate-400 hover:text-white transition-colors bg-slate-900/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/5 text-xs font-bold flex items-center gap-2 hover:bg-white/5"
                >
                    ${icons.github} GitHub
                </a>
            </div>
        </div>
    `;

    // Use keying to force re-render if swapping between major views to ensure animations trigger
    const content = hasInputs ? stagingViewTemplate() : landingViewTemplate();

    const template = html`
        <div
            class="h-full w-full bg-slate-950 text-slate-200 font-sans relative overflow-hidden selection:bg-blue-500/30"
        >
            <!-- Grid Background Layer -->
            <div
                class="absolute inset-0 bg-[url('/assets/grid.svg')] opacity-[0.03] pointer-events-none"
            ></div>

            ${!hasInputs ? header : ''} ${content}

            <library-modal-component></library-modal-component>
        </div>
    `;

    render(template, container);
}

export const inputView = {
    mount(containerElement) {
        container = containerElement;
        unsubAnalysis = useAnalysisStore.subscribe(renderInputView);
        unsubUi = useUiStore.subscribe(renderInputView);
        renderInputView();
    },
    unmount() {
        if (unsubAnalysis) unsubAnalysis();
        if (unsubUi) unsubUi();
        unsubAnalysis = null;
        unsubUi = null;
        if (container) render(html``, container);
        container = null;
    },
};
