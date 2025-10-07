import { BoxParser } from '../utils.js';

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

    // Read System ID as raw bytes and format as UUID
    const systemIdBytes = [];
    for (let i = 0; i < 16; i++) {
        const byte = p.readUint8(`system_id_byte_${i}`);
        if (byte === null) {
            p.finalize();
            return;
        }
        systemIdBytes.push(byte.toString(16).padStart(2, '0'));
    }
    const baseOffset = box.details['system_id_byte_0'].offset;
    for (let i = 0; i < 16; i++) delete box.details[`system_id_byte_${i}`];
    box.details['System ID'] = {
        value: systemIdBytes.join('-'),
        offset: baseOffset,
        length: 16,
    };

    if (version > 0) {
        const keyIdCount = p.readUint32('Key ID Count');
        if (keyIdCount !== null) {
            p.skip(keyIdCount * 16, 'Key IDs');
        }
    }

    const dataSize = p.readUint32('Data Size');
    if (dataSize !== null) {
        p.skip(dataSize, 'Data');
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
