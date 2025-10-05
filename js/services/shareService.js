import { useStore } from '../core/store.js';
import { showToast } from '../ui/components/toast.js';

/**
 * Constructs a shareable URL from the current streams in the state and
 * copies it to the user's clipboard.
 */
export function copyShareUrlToClipboard() {
    const streams = useStore.getState().streams;

    if (streams.length === 0) {
        return;
    }

    const url = new URL(window.location.origin + window.location.pathname);
    streams.forEach((stream) => {
        if (stream.originalUrl) {
            url.searchParams.append('url', stream.originalUrl);
        }
    });

    navigator.clipboard
        .writeText(url.href)
        .then(() => {
            showToast({
                message: 'Shareable URL copied to clipboard!',
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
