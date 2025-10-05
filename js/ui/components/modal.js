import { render } from 'lit-html';
import { useStore } from '../../core/store.js';
import { closeModal } from '../../services/modalService.js';

let dom;

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
        render(modalState.modalContentTemplate, dom.modalContentArea);

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