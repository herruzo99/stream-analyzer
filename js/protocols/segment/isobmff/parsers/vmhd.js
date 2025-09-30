import { BoxParser } from '../utils.js';

/**
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseVmhd(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags();
    p.readUint16('graphicsmode');

    const r = p.readUint16('opcolor_r');
    const g = p.readUint16('opcolor_g');
    const b = p.readUint16('opcolor_b');

    if (r !== null && g !== null && b !== null) {
        const baseOffset = box.details['opcolor_r'].offset;
        delete box.details['opcolor_r'];
        delete box.details['opcolor_g'];
        delete box.details['opcolor_b'];
        box.details['opcolor'] = {
            value: `R:${r}, G:${g}, B:${b}`,
            offset: baseOffset,
            length: 6,
        };
    }
    p.finalize();
}

export const vmhdTooltip = {
    vmhd: {
        name: 'Video Media Header',
        text: 'Contains header information specific to video media.',
        ref: 'ISO/IEC 14496-12, 8.4.5.2',
    },
    'vmhd@version': {
        text: 'Version of this box, always 0.',
        ref: 'ISO/IEC 14496-12, 8.4.5.2.2',
    },
    'vmhd@flags': {
        text: 'A bitmask of flags, should have the low bit set to 1.',
        ref: 'ISO/IEC 14496-12, 8.4.5.2',
    },
    'vmhd@graphicsmode': {
        text: 'Specifies a composition mode for this video track.',
        ref: 'ISO/IEC 14496-12, 8.4.5.2.2',
    },
    'vmhd@opcolor': {
        text: 'A set of RGB color values available for use by graphics modes.',
        ref: 'ISO/IEC 14496-12, 8.4.5.2.2',
    },
};
