/**
 * @param {import('../../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseStsz(box, view) {
    let currentParseOffset = box.headerSize; // Start immediately after the standard box header

    box.details['version'] = { value: view.getUint8(currentParseOffset), offset: box.offset + currentParseOffset, length: 1 };
    currentParseOffset += 4; // Skip version (1 byte) and flags (3 bytes)

    box.details['sample_size'] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;
    box.details['sample_count'] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
    // currentParseOffset += 4; // Not needed if no more fields are parsed
}

export const stszTooltip = {
    stsz: {
        name: 'Sample Size',
        text: 'Specifies the size of each sample.',
        ref: 'ISO/IEC 14496-12, 8.7.3',
    },
    'stsz@version': {
        text: 'Version of this box, always 0.',
        ref: 'ISO/IEC 14496-12, 8.7.3.2.2',
    },
    'stsz@sample_size': {
        text: 'Default sample size. If 0, sizes are in the entry table.',
        ref: 'ISO/IEC 14496-12, 8.7.3.2.2',
    },
    'stsz@sample_count': {
        text: 'The total number of samples in the track.',
        ref: 'ISO/IEC 14496-12, 8.7.3.2.2',
    },
}