import { BoxParser } from '../utils.js';

/**
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseMfhd(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags();
    p.readUint32('sequence_number');
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
};
