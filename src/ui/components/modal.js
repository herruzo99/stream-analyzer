import { html, render } from 'lit-html';
import { useUiStore } from '@/state/uiStore';
import { closeModal } from '@/ui/services/modalService';
import { getSegmentAnalysisTemplate } from '@/features/segmentAnalysis/ui/index';
import { scte35DetailsTemplate } from '@/ui/shared/scte35-details';
import { aboutModalTemplate } from './about-modal.js';
import { segmentPollingSelectorTemplate } from '@/ui/shell/components/segment-polling-selector';

let dom;
let wasOpen = false; // Local state to track previous modal state for animations
let unsubscribeUiStore = null;

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
                modalContent.data.parsedDataB,
                modalContent.data.isIFrame
            );
        case 'scte35':
            return scte35DetailsTemplate(modalContent.data.scte35);
        case 'about':
            return aboutModalTemplate();
        case 'segmentPollingSelector':
            return segmentPollingSelectorTemplate();
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

    const isOpening = isOpen && !wasOpen;
    const isClosing = !isOpen && wasOpen;

    if (isOpening) {
        dom.modalTitle.textContent = modalState.modalTitle;
        dom.modalSegmentUrl.textContent = modalState.modalUrl;
        render(
            getContentTemplate(modalState.modalContent),
            dom.modalContentArea
        );

        const modalContentContainer = dom.segmentModal.querySelector('div');
        if (modalContentContainer) {
            modalContentContainer.classList.toggle(
                'max-w-7xl',
                modalState.isModalFullWidth
            );
            modalContentContainer.classList.toggle(
                'max-w-4xl',
                !modalState.isModalFullWidth
            );
        }

        dom.segmentModal.classList.remove('hidden', 'modal-leave');
        dom.segmentModal.classList.add('modal-enter');
    } else if (isClosing) {
        dom.segmentModal.classList.remove('modal-enter');
        dom.segmentModal.classList.add('modal-leave');

        dom.segmentModal.addEventListener(
            'animationend',
            (e) => {
                // Ensure the event is from the modal itself, not a child animation
                if (e.target !== dom.segmentModal) {
                    return;
                }
                dom.segmentModal.classList.add('hidden');
                if (useUiStore.getState().modalState.isModalOpen === false) {
                    dom.modalTitle.textContent = '';
                    dom.modalSegmentUrl.textContent = '';
                    render(html``, dom.modalContentArea);
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
    if (!dom.segmentModal || !dom.closeModalBtn) return;

    dom.segmentModal.addEventListener('click', (e) => {
        if (e.target === dom.segmentModal) {
            closeModal();
        }
    });

    dom.closeModalBtn.addEventListener('click', closeModal);

    wasOpen = useUiStore.getState().modalState.isModalOpen;

    if (unsubscribeUiStore) unsubscribeUiStore();
    unsubscribeUiStore = useUiStore.subscribe(renderModal);

    if (wasOpen) {
        renderModal();
    }
}
