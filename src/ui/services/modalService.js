import { uiActions, useUiStore } from '@/state/uiStore';

/**
 * Opens the global modal with specific content.
 * @param {object} options
 * @param {string} options.title - The title to display in the modal header.
 * @param {string} options.url - The URL or identifier for the content being displayed.
 * @param {{ type: string; data: any; }} options.content - A serializable object describing the content to be rendered.
 */
export function openModalWithContent({ title, url, content }) {
    uiActions.setModalState({
        isModalOpen: true,
        modalTitle: title,
        modalUrl: url,
        modalContent: content,
    });
}

/**
 * Closes the global modal with an animation.
 */
export function closeModal() {
    const { modalState } = useUiStore.getState();
    if (!modalState.isModalOpen) return;

    const modalEl = document.getElementById('segment-modal');
    if (modalEl) {
        modalEl.classList.remove('modal-enter');
        modalEl.classList.add('modal-leave');
    }

    // Update the store after the animation completes
    setTimeout(() => {
        uiActions.setModalState({
            isModalOpen: false,
            modalTitle: '',
            modalUrl: '',
            modalContent: null,
        });
    }, 200); // Must match animation duration in CSS
}
