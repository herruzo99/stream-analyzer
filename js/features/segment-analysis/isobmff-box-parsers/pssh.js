/**
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parsePssh(box, view) {
    const version = view.getUint8(8);
    box.details['version'] = { value: version, offset: box.offset + 8, length: 1 };
    let offset = 12; // after version and flags

    const systemIdBytes = [];
    for (let i = 0; i < 16; i++) {
        systemIdBytes.push(view.getUint8(offset + i).toString(16).padStart(2, '0'));
    }
    box.details['System ID'] = { value: systemIdBytes.join('-'), offset: box.offset + offset, length: 16 };
    offset += 16;

    if (version > 0) {
        const keyIdCount = view.getUint32(offset);
        box.details['Key ID Count'] = { value: keyIdCount, offset: box.offset + offset, length: 4 };
        offset += 4 + (keyIdCount * 16); // Skip Key IDs
    }

    const dataSize = view.getUint32(offset);
    box.details['Data Size'] = { value: dataSize, offset: box.offset + offset, length: 4 };
}

export const psshTooltip = {
    'pssh@System ID': {
        text: 'A 16-byte UUID that uniquely identifies the DRM system (e.g., Widevine, PlayReady).',
        ref: 'ISO/IEC 23001-7, 5.1.2',
    },
    'pssh@Data Size': {
        text: 'The size of the system-specific initialization data that follows.',
        ref: 'ISO/IEC 23001-7, 5.1.2',
    },
};