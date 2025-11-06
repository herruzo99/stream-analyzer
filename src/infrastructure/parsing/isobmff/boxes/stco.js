import { BoxParser } from '../utils.js';

/**
 * @param {import('@/types.js').Box} box
 * @param {DataView} view
 */
export function parseStco(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags();

    const entryCount = p.readUint32('entry_count');
    box.entries = [];

    if (entryCount !== null && entryCount > 0) {
        for (let i = 0; i < entryCount; i++) {
            if (p.stopped) break;
            const offsetField = `entry_${i}_chunk_offset`;
            const chunk_offset = p.readUint32(offsetField);
            if (chunk_offset === null) break;
            box.details[offsetField].internal = true;
            box.entries.push({ chunk_offset });
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
    'stco@offset': {
        text: 'The absolute file offset (from the beginning of the file) to the start of a chunk of media data.',
        ref: 'ISO/IEC 14496-12, 8.7.5.3',
    },
};