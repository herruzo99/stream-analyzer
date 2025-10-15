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
        text: 'Pixel Aspect Ratio Box (`pasp`). Specifies the aspect ratio of the pixels in the video track. This is crucial for correctly displaying non-square pixels (e.g., from anamorphic sources) without distortion.',
        ref: 'ISO/IEC 14496-12, 12.1.4',
    },
    'pasp@hSpacing': {
        text: 'The horizontal spacing of a pixel. The ratio `hSpacing / vSpacing` gives the pixel aspect ratio.',
        ref: 'ISO/IEC 14496-12, 12.1.4.1',
    },
    'pasp@vSpacing': {
        text: 'The vertical spacing of a pixel. A 1:1 ratio (e.g., hSpacing=1, vSpacing=1) indicates square pixels.',
        ref: 'ISO/IEC 14496-12, 12.1.4.1',
    },
};
