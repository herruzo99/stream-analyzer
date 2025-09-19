/**
    @param {import('../isobmff-parser.js').Box} box

    @param {DataView} view
    */
    export function parseStsd(box, view) {
    box.details['version'] = { value: view.getUint8(8), offset: box.offset + 8, length: 1 };
    box.details['entry_count'] = { value: view.getUint32(12), offset: box.offset + 12, length: 4 };
    }

export const stsdTooltip = {
        stsd: {
        name: 'Sample Description',
        text: 'Stores information for decoding samples (codec type).',
        ref: 'ISO/IEC 14496-12, 8.5.2',
    },
    'stsd@version': {
        text: 'Version of this box, always 0.',
        ref: 'ISO/IEC 14496-12, 8.5.2.3',
    },
    'stsd@entry_count': {
        text: 'The number of sample entries that follow.',
        ref: 'ISO/IEC 14496-12, 8.5.2.3',
    },
}