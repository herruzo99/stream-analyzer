/**
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseTrex(box, view) {
    box.details['track_ID'] = { value: view.getUint32(12), offset: box.offset + 12, length: 4 };
    box.details['default_sample_description_index'] = { value: view.getUint32(16), offset: box.offset + 16, length: 4 };
    box.details['default_sample_duration'] = { value: view.getUint32(20), offset: box.offset + 20, length: 4 };
    box.details['default_sample_size'] = { value: view.getUint32(24), offset: box.offset + 24, length: 4 };
    box.details['default_sample_flags'] = { value: `0x${view.getUint32(28).toString(16)}`, offset: box.offset + 28, length: 4 };
}

export const trexTooltip = {
    trex: {
        name: 'Track Extends',
        text: 'Sets default values for samples in fragments.',
        ref: 'ISO/IEC 14496-12, 8.8.3',
    },
    'trex@track_ID': {
        text: 'The track ID to which these defaults apply.',
        ref: 'ISO/IEC 14496-12, 8.8.3.3',
    },
    'trex@default_sample_description_index': {
        text: 'The default sample description index for samples in fragments.',
        ref: 'ISO/IEC 14496-12, 8.8.3.3',
    },
    'trex@default_sample_duration': {
        text: 'The default duration for samples in fragments.',
        ref: 'ISO/IEC 14496-12, 8.8.3.3',
    },
    'trex@default_sample_size': {
        text: 'The default size for samples in fragments.',
        ref: 'ISO/IEC 14496-12, 8.8.3.3',
    },
    'trex@default_sample_flags': {
        text: 'The default flags for samples in fragments.',
        ref: 'ISO/IEC 14496-12, 8.8.3.3',
    },
}