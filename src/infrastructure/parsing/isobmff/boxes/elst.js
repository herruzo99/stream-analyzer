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
        name: 'Edit List Box',
        text: 'Edit List Box (`elst`). Maps the media timeline to the presentation timeline. It allows for rearranging, repeating, or omitting portions of the media, and is the primary mechanism for creating playback offsets (empty edits).',
        ref: 'ISO/IEC 14496-12, 8.6.6',
    },
    'elst@version': {
        text: 'Version of this box (0 or 1). Version 1 uses 64-bit fields for `segment_duration` and `media_time`, enabling support for very long presentations.',
        ref: 'ISO/IEC 14496-12, 8.6.6.2',
    },
    'elst@entry_count': {
        text: 'The number of edit entries in the list.',
        ref: 'ISO/IEC 14496-12, 8.6.6.2',
    },
    'elst@entry_1_segment_duration': {
        text: "The duration of this edit segment on the presentation timeline, in the movie's timescale units.",
        ref: 'ISO/IEC 14496-12, 8.6.6.3',
    },
    'elst@entry_1_media_time': {
        text: 'The starting time within the media timeline for this edit segment, in the media\'s timescale units. A value of -1 indicates an "empty edit," which creates a gap in the presentation (e.g., for an initial offset).',
        ref: 'ISO/IEC 14496-12, 8.6.6.3',
    },
    'elst@entry_1_media_rate_integer': {
        text: 'The playback rate for this edit segment. A value of 1 indicates normal speed. A value of 0 specifies a "dwell," where the single media frame at `media_time` is held for the `segment_duration`.',
        ref: 'ISO/IEC 14496-12, 8.6.6.3',
    },
    'elst@entry_1_media_rate_fraction': {
        text: 'The fractional part of the playback rate. Always 0 in this version of the specification.',
        ref: 'ISO/IEC 14496-12, 8.6.6.3',
    },
};
