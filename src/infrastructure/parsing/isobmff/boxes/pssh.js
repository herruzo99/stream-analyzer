import { BoxParser } from '../utils.js';
import { formatUUID } from '../../utils/drm.js';

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
    box.details['System ID'] = {
        value: formatUUID(systemIdBytes),
        offset: p.box.offset + p.offset,
        length: 16,
    };
    p.offset += 16;
    box.systemId = formatUUID(systemIdBytes); // Store for adapter

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
        p.offset += dataSize;
    }

    p.finalize();
}

export const psshTooltip = {
    pssh: {
        name: 'Protection System Specific Header',
        text: 'Contains DRM initialization data.',
        ref: 'ISO/IEC 23001-7',
    },
    'pssh@System ID': {
        text: 'A 16-byte UUID that uniquely identifies the DRM system (e.g., Widevine, PlayReady).',
        ref: 'ISO/IEC 23001-7, 5.1.2',
    },
    'pssh@Data Size': {
        text: 'The size of the system-specific initialization data that follows.',
        ref: 'ISO/IEC 23001-7, 5.1.2',
    },
    'pssh@version': {
        text: 'Version of this box (0 or 1). Version 1 includes key IDs.',
        ref: 'ISO/IEC 23001-7, 5.1.2',
    },
    'pssh@Key ID Count': {
        text: 'The number of key IDs present in the box (only for version 1).',
        ref: 'ISO/IEC 23001-7, 5.1.2',
    },
};