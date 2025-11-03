import { BoxParser } from '../utils.js';

/**
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseStts(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags();

    const entryCount = p.readUint32('entry_count');
    box.entries = [];

    if (entryCount !== null && entryCount > 0) {
        for (let i = 0; i < entryCount; i++) {
            if (p.stopped) break;
            const count = p.readUint32(`entry_${i}_sample_count`);
            const delta = p.readUint32(`entry_${i}_sample_delta`);
            if (count === null || delta === null) break;
            box.entries.push({ count, delta });
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
    'stts@count': {
        text: 'The number of consecutive samples that have the same duration (delta).',
        ref: 'ISO/IEC 14496-12, 8.6.1.2.3',
    },
    'stts@delta': {
        text: "The duration for each sample in this run, expressed in the media's timescale units.",
        ref: 'ISO/IEC 14496-12, 8.6.1.2.3',
    },
};
