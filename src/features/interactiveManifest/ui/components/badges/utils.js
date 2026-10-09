/**
 * Badge formatting helpers for the manifest inspector.
 *
 * Recovered from the pre-Heux line (originally inline in
 * `smart-tokens.js`): ISO-8601 duration parsing plus the humanized
 * pill/byte formatters used by smart badges and the timing calculator.
 * Re-exported here so both `smart-tokens.js` and
 * `smart-badge-system.js` share one implementation.
 */

/**
 * Parse an ISO 8601 duration (e.g. "PT1H30M", "PT30S").
 * @param {string} str
 * @returns {{ total: number } | null} Total seconds, or null if invalid.
 */
export const parseDuration = (str) => {
    if (!str || typeof str !== 'string') return null;
    const match = str.match(
        /PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?/
    );
    if (match) {
        const h = parseFloat(match[1] || '0');
        const m = parseFloat(match[2] || '0');
        const s = parseFloat(match[3] || '0');
        const total = h * 3600 + m * 60 + s;
        if (total === 0 && !str.includes('0')) return null;
        return { total };
    }
    return null;
};

/**
 * Humanize a second count for badge pills.
 * @param {number} totalSeconds
 * @returns {string}
 */
export const formatDurationPill = (totalSeconds) => {
    if (totalSeconds < 0.001 && totalSeconds > 0) return '<1ms';
    if (totalSeconds < 1) return `${(totalSeconds * 1000).toFixed(0)}ms`;
    if (totalSeconds < 60) return `${parseFloat(totalSeconds.toFixed(3))}s`;
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
};

/**
 * Humanize a byte count.
 * @param {number} bytes
 * @returns {string}
 */
export const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
