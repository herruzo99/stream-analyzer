import { BoxParser } from '../utils.js';

/**
 * Parses the 'mehd' (Movie Extends Header) box.
 * @param {import('@/types.js').Box} box
 * @param {DataView} view
 */
export function parseMehd(box, view) {
    const p = new BoxParser(box, view);
    const { version } = p.readVersionAndFlags();

    if (version === null) {
        p.finalize();
        return;
    }

    if (version === 1) {
        p.readBigUint64('fragment_duration');
    } else {
        p.readUint32('fragment_duration');
    }
    p.finalize();
}

export const mehdTooltip = {
    mehd: {
        name: 'Movie Extends Header Box',
        text: 'Movie Extends Header Box (`mehd`). Provides the total duration of a fragmented movie, including all its movie fragments. If this box is absent, the total duration must be calculated by summing the durations of all fragments.',
        ref: 'ISO/IEC 14496-12, 8.8.2',
    },
    'mehd@version': {
        text: 'Version of this box (0 or 1). Version 1 uses a 64-bit duration field.',
        ref: 'ISO/IEC 14496-12, 8.8.2.2',
    },
    'mehd@fragment_duration': {
        text: "The total duration of the movie in the movie's timescale, including the duration of all movie fragments. For live streams where the total duration is unknown, this value may be set to all 1s.",
        ref: 'ISO/IEC 14496-12, 8.8.2.3',
    },
};
