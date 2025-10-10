/**
 * A map of well-known DRM system UUIDs (schemeIdUri) to their common, human-readable names.
 * The keys are lowercased for case-insensitive matching.
 */
export const knownDrmSchemes = {
    'urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed': 'Widevine',
    'urn:uuid:9a04f079-9840-4286-ab92-e65be0885f95': 'PlayReady',
    'urn:uuid:f239e769-efa3-4850-9c16-a903c6932efb': 'Adobe PrimeTime',
    'urn:uuid:1077efec-c0b2-4d02-ace3-3c1e52e2fb4b': 'ClearKey',
    'urn:uuid:94ce86fb-07ff-4f43-adb8-93d2fa968ca2': 'FairPlay',
    'urn:mpeg:dash:mp4protection:2011': 'MPEG Common Encryption (CENC)',
};

/**
 * Gets a human-readable name for a given DRM schemeIdUri.
 * @param {string | null} schemeIdUri The URI from the ContentProtection element.
 * @returns {string} The friendly name of the DRM system or a formatted version of the URI if unknown.
 */
export function getDrmSystemName(schemeIdUri) {
    if (!schemeIdUri) return 'Unknown Scheme';
    const lowerCaseUri = schemeIdUri.toLowerCase();
    return knownDrmSchemes[lowerCaseUri] || `Unknown (${schemeIdUri})`;
}

/**
 * Formats a 16-byte array into a standard UUID string.
 * @param {Uint8Array} bytes - The 16 bytes of the UUID.
 * @returns {string} The formatted UUID string (e.g., "edef8ba9-79d6-4ace-a3c8-27dcd51d21ed").
 */
export function formatUUID(bytes) {
    const hex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(
        12,
        16
    )}-${hex.substring(16, 20)}-${hex.substring(20, 32)}`;
}
