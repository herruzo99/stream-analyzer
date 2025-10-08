import { BoxParser } from '../utils.js';

/**
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseTfhd(box, view) {
    const p = new BoxParser(box, view);
    const { flags } = p.readVersionAndFlags();

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
        name: 'Track Fragment Header',
        text: 'Declares defaults for a track fragment.',
        ref: 'ISO/IEC 14496-12, 8.8.7',
    },
    'tfhd@track_ID': {
        text: 'The unique identifier of the track for this fragment.',
        ref: 'ISO/IEC 14496-12, 8.8.7.2',
    },
    'tfhd@flags': {
        text: 'A bitfield indicating which optional fields are present.',
        ref: 'ISO/IEC 14496-12, 8.8.7.2',
    },
    'tfhd@base_data_offset': {
        text: 'The base offset for data within the current mdat.',
        ref: 'ISO/IEC 14496-12, 8.8.7.2',
    },
    'tfhd@sample_description_index': {
        text: 'The index of the sample description for this fragment.',
        ref: 'ISO/IEC 14496-12, 8.8.7.2',
    },
    'tfhd@version': {
        text: 'Version of this box (0 or 1). Affects the size of the decode time field.',
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
