/**
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseVmhd(box, view) {
    const flags = view.getUint32(8) & 0x00ffffff;
    box.details['version'] = { value: view.getUint8(8), offset: box.offset + 8, length: 1 };
    box.details['flags'] = { value: `0x${flags.toString(16).padStart(6, '0')}`, offset: box.offset + 8, length: 4 };
    box.details['graphicsmode'] = { value: view.getUint16(12), offset: box.offset + 12, length: 2 };
    box.details['opcolor'] = { value: `R:${view.getUint16(14)}, G:${view.getUint16(16)}, B:${view.getUint16(18)}`, offset: box.offset + 14, length: 6 };
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
}