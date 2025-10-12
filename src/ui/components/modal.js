import { html, render } from 'lit-html';
import { useUiStore } from '@/state/uiStore';
import { closeModal } from '@/ui/services/modalService';
import { getSegmentAnalysisTemplate } from '@/features/segmentAnalysis/ui/index';
import { scte35DetailsTemplate } from '@/ui/shared/scte35-details';

let dom;

const aboutModalTemplate = () => html`
    <div class="space-y-4 text-gray-300">
        <p>
            The
            <strong class="text-white">Stream Analyzer</strong> is an advanced,
            browser-based tool for analyzing and comparing DASH & HLS streaming
            media manifests and segments. It was designed to provide deep
            inspection capabilities, compliance checking, and side-by-side
            comparisons to aid in debugging and validation of streaming content.
        </p>
        <p>
            This project was architected and built with a focus on modern web
            principles, including a clean, decoupled architecture, a fully
            containerized and reproducible development environment via Nix, and
            a CI/CD pipeline for automated deployments.
        </p>
        <h4 class="text-lg font-bold text-white pt-2">Core Principles</h4>
        <ul class="list-disc pl-5 space-y-2">
            <li>
                <strong class="text-gray-200">Performance:</strong>
                All heavy parsing and analysis is offloaded to a Web Worker to
                ensure the UI remains fast and responsive at all times.
            </li>
            <li>
                <strong class="text-gray-200">Maintainability:</strong>
                Code is organized according to Clean Architecture principles,
                separating domain logic from application and UI concerns.
            </li>
            <li>
                <strong class="text-gray-200">Reproducibility:</strong>
                The entire development and build environment is managed by Nix
                Flakes, guaranteeing consistency across all machines.
            </li>
        </ul>
        <p class="pt-4 text-sm text-gray-400">
            &copy; 2025 The Principal Systems Architect
        </p>
    </div>
`;

/**
 * Generates the correct lit-html template based on the modal content object.
 * @param {{ type: string; data: any; } | null} modalContent
 * @returns {import('lit-html').TemplateResult}
 */
function getContentTemplate(modalContent) {
    if (!modalContent) {
        return html``;
    }

    switch (modalContent.type) {
        case 'segmentAnalysis':
            return getSegmentAnalysisTemplate(
                modalContent.data.parsedData,
                modalContent.data.parsedDataB
            );
        case 'scte35':
            return scte35DetailsTemplate(modalContent.data.scte35);
        case 'about':
            return aboutModalTemplate();
        default:
            return html`<p class="text-red-400">
                Unknown modal content type: ${modalContent.type}
            </p>`;
    }
}

/**
 * Renders the modal based on the current state from the store.
 */
function renderModal() {
    if (!dom || !dom.segmentModal) return;

    const { modalState } = useUiStore.getState();

    if (modalState.isModalOpen) {
        dom.modalTitle.textContent = modalState.modalTitle;
        dom.modalSegmentUrl.textContent = modalState.modalUrl;

        const template = getContentTemplate(modalState.modalContent);
        render(template, dom.modalContentArea);

        dom.segmentModal.classList.remove('modal-leave', 'hidden');
        dom.segmentModal.classList.add('modal-enter');
    } else {
        // The closing logic is now handled by the closeModal service to allow for animations.
        // We just ensure it's hidden if the initial state is closed.
        if (!dom.segmentModal.classList.contains('modal-leave')) {
            dom.segmentModal.classList.add('hidden');
        }
    }
}

/**
 * Initializes the modal component, setting up event listeners and subscribing to state changes.
 * @param {object} domContext The application's DOM context.
 */
export function initializeModalComponent(domContext) {
    dom = domContext;
    if (!dom.closeModalBtn || !dom.segmentModal) return;

    dom.closeModalBtn.addEventListener('click', closeModal);
    dom.segmentModal.addEventListener('click', (e) => {
        if (e.target === dom.segmentModal) {
            closeModal();
        }
    });

    useUiStore.subscribe((state, prevState) => {
        if (state.modalState.isModalOpen !== prevState.modalState.isModalOpen) {
            renderModal();
        }
    });

    renderModal();
}