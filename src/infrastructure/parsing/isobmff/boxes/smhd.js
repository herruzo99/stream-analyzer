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
        name: 'Sound Media Header Box',
        text: 'Sound Media Header Box (`smhd`). Contains general presentation information for an audio track, independent of the specific codec.',
        ref: 'ISO/IEC 14496-12, 12.2.2',
    },
    'smhd@version': {
        text: 'Version of this box, always 0 in this specification.',
        ref: 'ISO/IEC 14496-12, 12.2.2.2',
    },
    'smhd@balance': {
        text: 'A fixed-point 8.8 number that places a mono audio track in a stereo space. A value of 0.0 is center, -1.0 is full left, and 1.0 is full right.',
        ref: 'ISO/IEC 14496-12, 12.2.2.3',
    },
};
