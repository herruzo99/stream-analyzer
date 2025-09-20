/**
 * @param {import('../../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseVmhd(box, view) {
    let currentParseOffset = box.headerSize; // Start immediately after the standard box header

    const flags = view.getUint32(currentParseOffset) & 0x00ffffff; // Flags are part of the full 4-byte field with version
    box.details['version'] = { value: view.getUint8(currentParseOffset), offset: box.offset + currentParseOffset, length: 1 };
    box.details['flags'] = { value: `0x${flags.toString(16).padStart(6, '0')}`, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4; // Move past version and flags

    box.details['graphicsmode'] = { value: view.getUint16(currentParseOffset), offset: box.offset + currentParseOffset, length: 2 };
    currentParseOffset += 2;

    box.details['opcolor'] = { value: `R:${view.getUint16(currentParseOffset)}, G:${view.getUint16(currentParseOffset + 2)}, B:${view.getUint16(currentParseOffset + 4)}`, offset: box.offset + currentParseOffset, length: 6 };
    // currentParseOffset += 6; // Not needed as it's the last parsed field
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