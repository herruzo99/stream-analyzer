import { BoxParser } from '../utils.js';

/**
 * Parses the 'pasp' (Pixel Aspect Ratio) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parsePasp(box, view) {
    const p = new BoxParser(box, view);
    p.readUint32('hSpacing');
    p.readUint32('vSpacing');
    p.finalize();
}

export const paspTooltip = {
    pasp: {
        name: 'Pixel Aspect Ratio Box',
        text: 'Specifies the pixel aspect ratio of the video.',
        ref: 'ISO/IEC 14496-12, 12.1.4',
    },
    'pasp@hSpacing': {
        text: 'The horizontal spacing of a pixel.',
        ref: 'ISO/IEC 14496-12, 12.1.4.1',
    },
    'pasp@vSpacing': {
        text: 'The vertical spacing of a pixel.',
        ref: 'ISO/IEC 14496-12, 12.1.4.1',
    },
};
