import { BoxParser } from '../utils.js';

/**
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseElst(box, view) {
    const p = new BoxParser(box, view);
    const { version } = p.readVersionAndFlags();

    if (version === null) {
        p.finalize();
        return;
    }

    const entryCount = p.readUint32('entry_count');

    if (entryCount !== null && entryCount > 0) {
        const maxEntriesToShow = 5;
        const entrySize = version === 1 ? 20 : 12;

        for (let i = 0; i < entryCount; i++) {
            if (p.stopped) break;

            if (i < maxEntriesToShow) {
                const entryPrefix = `entry_${i + 1}`;
                if (version === 1) {
                    p.readBigUint64(`${entryPrefix}_segment_duration`);
                    p.readBigInt64(`${entryPrefix}_media_time`); // Corrected to signed
                } else {
                    p.readUint32(`${entryPrefix}_segment_duration`);
                    p.readInt32(`${entryPrefix}_media_time`);
                }
                p.readInt16(`${entryPrefix}_media_rate_integer`);
                p.readInt16(`${entryPrefix}_media_rate_fraction`);
            } else {
                p.offset += entrySize;
            }
        }

        if (entryCount > maxEntriesToShow) {
            box.details['...more_entries'] = {
                value: `${
                    entryCount - maxEntriesToShow
                } more entries not shown but parsed`,
                offset: 0,
                length: 0,
            };
        }
    }
    p.finalize();
}

export const elstTooltip = {
    elst: {
        name: 'Edit List',
        text: 'Maps the media time-line to the presentation time-line.',
        ref: 'ISO/IEC 14496-12, 8.6.6',
    },
    'elst@version': {
        text: 'Version of this box (0 or 1). Affects the size of duration and time fields.',
        ref: 'ISO/IEC 14496-12, 8.6.6.3',
    },
    'elst@entry_count': {
        text: 'The number of entries in the edit list.',
        ref: 'ISO/IEC 14496-12, 8.6.6.3',
    },
    'elst@entry_1_segment_duration': {
        text: 'The duration of this edit segment in movie timescale units.',
        ref: 'ISO/IEC 14496-12, 8.6.6.3',
    },
    'elst@entry_1_media_time': {
        text: 'The starting time within the media of this edit segment. A value of -1 indicates an empty edit.',
        ref: 'ISO/IEC 14496-12, 8.6.6.3',
    },
};
