/**
 * Formats a time in seconds into a MM:SS or HH:MM:SS string.
 * Gracefully handles non-finite numbers.
 * @param {number} totalSeconds The time in seconds.
 * @returns {string} The formatted time string (e.g., "01:23:45" or "45:32").
 */
export function formatPlayerTime(totalSeconds) {
    if (!isFinite(totalSeconds) || totalSeconds < 0) {
        return 'Live';
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    const paddedMinutes = String(minutes).padStart(2, '0');
    const paddedSeconds = String(seconds).padStart(2, '0');

    if (hours > 0) {
        return `${hours}:${paddedMinutes}:${paddedSeconds}`;
    }
    return `${paddedMinutes}:${paddedSeconds}`;
}