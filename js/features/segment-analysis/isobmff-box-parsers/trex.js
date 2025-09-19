/**
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseTrex(box, view) {
    box.details['track_ID'] = { value: view.getUint32(12), offset: box.offset + 12, length: 4 };
    box.details['default_sample_description_index'] = { value: view.getUint32(16), offset: box.offset + 16, length: 4 };
    box.details['default_sample_duration'] = { value: view.getUint32(20), offset: box.offset + 20, length: 4 };
    box.details['default_sample_size'] = { value: view.getUint32(24), offset: box.offset + 24, length: 4 };
    box.details['default_sample_flags'] = { value: `0x${view.getUint32(28).toString(16)}`, offset: box.offset + 28, length: 4 };
}