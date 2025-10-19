import { BoxParser } from '../utils.js';

/**
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseStsc(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags();

    const entryCount = p.readUint32('entry_count');
    box.entries = [];

    if (entryCount !== null && entryCount > 0) {
        for (let i = 0; i < entryCount; i++) {
            if (p.stopped) break;
            if (!p.checkBounds(12)) break;

            const first_chunk = p.view.getUint32(p.offset);
            const samples_per_chunk = p.view.getUint32(p.offset + 4);
            const sample_description_index = p.view.getUint32(p.offset + 8);
            p.offset += 12;

            box.entries.push({
                first_chunk,
                samples_per_chunk,
                sample_description_index,
            });
        }
    }
    p.finalize();
}

export const stscTooltip = {
    stsc: {
        name: 'Sample To Chunk Box',
        text: 'Sample To Chunk Box (`stsc`). A run-length encoded table that maps samples to their containing chunks. This allows for chunks to have a variable number of samples, providing flexibility in media layout.',
        ref: 'ISO/IEC 14496-12, 8.7.4',
    },
    'stsc@version': {
        text: 'Version of this box, which must be 0.',
        ref: 'ISO/IEC 14496-12, 8.7.4.2',
    },
    'stsc@entry_count': {
        text: 'The number of entries in the sample-to-chunk table.',
        ref: 'ISO/IEC 14496-12, 8.7.4.2',
    },
    'stsc@entry_1_first_chunk': {
        text: 'The index of the first chunk in a run of chunks that share the same properties (samples per chunk and sample description). The first chunk in a track is always index 1.',
        ref: 'ISO/IEC 14496-12, 8.7.4.3',
    },
    'stsc@entry_1_samples_per_chunk': {
        text: 'The number of samples contained in each chunk within this run.',
        ref: 'ISO/IEC 14496-12, 8.7.4.3',
    },
    'stsc@entry_1_sample_description_index': {
        text: 'The 1-based index into the Sample Description Box (`stsd`) that describes the samples in this run of chunks.',
        ref: 'ISO/IEC 14496-12, 8.7.4.3',
    },
};