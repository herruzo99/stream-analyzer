/**
 * Parses the 'stsd' (Sample Description) box. This is a container for sample entries.
 * The sample entries themselves do not have standard box headers, so they are parsed specially.
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseStsd(box, view) {
    box.details['version'] = { value: view.getUint8(8), offset: box.offset + 8, length: 1 };
    box.details['entry_count'] = { value: view.getUint32(12), offset: box.offset + 12, length: 4 };
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
    // Tooltips for common sample entries
    avc1: {
        name: 'AVC Sample Entry',
        text: 'Defines a video sample encoded with H.264/AVC. Contains an avcC box.',
        ref: 'ISO/IEC 14496-15, D.2.1',
    },
    mp4a: {
        name: 'MP4 Audio Sample Entry',
        text: 'Defines an audio sample for MPEG-4 audio. Contains an esds box.',
        ref: 'ISO/IEC 14496-14, 5.6.1',
    },
};