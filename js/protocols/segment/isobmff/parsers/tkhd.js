import { BoxParser } from '../utils.js';

/**
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseTkhd(box, view) {
    const p = new BoxParser(box, view);

    const { version, flags } = p.readVersionAndFlags();

    if (flags !== null) {
        delete box.details['flags'];
        const flagsOffset = box.details['version'].offset + 1;
        box.details['track_enabled'] = {
            value: (flags & 0x1) === 0x1,
            offset: flagsOffset,
            length: 3,
        };
        box.details['track_in_movie'] = {
            value: (flags & 0x2) === 0x2,
            offset: flagsOffset,
            length: 3,
        };
        box.details['track_in_preview'] = {
            value: (flags & 0x4) === 0x4,
            offset: flagsOffset,
            length: 3,
        };
    }

    if (version === 1) {
        p.readBigUint64('creation_time');
        p.readBigUint64('modification_time');
    } else {
        p.readUint32('creation_time');
        p.readUint32('modification_time');
    }

    p.readUint32('track_ID');
    p.skip(4, 'reserved_1');

    if (version === 1) {
        p.readBigUint64('duration');
    } else {
        p.readUint32('duration');
    }

    p.skip(8, 'reserved_2');
    p.readInt16('layer');
    p.readInt16('alternate_group');

    // Volume is a fixed-point 8.8 number
    const volumeFixedPoint = p.readInt16('volume_fixed_point');
    if (volumeFixedPoint !== null) {
        box.details['volume'] = {
            ...box.details['volume_fixed_point'],
            value: (volumeFixedPoint / 256).toFixed(2),
        };
        delete box.details['volume_fixed_point'];
    }

    p.skip(2, 'reserved_3');

    // Transformation Matrix (3x3)
    const matrixValues = [];
    for (let i = 0; i < 9; i++) {
        matrixValues.push(p.readInt32(`matrix_val_${i}`));
    }
    // Consolidate matrix values into a single detail for cleaner display
    const matrixOffset = box.details['matrix_val_0']?.offset;
    if (matrixOffset !== undefined) {
        box.details['matrix'] = {
            value: `[${matrixValues.join(', ')}]`,
            offset: matrixOffset,
            length: 36,
        };
        for (let i = 0; i < 9; i++) delete box.details[`matrix_val_${i}`];
    }

    // Width and Height are fixed-point 16.16 numbers
    const widthFixedPoint = p.readUint32('width_fixed_point');
    if (widthFixedPoint !== null) {
        box.details['width'] = {
            ...box.details['width_fixed_point'],
            value: (widthFixedPoint / 65536).toFixed(2),
        };
        delete box.details['width_fixed_point'];
    }

    const heightFixedPoint = p.readUint32('height_fixed_point');
    if (heightFixedPoint !== null) {
        box.details['height'] = {
            ...box.details['height_fixed_point'],
            value: (heightFixedPoint / 65536).toFixed(2),
        };
        delete box.details['height_fixed_point'];
    }
}

export const tkhdTooltip = {
    tkhd: {
        name: 'Track Header',
        text: 'Specifies characteristics of a single track.',
        ref: 'ISO/IEC 14496-12, 8.3.2',
    },
    'tkhd@track_enabled': {
        text: 'A flag indicating that the track is enabled. A disabled track is treated as if it were not present.',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@track_in_movie': {
        text: 'A flag indicating that the track is used in the presentation.',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@track_in_preview': {
        text: 'A flag indicating that the track is used when previewing the presentation.',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@version': {
        text: 'Version of this box (0 or 1). Affects the size of time and duration fields.',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@creation_time': {
        text: 'The creation time of this track (in seconds since midnight, Jan. 1, 1904, UTC).',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@modification_time': {
        text: 'The most recent time the track was modified.',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@track_ID': {
        text: 'A unique integer that identifies this track.',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@duration': {
        text: "The duration of this track in the movie's timescale.",
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@layer': {
        text: 'Specifies the front-to-back ordering of video tracks; tracks with lower numbers are closer to the viewer.',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@alternate_group': {
        text: 'An integer that specifies a group of tracks that are alternatives to each other.',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@volume': {
        text: "For audio tracks, a fixed-point 8.8 number indicating the track's relative volume.",
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@matrix': {
        text: 'A transformation matrix for the video in this track.',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@width': {
        text: 'The visual presentation width of the track as a fixed-point 16.16 number.',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@height': {
        text: 'The visual presentation height of the track as a fixed-point 16.16 number.',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
};
