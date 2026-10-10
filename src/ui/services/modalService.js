import { uiActions, useUiStore } from '@/state/uiStore';

let focusReturnTarget = null;

/**
 * Opens the global modal with specific content.
 * @param {object} options
 * @param {string} options.title - The title to display in the modal header.
 * @param {string} options.url - The URL or identifier for the content being displayed.
 * @param {{ type: string; data: any; }} options.content - A serializable object describing the content to be rendered.
 * @param {boolean} [options.isFullWidth=false] - If true, a wider modal variant will be used.
 */
export function openModalWithContent({
    title,
    url,
    content,
    isFullWidth = false,
}) {
    focusReturnTarget =
        document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
    uiActions.setModalState({
        isModalOpen: true,
        modalTitle: title,
        modalUrl: url,
        modalContent: content,
        isModalFullWidth: isFullWidth,
    });
}

/**
 * Closes the global modal by synchronously updating the state.
 * The rendering logic in `modal.js` will handle the exit animation.
 */
export function closeModal() {
    const { modalState } = useUiStore.getState();
    if (!modalState.isModalOpen) return;

    uiActions.setModalState({
        isModalOpen: false,
    });
    const target = focusReturnTarget;
    focusReturnTarget = null;
    queueMicrotask(() => {
        if (target?.isConnected) target.focus({ preventScroll: true });
    });
}
