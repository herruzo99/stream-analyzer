/**
 * @param {import('../../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseStsc(box, view) {
    let currentParseOffset = box.headerSize; // Start immediately after the standard box header

    box.details['version'] = { value: view.getUint8(currentParseOffset), offset: box.offset + currentParseOffset, length: 1 };
    currentParseOffset += 4; // Skip version (1 byte) and flags (3 bytes)

    const entryCount = view.getUint32(currentParseOffset);
    box.details['entry_count'] = { value: entryCount, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;

    if (entryCount > 0) {
        // For simplicity, only parse the first entry
        box.details['first_chunk_1'] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
        currentParseOffset += 4;
        box.details['samples_per_chunk_1'] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
        currentParseOffset += 4;
        box.details['sample_description_index_1'] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
        // currentParseOffset += 4; // Not needed as no more fields are parsed
    }
}

export const stscTooltip = {
    stsc: {
        name: 'Sample To Chunk',
        text: 'Maps samples to chunks.',
        ref: 'ISO/IEC 14496-12, 8.7.4',
    },
    'stsc@version': {
        text: 'Version of this box, always 0.',
        ref: 'ISO/IEC 14496-12, 8.7.4.3',
    },
    'stsc@entry_count': {
        text: 'The number of entries in the sample-to-chunk table.',
        ref: 'ISO/IEC 14496-12, 8.7.4.3',
    },
    'stsc@first_chunk_1': {
        text: 'The index of the first chunk in a run of chunks with the same properties.',
        ref: 'ISO/IEC 14496-12, 8.7.4.3',
    },
    'stsc@samples_per_chunk_1': {
        text: 'The number of samples in each of these chunks.',
        ref: 'ISO/IEC 14496-12, 8.7.4.3',
    },
    'stsc@sample_description_index_1': {
        text: 'The index of the sample description for the samples in this run.',
        ref: 'ISO/IEC 14496-12, 8.7.4.3',
    },
}