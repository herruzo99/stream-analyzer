import { uiActions } from '@/state/uiStore';

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
 * Closes the global modal and resets its state.
 */
export function closeModal() {
    uiActions.setModalState({
        isModalOpen: false,
        modalTitle: '',
        modalUrl: '',
        modalContent: null,
    });
}
