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
        name: 'Movie Fragment Header Box',
        text: 'Movie Fragment Header Box (`mfhd`). Contains a sequence number for a movie fragment (`moof`). This allows a client to verify the correct order of fragments and detect missing ones, which is crucial for live streaming.',
        ref: 'ISO/IEC 14496-12, 8.8.5',
    },
    'mfhd@sequence_number': {
        text: 'The sequence number for this movie fragment. The numbers should increase sequentially for each fragment in the presentation, usually starting from 1.',
        ref: 'ISO/IEC 14496-12, 8.8.5.3',
    },
};