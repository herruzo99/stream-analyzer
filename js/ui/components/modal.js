import { html, render } from 'lit-html';
import { useStore } from '../../app/store.js';
import { closeModal } from '../../services/modalService.js';
import { getSegmentAnalysisTemplate } from '../views/segment-analysis/index.js';
import { scte35DetailsTemplate } from '../shared/scte35-details.js';

let dom;

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
    if (!dom) return;

    const { modalState } = useStore.getState();
    const modalPanel = dom.segmentModal.querySelector('div');

    if (modalState.isModalOpen) {
        dom.modalTitle.textContent = modalState.modalTitle;
        dom.modalSegmentUrl.textContent = modalState.modalUrl;

        // The rendering logic is now inside the UI component.
        const template = getContentTemplate(modalState.modalContent);
        render(template, dom.modalContentArea);

        dom.segmentModal.classList.remove('opacity-0', 'invisible');
        dom.segmentModal.classList.add('opacity-100', 'visible');
        modalPanel.classList.remove('scale-95');
        modalPanel.classList.add('scale-100');
    } else {
        dom.segmentModal.classList.add('opacity-0', 'invisible');
        dom.segmentModal.classList.remove('opacity-100', 'visible');
        modalPanel.classList.add('scale-95');
        modalPanel.classList.remove('scale-100');
    }
}

/**
 * Initializes the modal component, setting up event listeners and subscribing to state changes.
 * @param {object} domContext The application's DOM context.
 */
export function initializeModalComponent(domContext) {
    dom = domContext;

    // Set up event listeners once
    dom.closeModalBtn.addEventListener('click', closeModal);
    dom.segmentModal.addEventListener('click', (e) => {
        // Close modal if the backdrop is clicked, but not the panel itself
        if (e.target === dom.segmentModal) {
            closeModal();
        }
    });

    // Subscribe to the store. The listener will receive the new and old state.
    useStore.subscribe((state, prevState) => {
        // Only re-render if the modal state slice has changed.
        if (state.modalState !== prevState.modalState) {
            renderModal();
        }
    });

    // Manually call render once at initialization to sync with initial state.
    renderModal();
}
