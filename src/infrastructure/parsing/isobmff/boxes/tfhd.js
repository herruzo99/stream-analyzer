import { BoxParser } from '../utils.js';

const TFHD_FLAGS_SCHEMA = {
    0x000001: 'base_data_offset_present',
    0x000002: 'sample_description_index_present',
    0x000008: 'default_sample_duration_present',
    0x000010: 'default_sample_size_present',
    0x000020: 'default_sample_flags_present',
    0x010000: 'duration_is_empty',
    0x020000: 'default_base_is_moof',
};

/**
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseTfhd(box, view) {
    const p = new BoxParser(box, view);
    const { flags } = p.readVersionAndFlags(TFHD_FLAGS_SCHEMA);

    if (flags === null) {
        p.finalize();
        return;
    }

    p.readUint32('track_ID');

    if (flags & 0x000001) {
        // base_data_offset_present
        p.readBigUint64('base_data_offset');
    }
    if (flags & 0x000002) {
        // sample_description_index_present
        p.readUint32('sample_description_index');
    }
    if (flags & 0x000008) {
        // default_sample_duration_present
        p.readUint32('default_sample_duration');
    }
    if (flags & 0x000010) {
        // default_sample_size_present
        p.readUint32('default_sample_size');
    }
    if (flags & 0x000020) {
        // default_sample_flags_present
        const defaultSampleFlags = p.readUint32('default_sample_flags_raw');
        if (defaultSampleFlags !== null) {
            box.details['default_sample_flags'] = {
                value: `0x${defaultSampleFlags.toString(16)}`,
                offset: box.details['default_sample_flags_raw'].offset,
                length: 4,
            };
            delete box.details['default_sample_flags_raw'];
        }
    }
    p.finalize();
}

export const tfhdTooltip = {
    tfhd: {
        name: 'Track Fragment Header Box',
        text: 'Track Fragment Header Box (`tfhd`). Declares metadata and default values for a single track fragment. Its flags control which fields are present, allowing for compact representation when properties are inherited from the `trex` box.',
        ref: 'ISO/IEC 14496-12, 8.8.7',
    },
    'tfhd@track_ID': {
        text: 'The unique identifier of the track to which this fragment belongs.',
        ref: 'ISO/IEC 14496-12, 8.8.7.2',
    },
    'tfhd@flags': {
        text: 'A bitfield indicating which optional fields are present and other properties of the fragment.',
        ref: 'ISO/IEC 14496-12, 8.8.7.2',
    },
    'tfhd@base_data_offset': {
        text: 'The absolute file offset for the data in this fragment. If not present, offsets are calculated relative to the start of the `moof` box or the end of the previous fragment.',
        ref: 'ISO/IEC 14496-12, 8.8.7.2',
    },
    'tfhd@sample_description_index': {
        text: 'The index of the sample description for this fragment.',
        ref: 'ISO/IEC 14496-12, 8.8.7.2',
    },
    'tfhd@default_sample_duration': {
        text: 'Default duration of samples in this track fragment.',
        ref: 'ISO/IEC 14496-12, 8.8.7.2',
    },
    'tfhd@default_sample_size': {
        text: 'Default size of samples in this track fragment.',
        ref: 'ISO/IEC 14496-12, 8.8.7.2',
    },
    'tfhd@default_sample_flags': {
        text: 'Default flags for samples in this track fragment.',
        ref: 'ISO/IEC 14496-12, 8.8.7.2',
    },
};
