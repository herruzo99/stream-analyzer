import { BoxParser } from '../utils.js';

/**
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseStco(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags();

    const entryCount = p.readUint32('entry_count');

    if (entryCount !== null && entryCount > 0) {
        const maxEntriesToShow = 10;
        for (let i = 0; i < entryCount; i++) {
            if (p.stopped) break;

            if (i < maxEntriesToShow) {
                p.readUint32(`chunk_offset_${i + 1}`);
            } else {
                p.offset += 4; // Skip 4 bytes for each remaining entry
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

export const stcoTooltip = {
    stco: {
        name: 'Chunk Offset Box',
        text: 'Chunk Offset Box (`stco`). A compact table that specifies the absolute file offset for the start of each chunk of media data in a track. It is a fundamental part of locating sample data. A 64-bit version, `co64`, exists for very large files.',
        ref: 'ISO/IEC 14496-12, 8.7.5',
    },
    'stco@version': {
        text: 'Version of this box, which must be 0.',
        ref: 'ISO/IEC 14496-12, 8.7.5.2',
    },
    'stco@entry_count': {
        text: 'The total number of entries in the chunk offset table, which corresponds to the total number of chunks in the track.',
        ref: 'ISO/IEC 14496-12, 8.7.5.2',
    },
    'stco@chunk_offset_1': {
        text: 'The absolute file offset (from the beginning of the file) to the start of the first chunk of media data.',
        ref: 'ISO/IEC 14496-12, 8.7.5.3',
    },
};