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
        name: 'Chunk Offset',
        text: 'Specifies the offset of each chunk into the file.',
        ref: 'ISO/IEC 14496-12, 8.7.5',
    },
    'stco@version': {
        text: 'Version of this box, always 0.',
        ref: 'ISO/IEC 14496-12, 8.7.5.3',
    },
    'stco@entry_count': {
        text: 'The number of entries in the chunk offset table.',
        ref: 'ISO/IEC 14496-12, 8.7.5.3',
    },
    'stco@chunk_offset_1': {
        text: 'The file offset of the first chunk.',
        ref: 'ISO/IEC 14496-12, 8.7.5.3',
    },
};
