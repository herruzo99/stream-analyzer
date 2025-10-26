import { BoxParser } from '../utils.js';
import { formatUUID } from '../../utils/drm.js';

/**
 * Extracts the license server URL from a Widevine PSSH data payload.
 * @param {Uint8Array} data - The PSSH data payload.
 * @returns {string | null} The license server URL or null if not found.
 */
function getWidevineLicenseUrl(data) {
    try {
        // The Widevine PSSH payload is a protobuf. We can do a simple text search for 'https://'.
        const text = new TextDecoder('utf-8', { fatal: false }).decode(data);
        const match = text.match(/https?:\/\/[^\s'"]+/);
        return match ? match[0] : null;
    } catch (e) {
        return null;
    }
}

/**
 * @param {import('../parser.js').Box} box
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
    box.systemId = systemId; // Store for adapter

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
    box.kids = kids; // Store for adapter

    const dataSize = p.readUint32('Data Size');
    if (dataSize !== null && p.checkBounds(dataSize)) {
        const dataBytes = new Uint8Array(
            p.view.buffer,
            p.view.byteOffset + p.offset,
            dataSize
        );
        box.data = btoa(String.fromCharCode.apply(null, dataBytes));

        // Attempt to find license URL for Widevine
        if (systemId === 'edef8ba9-79d6-4ace-a3c8-27dcd51d21ed') {
            const licenseUrl = getWidevineLicenseUrl(dataBytes);
            if (licenseUrl) {
                box.details['license_url'] = {
                    value: licenseUrl,
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
};
