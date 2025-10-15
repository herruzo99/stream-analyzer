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
        text: 'Colour Information Box (`colr`). Provides information about the color representation of the video, such as primaries, transfer characteristics, and matrix coefficients. Essential for correct color reproduction, especially for HDR and wide color gamut content.',
        ref: 'ISO/IEC 14496-12, 12.1.5',
    },
    'colr@colour_type': {
        text: 'A four-character code indicating the type of color information provided. "nclx" is common and specifies non-constant luminance with an explicit set of color parameters.',
        ref: 'ISO/IEC 14496-12, 12.1.5.3',
    },
    'colr@colour_primaries': {
        text: 'An integer identifying the chromaticity of the primary colours and the white point (e.g., 1 = BT.709, 9 = BT.2020).',
        ref: 'ISO/IEC 23091-4 / CICP',
    },
    'colr@transfer_characteristics': {
        text: 'An integer identifying the opto-electronic transfer function of the source video (e.g., 1 = BT.709, 16 = PQ, 18 = HLG).',
        ref: 'ISO/IEC 23091-4 / CICP',
    },
    'colr@matrix_coefficients': {
        text: 'An integer identifying the matrix coefficients used to derive luma and chroma signals from red, green, and blue primaries (e.g., 1 = BT.709, 9 = BT.2020 non-constant luminance).',
        ref: 'ISO/IEC 23091-4 / CICP',
    },
    'colr@full_range_flag': {
        text: 'A flag indicating if the video uses full-range (0-255 for 8-bit) or limited-range (16-235 for 8-bit) sample values.',
        ref: 'ISO/IEC 14496-12, 12.1.5.3',
    },
};