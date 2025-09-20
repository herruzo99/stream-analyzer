/**
 * @param {import('../../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseStco(box, view) {
    let currentParseOffset = box.headerSize; // Start immediately after the standard box header

    box.details['version'] = { value: view.getUint8(currentParseOffset), offset: box.offset + currentParseOffset, length: 1 };
    currentParseOffset += 4; // Skip version (1 byte) and flags (3 bytes)

    const entryCount = view.getUint32(currentParseOffset);
    box.details['entry_count'] = { value: entryCount, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;

    if (entryCount > 0) {
        // For simplicity, only parse the first entry
        box.details['chunk_offset_1'] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
        // currentParseOffset += 4; // Not needed as no more fields are parsed
    }
}

export const stcoTooltip = {
    stco: {
        name: 'Chunk Offset',
        text: 'Specifies the offset of each chunk into the file.',
        ref: 'ISO/IEC 14496-12, 8.7.5',
    },
    'stco@version': {
        text: 'Version of this box, always 0.',
        ref: 'ISO/IEC 14496-12, 8.7.5.3',
    },
    'stco@entry_count': {
        text: 'The number of entries in the chunk offset table.',
        ref: 'ISO/IEC 14496-12, 8.7.5.3',
    },
    'stco@chunk_offset_1': {
        text: 'The file offset of the first chunk.',
        ref: 'ISO/IEC 14496-12, 8.7.5.3',
    },
}