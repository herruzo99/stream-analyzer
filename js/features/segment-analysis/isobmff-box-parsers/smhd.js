/**
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseSmhd(box, view) {
    let currentParseOffset = box.headerSize; // Start immediately after the standard box header

    box.details['version'] = { value: view.getUint8(currentParseOffset), offset: box.offset + currentParseOffset, length: 1 };
    currentParseOffset += 4; // Skip version (1 byte) and flags (3 bytes)

    box.details['balance'] = { value: view.getInt16(currentParseOffset), offset: box.offset + currentParseOffset, length: 2 };
    // currentParseOffset += 2; // Not needed as it's the last parsed field (reserved next)
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