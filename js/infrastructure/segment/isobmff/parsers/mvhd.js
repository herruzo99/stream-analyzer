import { BoxParser } from '../utils.js';

/**
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseMvhd(box, view) {
    const p = new BoxParser(box, view);
    const { version } = p.readVersionAndFlags();

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
        name: 'Movie Header',
        text: 'Contains global information for the presentation (timescale, duration).',
        ref: 'ISO/IEC 14496-12, 8.2.2',
    },
    'mvhd@version': {
        text: 'Version of this box (0 or 1). Affects the size of time and duration fields.',
        ref: 'ISO/IEC 14496-12, 8.2.2.3',
    },
    'mvhd@creation_time': {
        text: 'The creation time of the presentation (in seconds since midnight, Jan. 1, 1904, UTC).',
        ref: 'ISO/IEC 14496-12, 8.2.2.3',
    },
    'mvhd@modification_time': {
        text: 'The most recent time the presentation was modified.',
        ref: 'ISO/IEC 14496-12, 8.2.2.3',
    },
    'mvhd@timescale': {
        text: 'The number of time units that pass in one second for the presentation.',
        ref: 'ISO/IEC 14496-12, 8.2.2.3',
    },
    'mvhd@duration': {
        text: 'The duration of the presentation in units of the timescale.',
        ref: 'ISO/IEC 14496-12, 8.2.2.3',
    },
    'mvhd@rate': {
        text: 'A fixed-point 16.16 number that specifies the preferred playback rate (1.0 is normal speed).',
        ref: 'ISO/IEC 14496-12, 8.2.2.3',
    },
    'mvhd@volume': {
        text: 'A fixed-point 8.8 number that specifies the preferred playback volume (1.0 is full volume).',
        ref: 'ISO/IEC 14496-12, 8.2.2.3',
    },
    'mvhd@matrix': {
        text: 'A transformation matrix for the video, mapping points from video coordinates to display coordinates.',
        ref: 'ISO/IEC 14496-12, 8.2.2.3',
    },
    'mvhd@next_track_ID': {
        text: 'A non-zero integer indicating a value for the track ID of the next track to be added to this presentation.',
        ref: 'ISO/IEC 14496-12, 8.2.2.3',
    },
};
