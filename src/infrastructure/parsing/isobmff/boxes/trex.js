import { BoxParser } from '../utils.js';

/**
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseTrex(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags();
    p.readUint32('track_ID');
    p.readUint32('default_sample_description_index');
    p.readUint32('default_sample_duration');
    p.readUint32('default_sample_size');

    const defaultSampleFlags = p.readUint32('default_sample_flags_raw');
    if (defaultSampleFlags !== null) {
        box.details['default_sample_flags'] = {
            value: `0x${defaultSampleFlags.toString(16)}`,
            offset: box.details['default_sample_flags_raw'].offset,
            length: 4,
        };
        delete box.details['default_sample_flags_raw'];
    }
    p.finalize();
}

export const trexTooltip = {
    trex: {
        name: 'Track Extends Box',
        text: 'Track Extends Box (`trex`). A mandatory box within `mvex` for each track that will have samples in movie fragments. It specifies the default values for sample properties (duration, size, flags) used in subsequent fragments, allowing `trun` boxes to be more compact.',
        ref: 'ISO/IEC 14496-12, 8.8.3',
    },
    'trex@track_ID': {
        text: 'The unique identifier of the track to which these default values apply.',
        ref: 'ISO/IEC 14496-12, 8.8.3.3',
    },
    'trex@default_sample_description_index': {
        text: 'The default 1-based index into the `stsd` box for all samples in this track\'s fragments. This is overridden by a value in `tfhd`.',
        ref: 'ISO/IEC 14496-12, 8.8.3.3',
    },
    'trex@default_sample_duration': {
        text: 'The default duration for each sample in this track\'s fragments, in the media\'s timescale.',
        ref: 'ISO/IEC 14496-12, 8.8.3.3',
    },
    'trex@default_sample_size': {
        text: 'The default size in bytes for each sample in this track\'s fragments.',
        ref: 'ISO/IEC 14496-12, 8.8.3.3',
    },
    'trex@default_sample_flags': {
        text: 'The default flags for each sample in this track\'s fragments, encoding information like dependency and sync sample status.',
        ref: 'ISO/IEC 14496-12, 8.8.3.3',
    },
};