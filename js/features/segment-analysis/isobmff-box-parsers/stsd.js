/**
 * Parses the 'stsd' (Sample Description) box. This is a container for sample entries.
 * The sample entries themselves do not have standard box headers, so they are parsed specially.
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseStsd(box, view) {
    let currentParseOffset = box.headerSize; // Start immediately after the standard box header

    box.details['version'] = { value: view.getUint8(currentParseOffset), offset: box.offset + currentParseOffset, length: 1 };
    currentParseOffset += 4; // Skip version (1 byte) and flags (3 bytes)

    box.details['entry_count'] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
    // currentParseOffset += 4; // Not needed as children parsing handled separately
}

export const stsdTooltip = {
    stsd: {
        name: 'Sample Description',
        text: 'Stores information for decoding samples (codec type, initialization data). Contains one or more Sample Entry boxes.',
        ref: 'ISO/IEC 14496-12, 8.5.2',
    },
    'stsd@entry_count': {
        text: 'The number of sample entries that follow.',
        ref: 'ISO/IEC 14496-12, 8.5.2.3',
    },
    'stsd@version': {
        text: 'Version of this box, always 0.',
        ref: 'ISO/IEC 14496-12, 8.5.2.3',
    },
    // Tooltips for common sample entries (avc1, mp4a) are handled via their own boxes now.
};