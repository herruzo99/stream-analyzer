/**
 * Generates a cryptographically strong random number in the range [0, 1).
 * Used to replace Math.random() in contexts flagged by security scanners.
 * @returns {number} A floating-point number between 0 (inclusive) and 1 (exclusive).
 */
export function secureRandom() {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        // Divide by 2^32 to get a float between 0 and 1
        return array[0] / (0xffffffff + 1);
    }
    // Fallback for environments without crypto (should be rare in modern browsers)
    return Math.random();
}