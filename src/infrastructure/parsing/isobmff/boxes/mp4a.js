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
        text: 'MP4 Audio Sample Entry (`mp4a`). Defines the coding type and initialization information for an MPEG-4 audio track, most commonly Advanced Audio Coding (AAC). It contains the default audio parameters and is parent to the `esds` box for detailed configuration.',
        ref: 'ISO/IEC 14496-12, 12.2.3 & ISO/IEC 14496-14',
    },
    'mp4a@data_reference_index': {
        text: 'Index to the Data Reference Box (`dref`), indicating where the media data is stored.',
        ref: 'ISO/IEC 14496-12, 8.5.2.2',
    },
    'mp4a@channelcount': {
        text: 'The number of audio channels. Common values are 1 (mono) and 2 (stereo). This should be considered a default and can be overridden by more specific information in the `esds` box.',
        ref: 'ISO/IEC 14496-12, 12.2.3.2',
    },
    'mp4a@samplesize': {
        text: 'The bit depth of each audio sample (e.g., 16 for 16-bit audio). Defaults to 16.',
        ref: 'ISO/IEC 14496-12, 12.2.3.2',
    },
    'mp4a@samplerate': {
        text: 'The sampling rate of the audio in samples per second (Hz). This value is the integer part of a 16.16 fixed-point number, so it represents the rate shifted left by 16 bits.',
        ref: 'ISO/IEC 14496-12, 12.2.3.2',
    },
};
