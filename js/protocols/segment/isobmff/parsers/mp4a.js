import { BoxParser } from '../utils.js';

/**
 * Parses the 'mp4a' (MP4 Audio Sample Entry) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseMp4a(box, view) {
    const p = new BoxParser(box, view);

    // SampleEntry fields
    p.skip(6, 'reserved_sample_entry');
    p.readUint16('data_reference_index');

    // AudioSampleEntry fields
    p.skip(8, 'reserved_audio_entry_1');
    p.readUint16('channelcount');
    p.readUint16('samplesize');
    p.skip(2, 'pre_defined');
    p.skip(2, 'reserved_audio_entry_2');

    const samplerateFixedPoint = p.readUint32('samplerate_fixed_point');
    if (samplerateFixedPoint !== null) {
        box.details['samplerate'] = {
            ...box.details['samplerate_fixed_point'],
            value: samplerateFixedPoint >> 16,
        };
        delete box.details['samplerate_fixed_point'];
    }
    // Children (e.g. esds) are parsed by main parser. Do not call finalize().
}

export const mp4aTooltip = {
    mp4a: {
        name: 'MP4 Audio Sample Entry',
        text: 'Defines the coding type and initialization information for an MPEG-4 audio track, typically AAC.',
        ref: 'ISO/IEC 14496-12, 12.2.3',
    },
    'mp4a@data_reference_index': {
        text: 'Index to the Data Reference Box, indicating where the media data is stored.',
        ref: 'ISO/IEC 14496-12, 8.5.2.2',
    },
    'mp4a@channelcount': {
        text: 'The number of audio channels (e.g., 2 for stereo).',
        ref: 'ISO/IEC 14496-12, 12.2.3.2',
    },
    'mp4a@samplesize': {
        text: 'The size of each audio sample in bits. Typically 16.',
        ref: 'ISO/IEC 14496-12, 12.2.3.2',
    },
    'mp4a@samplerate': {
        text: 'The sampling rate of the audio in samples per second (the integer part of a 16.16 fixed-point number).',
        ref: 'ISO/IEC 14496-12, 12.2.3.2',
    },
};
