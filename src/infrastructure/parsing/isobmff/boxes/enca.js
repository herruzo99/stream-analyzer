import { BoxParser } from '../utils.js';

/**
 * Parses the 'enca' (Encrypted Audio Sample Entry) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseEnca(box, view) {
    const p = new BoxParser(box, view);

    // From SampleEntry
    p.skip(6, 'reserved_sample_entry');
    p.readUint16('data_reference_index');

    // From AudioSampleEntry
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

    // Child boxes (like sinf) will be parsed by the main parser.
}

export const encaTooltip = {
    enca: {
        name: 'Encrypted Audio Sample Entry',
        text: 'Encrypted Audio Sample Entry (`enca`). A sample entry that acts as a wrapper for an audio stream that has been encrypted. It contains a Protection Scheme Information (`sinf`) box which details the encryption scheme and original format.',
        ref: 'ISO/IEC 14496-12, 8.12',
    },
    'enca@data_reference_index': {
        text: 'Index into the Data Reference Box (`dref`), specifying the location of the media data.',
        ref: 'ISO/IEC 14496-12, 8.5.2.2',
    },
    'enca@channelcount': {
        text: 'The number of audio channels (e.g., 2 for stereo). This should match the original, unencrypted audio format.',
        ref: 'ISO/IEC 14496-12, 12.2.3.2',
    },
    'enca@samplesize': {
        text: 'The bit depth of each audio sample (e.g., 16 for 16-bit audio).',
        ref: 'ISO/IEC 14496-12, 12.2.3.2',
    },
    'enca@samplerate': {
        text: 'The sampling rate of the audio in samples per second (Hz). This is the integer part of a 16.16 fixed-point number.',
        ref: 'ISO/IEC 14496-12, 12.2.3.2',
    },
};
