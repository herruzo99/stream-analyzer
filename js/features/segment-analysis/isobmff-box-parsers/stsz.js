/**
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseStsz(box, view) {
    box.details['version'] = { value: view.getUint8(8), offset: box.offset + 8, length: 1 };
    box.details['sample_size'] = { value: view.getUint32(12), offset: box.offset + 12, length: 4 };
    box.details['sample_count'] = { value: view.getUint32(16), offset: box.offset + 16, length: 4 };
}