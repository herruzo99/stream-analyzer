import { sessionService } from '@/application/services/sessionService';
import { showToast } from '@/ui/components/toast';

/**
 * Constructs a shareable URL from the current application state and
 * copies it to the user's clipboard.
 */
export function copyShareUrlToClipboard() {
    const sessionHash = sessionService.serializeStateForUrl();

    if (!sessionHash) {
        showToast({
            message: 'Nothing to share yet. Please add a stream.',
            type: 'warn',
        });
        return;
    }

    const url = new URL(window.location.origin + window.location.pathname);
    url.hash = `session=${sessionHash}`;

    navigator.clipboard
        .writeText(url.href)
        .then(() => {
            showToast({
                message: 'Shareable session URL copied to clipboard!',
                type: 'pass',
            });
        })
        .catch((err) => {
            console.error('Failed to copy URL: ', err);
            showToast({
                message: 'Failed to copy URL to clipboard.',
                type: 'fail',
            });
        });
}
