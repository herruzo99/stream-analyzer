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
};
