import { html, render } from 'lit-html';
import { useUiStore, uiActions } from '@/state/uiStore';
import { closeModal } from '@/ui/services/modalService';
import { getSegmentAnalysisTemplate } from '@/features/segmentAnalysis/ui/index';
import { scte35DetailsTemplate } from '@/ui/shared/scte35-details';
import { aboutModalTemplate } from './about-modal.js';

let dom;
let wasOpen = false; // Local state to track previous modal state for animations

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
 * Renders the modal based on the current state from the store, handling animations
 * based on state transitions.
 */
function renderModal() {
    if (!dom || !dom.segmentModal) return;

    const { modalState } = useUiStore.getState();
    const isOpen = modalState.isModalOpen;

    // --- State Transition Detection for Animations ---
    const isOpening = isOpen && !wasOpen;
    const isClosing = !isOpen && wasOpen;

    if (isOpening) {
        dom.modalTitle.textContent = modalState.modalTitle;
        dom.modalSegmentUrl.textContent = modalState.modalUrl;
        dom.modalSegmentUrl.classList.toggle('hidden', !modalState.modalUrl);

        const template = getContentTemplate(modalState.modalContent);
        render(template, dom.modalContentArea);

        dom.segmentModal.classList.remove('hidden', 'modal-leave');
        dom.segmentModal.classList.add('modal-enter');
    } else if (isClosing) {
        dom.segmentModal.classList.remove('modal-enter');
        dom.segmentModal.classList.add('modal-leave');

        // After the animation, hide the element and clear its content from the store.
        dom.segmentModal.addEventListener(
            'animationend',
            () => {
                dom.segmentModal.classList.add('hidden');
                // Check if the modal is still closed before clearing content,
                // to avoid race conditions if it was quickly reopened.
                if (useUiStore.getState().modalState.isModalOpen === false) {
                    uiActions.setModalState({
                        modalTitle: '',
                        modalUrl: '',
                        modalContent: null,
                    });
                }
            },
            { once: true }
        );
    }

    wasOpen = isOpen;
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

    // Initialize local state before subscribing
    wasOpen = useUiStore.getState().modalState.isModalOpen;

    useUiStore.subscribe(renderModal);

    renderModal();
}