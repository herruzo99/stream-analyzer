import { formatUUID } from '../../utils/drm.js';
import { BoxParser } from '../utils.js';

/**
 * Extracts the license server URL from a Widevine PSSH data payload.
 * @param {Uint8Array} data - The PSSH data payload.
 * @returns {string | null} The license server URL or null if not found.
 */
function getWidevineLicenseUrl(data) {
    try {
        const text = new TextDecoder('utf-8', { fatal: false }).decode(data);
        const match = text.match(/https?:\/\/[^\s'"]+/);
        return match ? match[0] : null;
    } catch (_e) {
        return null;
    }
}

/**
 * Parses the PlayReady Header Object (PRO) to find the XML data.
 * @param {Uint8Array} data - The PSSH data payload.
 * @returns {string | null} The PlayReady XML or null.
 */
function getPlayReadyXml(data) {
    try {
        // PlayReady Object (PRO) Header
        // 4 bytes: Length
        // 2 bytes: Record Count
        // Loop Records: 2 bytes Type, 2 bytes Length, Data...
        const view = new DataView(
            data.buffer,
            data.byteOffset,
            data.byteLength
        );
        if (view.byteLength < 6) return null;

        // Verify length matches (little-endian)
        const length = view.getUint32(0, true);
        if (length > view.byteLength) return null;

        const recordCount = view.getUint16(4, true);
        let offset = 6;

        for (let i = 0; i < recordCount; i++) {
            if (offset + 4 > view.byteLength) break;
            const type = view.getUint16(offset, true);
            const len = view.getUint16(offset + 2, true);
            offset += 4;

            // Record Type 1 is the PlayReady Header (XML)
            if (type === 1) {
                if (offset + len > view.byteLength) break;
                const xmlBytes = data.subarray(offset, offset + len);
                // PlayReady XML is UTF-16LE
                return new TextDecoder('utf-16le').decode(xmlBytes);
            }
            offset += len;
        }
    } catch (e) {
        console.warn('Failed to parse PlayReady PSSH data:', e);
    }
    return null;
}

/**
 * @param {import('@/types.js').Box} box
 * @param {DataView} view
 */
export function parsePssh(box, view) {
    const p = new BoxParser(box, view);
    const { version } = p.readVersionAndFlags();

    if (version === null) {
        p.finalize();
        return;
    }

    const systemIdBytes = new Uint8Array(
        p.view.buffer,
        p.view.byteOffset + p.offset,
        16
    );
    const systemId = formatUUID(systemIdBytes);
    box.details['System ID'] = {
        value: systemId,
        offset: p.box.offset + p.offset,
        length: 16,
    };
    p.offset += 16;
    box.systemId = systemId;

    const kids = [];
    if (version > 0) {
        const keyIdCount = p.readUint32('Key ID Count');
        if (keyIdCount !== null) {
            for (let i = 0; i < keyIdCount; i++) {
                if (!p.checkBounds(16)) break;
                const kidBytes = new Uint8Array(
                    p.view.buffer,
                    p.view.byteOffset + p.offset,
                    16
                );
                kids.push(formatUUID(kidBytes));
                p.offset += 16;
            }
        }
    }
    box.kids = kids;

    const dataSize = p.readUint32('Data Size');
    if (dataSize !== null && p.checkBounds(dataSize)) {
        const dataBytes = new Uint8Array(
            p.view.buffer,
            p.view.byteOffset + p.offset,
            dataSize
        );
        box.data = btoa(String.fromCharCode.apply(null, dataBytes));

        // --- Heuristics for System-Specific Data ---

        // Widevine
        if (systemId === 'edef8ba9-79d6-4ace-a3c8-27dcd51d21ed') {
            const licenseUrl = getWidevineLicenseUrl(dataBytes);
            if (licenseUrl) {
                box.details['license_url'] = {
                    value: licenseUrl,
                    offset: 0, // Derived
                    length: 0,
                };
            }
        }

        // PlayReady
        if (systemId === '9a04f079-9840-4286-ab92-e65be0885f95') {
            const prXml = getPlayReadyXml(dataBytes);
            if (prXml) {
                // Store as a custom payload object for the UI to render nicely
                box.messagePayloadType = 'xml';
                box.messagePayload = prXml;
                box.details['PlayReady Header'] = {
                    value: 'XML Data Extracted',
                    offset: 0,
                    length: 0,
                };
            }
        }

        p.offset += dataSize;
    }

    p.finalize();
}

export const psshTooltip = {
    pssh: {
        name: 'Protection System Specific Header Box',
        text: "Protection System Specific Header (`pssh`). Contains initialization data that is opaque to the player but essential for a specific Content Protection system (DRM). The player passes this data to the browser's EME APIs to initiate a license request.",
        ref: 'ISO/IEC 23001-7, 5.1',
    },
    'pssh@version': {
        text: 'Version of this box. Version > 0 includes an explicit list of Key IDs (KIDs) that this PSSH data applies to.',
        ref: 'ISO/IEC 23001-7, 5.1.2',
    },
    'pssh@System ID': {
        text: 'A 128-bit UUID that uniquely identifies the Content Protection system (e.g., Widevine, PlayReady, FairPlay).',
        ref: 'ISO/IEC 23001-7, 5.1.2',
    },
    'pssh@Key ID Count': {
        text: 'The number of Key IDs (KIDs) listed in this box (only present if version > 0).',
        ref: 'ISO/IEC 23001-7, 5.1.2',
    },
    'pssh@Data Size': {
        text: 'The size in bytes of the opaque, system-specific initialization data that follows.',
        ref: 'ISO/IEC 23001-7, 5.1.2',
    },
    'pssh@Data': {
        text: 'The opaque, system-specific initialization data payload. This is passed directly to the DRM system.',
        ref: 'ISO/IEC 23001-7, 5.1.2',
    },
    'pssh@license_url': {
        text: 'The license server URL extracted from the PSSH data (Widevine-specific).',
        ref: 'Widevine Specification',
    },
    'pssh@PlayReady Header': {
        text: 'The decoded XML header object found within the PlayReady PSSH payload.',
        ref: 'PlayReady Header Specification',
    },
};
