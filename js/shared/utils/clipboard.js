import { showToast } from '../../ui/components/toast.js';

/**
 * Copies a given text string to the clipboard and shows a toast notification.
 * @param {string} text The text to copy.
 * @param {string} successMessage The message to show in the toast on success.
 */
export function copyTextToClipboard(text, successMessage) {
    if (!navigator.clipboard) {
        showToast({
            message: 'Clipboard API not available in this browser.',
            type: 'fail',
        });
        return;
    }

    navigator.clipboard
        .writeText(text)
        .then(() => {
            showToast({
                message: successMessage,
                type: 'pass',
            });
        })
        .catch((err) => {
            console.error('Failed to copy text:', err);
            showToast({
                message: 'Failed to copy to clipboard.',
                type: 'fail',
            });
        });
}
