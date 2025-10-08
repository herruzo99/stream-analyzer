import { html, render } from 'lit-html';
import { useUiStore } from '@/state/uiStore';
import { closeModal } from '@/ui/services/modalService';
import { getSegmentAnalysisTemplate } from '@/features/segmentAnalysis/ui/index';
import { scte35DetailsTemplate } from '@/ui/shared/scte35-details';
import { aboutModalTemplate } from './about-modal.js';

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
    if (!dom) return;

    const { modalState } = useUiStore.getState();
    const modalPanel = dom.segmentModal.querySelector('div');

    if (modalState.isModalOpen) {
        dom.modalTitle.textContent = modalState.modalTitle;
        dom.modalSegmentUrl.textContent = modalState.modalUrl;

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

    dom.closeModalBtn.addEventListener('click', closeModal);
    dom.segmentModal.addEventListener('click', (e) => {
        if (e.target === dom.segmentModal) {
            closeModal();
        }
    });

    useUiStore.subscribe((state, prevState) => {
        if (state.modalState !== prevState.modalState) {
            renderModal();
        }
    });

    renderModal();
}