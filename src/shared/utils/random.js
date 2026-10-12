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

/**
 * Generates a UUID, safe in both secure and insecure contexts.
 *
 * `crypto.randomUUID()` is gated on secure contexts (https, localhost).
 * Serving the analyzer over a plain-HTTP LAN or Tailscale IP leaves it
 * undefined, so it must never be called directly.
 * @returns {string} An RFC 4122 v4 UUID.
 */
export function randomId() {
    try {
        if (
            typeof crypto !== 'undefined' &&
            typeof crypto.randomUUID === 'function'
        ) {
            return crypto.randomUUID();
        }
    } catch {
        // Some engines throw instead of returning undefined; fall through.
    }

    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
        bytes[i] = Math.floor(secureRandom() * 256);
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
    return (
        `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-` +
        `${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-` +
        `${hex.slice(10, 16).join('')}`
    );
}
