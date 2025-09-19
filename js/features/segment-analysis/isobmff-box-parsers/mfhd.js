/**
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseMfhd(box, view) {
    box.details['sequence_number'] = { value: view.getUint32(12), offset: box.offset + 12, length: 4 };
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