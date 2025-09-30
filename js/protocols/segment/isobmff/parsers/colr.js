import { BoxParser } from '../utils.js';

/**
 * Parses the 'colr' (Colour Information) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseColr(box, view) {
    const p = new BoxParser(box, view);
    const colourType = p.readString(4, 'colour_type');

    if (colourType === 'nclx') {
        p.readUint16('colour_primaries');
        p.readUint16('transfer_characteristics');
        p.readUint16('matrix_coefficients');
        const rangeByte = p.readUint8('full_range_flag_byte');
        if (rangeByte !== null) {
            delete box.details['full_range_flag_byte'];
            box.details['full_range_flag'] = {
                value: (rangeByte >> 7) & 1,
                offset: p.box.offset + p.offset - 1,
                length: 0.125,
            };
        }
    } else if (colourType === 'rICC' || colourType === 'prof') {
        p.readRemainingBytes('ICC_profile');
    }
    p.finalize();
}

export const colrTooltip = {
    colr: {
        name: 'Colour Information Box',
        text: 'Provides information about the colour representation of the video, such as primaries and transfer characteristics.',
        ref: 'ISO/IEC 14496-12, 12.1.5',
    },
    'colr@colour_type': {
        text: 'The type of color information provided (e.g., "nclx", "rICC", "prof").',
        ref: 'ISO/IEC 14496-12, 12.1.5.3',
    },
};
