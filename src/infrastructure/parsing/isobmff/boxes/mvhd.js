import { BoxParser } from '../utils.js';

/**
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseMvhd(box, view) {
    const p = new BoxParser(box, view);
    const { version } = p.readVersionAndFlags(null); // No flags defined in spec

    if (version === 1) {
        p.readBigUint64('creation_time');
        p.readBigUint64('modification_time');
        p.readUint32('timescale');
        p.readBigUint64('duration');
    } else {
        p.readUint32('creation_time');
        p.readUint32('modification_time');
        p.readUint32('timescale');
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

    p.readInt32('rate'); // Actually a 16.16 fixed point
    p.readInt16('volume'); // Actually a 8.8 fixed point
    p.skip(10, 'reserved');

    const matrixValues = [];
    for (let i = 0; i < 9; i++) {
        matrixValues.push(p.readInt32(`matrix_val_${i}`));
    }
    box.details['matrix'] = {
        value: `[${matrixValues.join(', ')}]`,
        offset: box.details['matrix_val_0'].offset,
        length: 36,
    };
    for (let i = 0; i < 9; i++) delete box.details[`matrix_val_${i}`];

    p.skip(24, 'pre_defined');
    p.readUint32('next_track_ID');
}

export const mvhdTooltip = {
    mvhd: {
        name: 'Movie Header Box',
        text: 'Movie Header Box (`mvhd`). Contains global, media-independent information for the entire presentation, such as its creation time, primary timescale, and overall duration.',
        ref: 'ISO/IEC 14496-12, 8.2.2',
    },
    'mvhd@version': {
        text: 'Version of this box (0 or 1). Version 1 uses 64-bit fields for time and duration values, necessary for presentations longer than ~136 years at a 1kHz timescale.',
        ref: 'ISO/IEC 14496-12, 8.2.2.2',
    },
    'mvhd@creation_time': {
        text: 'The creation time of the presentation, expressed in seconds since midnight, Jan. 1, 1904, in UTC.',
        ref: 'ISO/IEC 14496-12, 8.2.2.3',
    },
    'mvhd@modification_time': {
        text: 'The most recent time the presentation was modified, in the same format as creation_time.',
        ref: 'ISO/IEC 14496-12, 8.2.2.3',
    },
    'mvhd@timescale': {
        text: "The number of time units that pass in one second for the presentation's overall timeline. Individual tracks may have their own timescales.",
        ref: 'ISO/IEC 14496-12, 8.2.2.3',
    },
    'mvhd@duration': {
        text: "The duration of the presentation in the movie's timescale units. This value is derived from the duration of the longest track.",
        ref: 'ISO/IEC 14496-12, 8.2.2.3',
    },
    'mvhd@duration_seconds': {
        text: 'The calculated duration in seconds, derived by dividing the raw duration by the timescale. This is a non-standard, informational field.',
        ref: 'Derived',
    },
    'mvhd@rate': {
        text: 'A 16.16 fixed-point number that specifies the preferred playback rate. A value of 0x00010000 (1.0) represents normal forward playback.',
        ref: 'ISO/IEC 14496-12, 8.2.2.3',
    },
    'mvhd@volume': {
        text: 'An 8.8 fixed-point number that specifies the preferred playback volume. A value of 0x0100 (1.0) represents full volume.',
        ref: 'ISO/IEC 14496-12, 8.2.2.3',
    },
    'mvhd@matrix': {
        text: 'A 3x3 transformation matrix for the video, used for operations like scaling, rotation, and translation of the final composed image.',
        ref: 'ISO/IEC 14496-12, 8.2.2.3 & 6.2.2',
    },
    'mvhd@next_track_ID': {
        text: 'A non-zero integer indicating a value to use for the track ID of the next track to be added to this presentation. It must be larger than the largest track ID already in use.',
        ref: 'ISO/IEC 14496-12, 8.2.2.3',
    },
};
