import { BoxParser } from '../utils.js';

/**
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseStts(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags();

    const entryCount = p.readUint32('entry_count');

    if (entryCount !== null && entryCount > 0) {
        const maxEntriesToShow = 10;
        for (let i = 0; i < entryCount; i++) {
            if (p.stopped) break;
            if (i < maxEntriesToShow) {
                p.readUint32(`sample_count_${i + 1}`);
                p.readUint32(`sample_delta_${i + 1}`);
            } else {
                p.offset += 8; // Skip 8 bytes for each remaining entry
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

export const sttsTooltip = {
    stts: {
        name: 'Decoding Time to Sample Box',
        text: 'Decoding Time to Sample Box (`stts`). A compact, run-length encoded table that maps decoding time to sample numbers. It defines the duration of each sample, allowing a player to calculate the decoding time (DTS) of any sample.',
        ref: 'ISO/IEC 14496-12, 8.6.1.2',
    },
    'stts@version': {
        text: 'Version of this box, which must be 0.',
        ref: 'ISO/IEC 14496-12, 8.6.1.2.3',
    },
    'stts@entry_count': {
        text: 'The number of entries in the time-to-sample table.',
        ref: 'ISO/IEC 14496-12, 8.6.1.2.3',
    },
    'stts@sample_count_1': {
        text: 'For the first entry, this is the number of consecutive samples that have the same duration (delta).',
        ref: 'ISO/IEC 14496-12, 8.6.1.2.3',
    },
    'stts@sample_delta_1': {
        text: "For the first entry, this is the duration for each sample in this run, expressed in the media's timescale units.",
        ref: 'ISO/IEC 14496-12, 8.6.1.2.3',
    },
};
