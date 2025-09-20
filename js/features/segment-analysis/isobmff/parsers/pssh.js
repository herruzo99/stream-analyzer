/**
 * @param {import('../../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parsePssh(box, view) {
    let currentParseOffset = box.headerSize; // Start immediately after the standard box header

    const version = view.getUint8(currentParseOffset);
    box.details['version'] = { value: version, offset: box.offset + currentParseOffset, length: 1 };
    currentParseOffset += 4; // Skip version (1 byte) and flags (3 bytes)

    const systemIdBytes = [];
    for (let i = 0; i < 16; i++) {
        systemIdBytes.push(view.getUint8(currentParseOffset + i).toString(16).padStart(2, '0'));
    }
    box.details['System ID'] = { value: systemIdBytes.join('-'), offset: box.offset + currentParseOffset, length: 16 };
    currentParseOffset += 16;

    if (version > 0) {
        const keyIdCount = view.getUint32(currentParseOffset);
        box.details['Key ID Count'] = { value: keyIdCount, offset: box.offset + currentParseOffset, length: 4 };
        currentParseOffset += 4;
        currentParseOffset += (keyIdCount * 16); // Skip Key IDs
    }

    const dataSize = view.getUint32(currentParseOffset);
    box.details['Data Size'] = { value: dataSize, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;
    // We are not parsing the actual opaque data
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