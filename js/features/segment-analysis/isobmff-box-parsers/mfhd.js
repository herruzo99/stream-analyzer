/**
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseMfhd(box, view) {
    let currentParseOffset = box.headerSize; // Start immediately after the standard box header

    // Skip version (1 byte) and flags (3 bytes)
    currentParseOffset += 4;

    box.details['sequence_number'] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
    // currentParseOffset += 4; // Not needed as it's the last parsed field
}

export const mfhdTooltip = {
        mfhd: {
        name: 'Movie Fragment Header',
        text: 'Contains the sequence number of this fragment.',
        ref: 'ISO/IEC 14496-12, 8.8.5',
    },
    'mfhd@sequence_number': {
        text: 'The ordinal number of this fragment, in increasing order.',
        ref: 'ISO/IEC 14496-12, 8.8.5.3',
    },
}