import { storeActions } from '../core/store.js';

/**
 * Opens the global modal with specific content.
 * @param {object} options
 * @param {string} options.title - The title to display in the modal header.
 * @param {string} options.url - The URL or identifier for the content being displayed.
 * @param {import('lit-html').TemplateResult} options.contentTemplate - The lit-html template to render as the modal's content.
 */
export function openModalWithContent({ title, url, contentTemplate }) {
    storeActions.setModalState({
        isModalOpen: true,
        modalTitle: title,
        modalUrl: url,
        modalContentTemplate: contentTemplate,
    });
}

/**
 * Closes the global modal and resets its state.
 */
export function closeModal() {
    storeActions.setModalState({
        isModalOpen: false,
        modalTitle: '',
        modalUrl: '',
        modalContentTemplate: null,
    });
}
