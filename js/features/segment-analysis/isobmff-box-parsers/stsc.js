/**
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseStsc(box, view) {
    box.details['version'] = { value: view.getUint8(8), offset: box.offset + 8, length: 1 };
    const entryCount = view.getUint32(12);
    box.details['entry_count'] = { value: entryCount, offset: box.offset + 12, length: 4 };
    if (entryCount > 0) {
        box.details['first_chunk_1'] = { value: view.getUint32(16), offset: box.offset + 16, length: 4 };
        box.details['samples_per_chunk_1'] = { value: view.getUint32(20), offset: box.offset + 20, length: 4 };
        box.details['sample_description_index_1'] = { value: view.getUint32(24), offset: box.offset + 24, length: 4 };
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