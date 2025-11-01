import { BoxParser } from '../utils.js';

/**
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseMdhd(box, view) {
    const p = new BoxParser(box, view);
    const { version } = p.readVersionAndFlags(null); // No flags defined in spec

    if (version === null) {
        p.finalize();
        return;
    }

    if (version === 1) {
        p.readBigUint64('creation_time');
        p.readBigUint64('modification_time');
    } else {
        p.readUint32('creation_time');
        p.readUint32('modification_time');
    }

    p.readUint32('timescale');

    if (version === 1) {
        p.readBigUint64('duration');
    } else {
        p.readUint32('duration');
    }

    const timescale = box.details['timescale']?.value;
    const duration = box.details['duration']?.value;
    if (timescale > 0 && duration > 0) {
        box.details['duration_seconds'] = {
            value: `${(duration / timescale).toFixed(3)}s`,
            offset: box.details['duration'].offset,
            length: 0, // This is a derived field, no physical length
        };
    }

    const langBits = p.readUint16('language_bits');
    if (langBits !== null) {
        const langValue = String.fromCharCode(
            ((langBits >> 10) & 0x1f) + 0x60,
            ((langBits >> 5) & 0x1f) + 0x60,
            (langBits & 0x1f) + 0x60
        );
        box.details['language'] = {
            value: langValue,
            offset: box.details['language_bits'].offset,
            length: 2,
        };
        delete box.details['language_bits'];
    }
    p.skip(2, 'pre-defined');
    p.finalize();
}

export const mdhdTooltip = {
    mdhd: {
        name: 'Media Header Box',
        text: 'Media Header Box (`mdhd`). Declares media-independent information for a track, primarily its timescale and duration. This timescale is the fundamental unit for all timing information within this specific track.',
        ref: 'ISO/IEC 14496-12, 8.4.2',
    },
    'mdhd@version': {
        text: 'Version of this box (0 or 1). Version 1 uses 64-bit fields for time and duration values, necessary for very long tracks.',
        ref: 'ISO/IEC 14496-12, 8.4.2.2',
    },
    'mdhd@creation_time': {
        text: 'The creation time of the media in this track, in seconds since midnight, Jan. 1, 1904, in UTC.',
        ref: 'ISO/IEC 14496-12, 8.4.2.3',
    },
    'mdhd@modification_time': {
        text: 'The most recent time the media in this track was modified.',
        ref: 'ISO/IEC 14496-12, 8.4.2.3',
    },
    'mdhd@timescale': {
        text: "The number of time units that pass in one second for this track's media. For example, for video this might be 90000; for audio it's typically the sample rate (e.g., 48000).",
        ref: 'ISO/IEC 14496-12, 8.4.2.3',
    },
    'mdhd@duration': {
        text: "The duration of this track's media in the media's own timescale units. This represents the raw, unedited duration.",
        ref: 'ISO/IEC 14496-12, 8.4.2.3',
    },
    'mdhd@duration_seconds': {
        text: 'The calculated duration in seconds, derived by dividing the raw duration by the timescale. This is a non-standard, informational field.',
        ref: 'Derived',
    },
    'mdhd@language': {
        text: 'An ISO-639-2/T 3-character code that declares the primary language of the media in this track.',
        ref: 'ISO/IEC 14496-12, 8.4.2.3',
    },
};
