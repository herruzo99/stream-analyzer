/**
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseStco(box, view) {
    box.details['version'] = { value: view.getUint8(8), offset: box.offset + 8, length: 1 };
    const entryCount = view.getUint32(12);
    box.details['entry_count'] = { value: entryCount, offset: box.offset + 12, length: 4 };
    if (entryCount > 0) {
        box.details['chunk_offset_1'] = { value: view.getUint32(16), offset: box.offset + 16, length: 4 };
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