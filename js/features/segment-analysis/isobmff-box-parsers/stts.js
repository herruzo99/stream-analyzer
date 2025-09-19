/**
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseStts(box, view) {
    box.details['version'] = { value: view.getUint8(8), offset: box.offset + 8, length: 1 };
    const entryCount = view.getUint32(12);
    box.details['entry_count'] = { value: entryCount, offset: box.offset + 12, length: 4 };
    if (entryCount > 0) {
        box.details['sample_count_1'] = { value: view.getUint32(16), offset: box.offset + 16, length: 4 };
        box.details['sample_delta_1'] = { value: view.getUint32(20), offset: box.offset + 20, length: 4 };
    }
}

export const sttsTooltip = {
    stts: {
        name: 'Decoding Time to Sample',
        text: 'Maps decoding times to sample numbers.',
        ref: 'ISO/IEC 14496-12, 8.6.1.2',
    },
    'stts@version': {
        text: 'Version of this box, always 0.',
        ref: 'ISO/IEC 14496-12, 8.6.1.2.3',
    },
    'stts@entry_count': {
        text: 'The number of entries in the time-to-sample table.',
        ref: 'ISO/IEC 14496-12, 8.6.1.2.3',
    },
    'stts@sample_count_1': {
        text: 'The number of consecutive samples with the same delta for the first table entry.',
        ref: 'ISO/IEC 14496-12, 8.6.1.2.3',
    },
    'stts@sample_delta_1': {
        text: 'The delta (duration) for each sample in this run for the first table entry.',
        ref: 'ISO/IEC 14496-12, 8.6.1.2.3',
    },
}