import {
    formatUUID,
    knownDrmSchemes,
} from '@/infrastructure/parsing/utils/drm';

/**
 * @typedef {Object} PsshDetails
 * @property {string} systemId - The UUID of the DRM system.
 * @property {string} systemName - The human-readable name of the DRM system.
 * @property {number} version - The version of the PSSH box.
 * @property {string[]} keyIds - An array of Key IDs (UUIDs) found in the PSSH.
 * @property {number} dataSize - The size of the PSSH data payload.
 * @property {string} dataBase64 - The PSSH data payload in Base64.
 * @property {string} dataHex - The PSSH data payload in Hex.
 * @property {string | null} licenseUrl - Extracted license URL (if applicable, e.g. Widevine).
 * @property {string} rawBox - The original full PSSH box in Base64.
 */

/**
 * Parses a Base64 encoded PSSH string.
 * @param {string} psshString - The Base64 encoded PSSH string.
 * @returns {PsshDetails} The parsed PSSH details.
 * @throws {Error} If the string is not a valid PSSH box.
 */
export function parsePsshString(psshString) {
    // 1. Decode Base64
    const binaryString = atob(psshString);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const view = new DataView(bytes.buffer);
    let offset = 0;

    // 2. Parse Box Header
    const _size = view.getUint32(offset);
    const type = String.fromCharCode(
        view.getUint8(offset + 4),
        view.getUint8(offset + 5),
        view.getUint8(offset + 6),
        view.getUint8(offset + 7)
    );

    if (type !== 'pssh') {
        throw new Error(`Invalid box type: ${type}. Expected 'pssh'.`);
    }

    offset += 8; // Skip size and type

    // 3. Parse Version and Flags
    const versionAndFlags = view.getUint32(offset);
    const version = versionAndFlags >>> 24;
    // const flags = versionAndFlags & 0xffffff; // Flags not currently used
    offset += 4;

    // 4. Parse System ID
    const systemIdBytes = new Uint8Array(bytes.buffer, offset, 16);
    const systemId = formatUUID(systemIdBytes);
    offset += 16;

    // 5. Parse Key IDs (if version > 0)
    const keyIds = [];
    if (version > 0) {
        const keyIdCount = view.getUint32(offset);
        offset += 4;
        for (let i = 0; i < keyIdCount; i++) {
            const kidBytes = new Uint8Array(bytes.buffer, offset, 16);
            keyIds.push(formatUUID(kidBytes));
            offset += 16;
        }
    }

    // 6. Parse Data Size and Data
    const dataSize = view.getUint32(offset);
    offset += 4;

    const dataBytes = new Uint8Array(bytes.buffer, offset, dataSize);
    const dataBase64 = btoa(String.fromCharCode.apply(null, dataBytes));
    const dataHex = Array.from(dataBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

    // 7. Heuristics (Widevine License URL)
    let licenseUrl = null;
    if (systemId === 'edef8ba9-79d6-4ace-a3c8-27dcd51d21ed') {
        // Widevine
        const text = new TextDecoder('utf-8', { fatal: false }).decode(
            dataBytes
        );
        const match = text.match(/https?:\/\/[^\s'"]+/);
        licenseUrl = match ? match[0] : null;
    }

    const systemName =
        knownDrmSchemes[`urn:uuid:${systemId}`] || 'Unknown System';

    return {
        systemId,
        systemName,
        version,
        keyIds,
        dataSize,
        dataBase64,
        dataHex,
        licenseUrl,
        rawBox: psshString,
    };
}
