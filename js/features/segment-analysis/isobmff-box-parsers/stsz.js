/**
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseStsz(box, view) {
    box.details['version'] = { value: view.getUint8(8), offset: box.offset + 8, length: 1 };
    box.details['sample_size'] = { value: view.getUint32(12), offset: box.offset + 12, length: 4 };
    box.details['sample_count'] = { value: view.getUint32(16), offset: box.offset + 16, length: 4 };
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