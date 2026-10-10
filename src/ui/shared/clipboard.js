import { showToast } from '@/ui/components/toast';

/**
 * Copies a given text string to the clipboard and shows a toast notification.
 * @param {string} text The text to copy.
 * @param {string} successMessage The message to show in the toast on success.
 * @returns {Promise<boolean>} Whether the browser accepted the clipboard write.
 */
export async function copyTextToClipboard(text, successMessage) {
    if (!navigator.clipboard) {
        showToast({
            message: 'Clipboard API not available in this browser.',
            type: 'fail',
        });
        return false;
    }

    try {
        await navigator.clipboard.writeText(text);
        showToast({
            message: successMessage,
            type: 'pass',
        });
        return true;
    } catch {
        showToast({
            message: 'Failed to copy to clipboard.',
            type: 'fail',
        });
        return false;
    }
}
