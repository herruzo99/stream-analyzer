import { BoxParser } from '../utils.js';

/**
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseSmhd(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags();
    p.readInt16('balance');
    p.skip(2, 'reserved');
    p.finalize();
}

export const smhdTooltip = {
    smhd: {
        name: 'Sound Media Header',
        text: 'Contains header information specific to sound media.',
        ref: 'ISO/IEC 14496-12, 8.4.5.3',
    },
    'smhd@balance': {
        text: 'A fixed-point 8.8 number that places mono audio tracks in a stereo space (0 = center).',
        ref: 'ISO/IEC 14496-12, 8.4.5.3.2',
    },
    'smhd@version': {
        text: 'Version of this box, always 0.',
        ref: 'ISO/IEC 14496-12, 8.4.5.3.2',
    },
};
