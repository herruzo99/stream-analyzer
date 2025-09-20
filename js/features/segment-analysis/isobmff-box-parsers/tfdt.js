/**
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseTfdt(box, view) {
    let currentParseOffset = box.headerSize; // Start immediately after the standard box header

    const version = view.getUint8(currentParseOffset);
    box.details['version'] = { value: version, offset: box.offset + currentParseOffset, length: 1 };
    currentParseOffset += 4; // Skip version (1 byte) and flags (3 bytes)

    if (version === 1) {
        box.details['baseMediaDecodeTime'] = { value: Number(view.getBigUint64(currentParseOffset)), offset: box.offset + currentParseOffset, length: 8 };
        // currentParseOffset += 8; // Not needed as it's the last parsed field
    } else {
        box.details['baseMediaDecodeTime'] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
        // currentParseOffset += 4; // Not needed as it's the last parsed field
    }
}

export const tfdtTooltip = {
    tfdt: {
        name: 'Track Fragment Decode Time',
        text: 'Provides the absolute decode time for the first sample.',
        ref: 'ISO/IEC 14496-12, 8.8.12',
    },
    'tfdt@version': {
        text: 'Version of this box (0 or 1). Affects the size of the decode time field.',
        ref: 'ISO/IEC 14496-12, 8.8.12.3',
    },
    'tfdt@baseMediaDecodeTime': {
        text: 'The absolute decode time, in media timescale units, for the first sample in this fragment.',
        ref: 'ISO/IEC 14496-12, 8.8.12.3',
    },
  
}