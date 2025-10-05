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
