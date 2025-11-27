/**
 * Formats a bitrate in bits per second into a human-readable string (kbps or Mbps).
 * @param {number | string} bps The bitrate in bits per second.
 * @returns {string} The formatted bitrate string or 'N/A'.
 */
export const formatBitrate = (bps) => {
    const numBps = typeof bps === 'string' ? parseFloat(bps) : bps;
    if (!numBps || isNaN(numBps)) return 'N/A';
    if (numBps >= 1000000) return `${(numBps / 1000000).toFixed(2)} Mbps`;
    return `${(numBps / 1000).toFixed(0)} kbps`;
};

/**
 * Formats a duration in seconds into a human-readable string.
 * Handles milliseconds for small values and h/m/s for larger ones.
 * @param {number} seconds The duration in seconds.
 * @returns {string} Formatted string (e.g., "120ms", "1.50s", "1h 20m").
 */
export const formatDuration = (seconds) => {
    if (seconds === undefined || seconds === null || isNaN(seconds))
        return 'N/A';

    const absSeconds = Math.abs(seconds);

    // Micro/Millisecond precision for very short durations
    if (absSeconds < 0.001 && absSeconds > 0) return '<1ms';
    if (absSeconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;

    // Standard seconds
    if (absSeconds < 60) return `${seconds.toFixed(2)}s`;

    // Minutes/Hours
    const h = Math.floor(absSeconds / 3600);
    const m = Math.floor((absSeconds % 3600) / 60);
    const s = Math.floor(absSeconds % 60);

    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
};
