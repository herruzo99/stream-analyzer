import { BoxParser } from '../utils.js';

/**
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseStsc(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags();

    const entryCount = p.readUint32('entry_count');

    if (entryCount !== null && entryCount > 0) {
        const maxEntriesToShow = 10;
        for (let i = 0; i < entryCount; i++) {
            if (p.stopped) break;
            if (i < maxEntriesToShow) {
                const entryPrefix = `entry_${i + 1}`;
                p.readUint32(`${entryPrefix}_first_chunk`);
                p.readUint32(`${entryPrefix}_samples_per_chunk`);
                p.readUint32(`${entryPrefix}_sample_description_index`);
            } else {
                p.offset += 12; // Skip 12 bytes for each remaining entry
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

export const stscTooltip = {
    stsc: {
        name: 'Sample To Chunk',
        text: 'Maps samples to chunks.',
        ref: 'ISO/IEC 14496-12, 8.7.4',
    },
    'stsc@version': {
        text: 'Version of this box, always 0.',
        ref: 'ISO/IEC 14496-12, 8.7.4.3',
    },
    'stsc@entry_count': {
        text: 'The number of entries in the sample-to-chunk table.',
        ref: 'ISO/IEC 14496-12, 8.7.4.3',
    },
    'stsc@entry_1_first_chunk': {
        text: 'The index of the first chunk in a run of chunks with the same properties.',
        ref: 'ISO/IEC 14496-12, 8.7.4.3',
    },
    'stsc@entry_1_samples_per_chunk': {
        text: 'The number of samples in each of these chunks.',
        ref: 'ISO/IEC 14496-12, 8.7.4.3',
    },
    'stsc@entry_1_sample_description_index': {
        text: 'The index of the sample description for the samples in this run.',
        ref: 'ISO/IEC 14496-12, 8.7.4.3',
    },
};
