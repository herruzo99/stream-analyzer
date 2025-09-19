/**
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseStsc(box, view) {
    box.details['version'] = { value: view.getUint8(8), offset: box.offset + 8, length: 1 };
    const entryCount = view.getUint32(12);
    box.details['entry_count'] = { value: entryCount, offset: box.offset + 12, length: 4 };
    if (entryCount > 0) {
        box.details['first_chunk_1'] = { value: view.getUint32(16), offset: box.offset + 16, length: 4 };
        box.details['samples_per_chunk_1'] = { value: view.getUint32(20), offset: box.offset + 20, length: 4 };
        box.details['sample_description_index_1'] = { value: view.getUint32(24), offset: box.offset + 24, length: 4 };
    }
}