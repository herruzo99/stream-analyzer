import { BoxParser } from '../utils.js';

const TKHD_FLAGS_SCHEMA = {
    0x000001: 'track_enabled',
    0x000002: 'track_in_movie',
    0x000004: 'track_in_preview',
};

/**
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseTkhd(box, view) {
    const p = new BoxParser(box, view);
    const { version } = p.readVersionAndFlags(TKHD_FLAGS_SCHEMA);

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
        name: 'Track Header Box',
        text: 'Track Header Box (`tkhd`). Specifies the characteristics of a single track, such as its duration, identifier, and spatial properties. It is a mandatory box within a `trak` box.',
        ref: 'ISO/IEC 14496-12, 8.3.2',
    },
    'tkhd@flags': {
        text: 'A bitfield indicating track properties: enabled, used in movie, and used in preview.',
        ref: 'ISO/IEC 14496-12, 8.3.2.2',
    },
    'tkhd@version': {
        text: 'Version of this box (0 or 1). Affects the size of time and duration fields, with version 1 using 64-bit values for longer content.',
        ref: 'ISO/IEC 14496-12, 8.3.2.2',
    },
    'tkhd@creation_time': {
        text: 'The creation time of this track, in seconds since midnight, Jan. 1, 1904, in UTC.',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@modification_time': {
        text: 'The most recent time the track was modified.',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@track_ID': {
        text: 'A unique, non-zero integer that identifies this track over the entire lifetime of the presentation.',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@duration': {
        text: "The duration of this track expressed in the movie's timescale (from the `mvhd` box). This is the post-edit duration.",
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@layer': {
        text: 'Specifies the front-to-back ordering of video tracks for composition. Tracks with lower layer numbers are displayed in front of tracks with higher layer numbers.',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@alternate_group': {
        text: 'An integer that groups tracks that are alternatives to each other (e.g., different bitrates or languages). A player should only play one track from a given alternate group at a time.',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@volume': {
        text: "For audio tracks, a fixed-point 8.8 number indicating the track's relative volume. A value of 1.0 is full volume.",
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@matrix': {
        text: 'A 3x3 transformation matrix for the video in this track, defining its scaling, rotation, and position.',
        ref: 'ISO/IEC 14496-12, 8.3.2.3 & 6.2.2',
    },
    'tkhd@width': {
        text: 'The visual presentation width of this track, expressed as a fixed-point 16.16 number. This is the final display width after scaling.',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@height': {
        text: 'The visual presentation height of this track, expressed as a fixed-point 16.16 number.',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
};
