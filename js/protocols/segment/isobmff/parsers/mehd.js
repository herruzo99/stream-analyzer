import { BoxParser } from '../utils.js';

/**
 * Parses the 'mehd' (Movie Extends Header) box.
 * @param {import('../parser.js').Box} box
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
        name: 'Movie Extends Header',
        text: 'Provides the overall duration of a fragmented movie, including all fragments.',
        ref: 'ISO/IEC 14496-12, 8.8.2',
    },
    'mehd@fragment_duration': {
        text: "The total duration of the movie in the movie's timescale, including all movie fragments.",
        ref: 'ISO/IEC 14496-12, 8.8.2.3',
    },
};
