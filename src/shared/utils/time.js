/**
 * Parses an ISO 8601 duration string (e.g., "PT2.00S") into seconds.
 * @param {string | null} durationStr The duration string.
 * @returns {number | null} The duration in seconds, or null if invalid.
 */
export const parseDuration = (durationStr) => {
    if (!durationStr) return null;
    const match = durationStr.match(
        /P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?/
    );
    if (!match) return null;
    const days = parseFloat(match[1] || '0');
    const hours = parseFloat(match[2] || '0');
    const minutes = parseFloat(match[3] || '0');
    const seconds = parseFloat(match[4] || '0');
    return days * 86400 + hours * 3600 + minutes * 60 + seconds;
};
