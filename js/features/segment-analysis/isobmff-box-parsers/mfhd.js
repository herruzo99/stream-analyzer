/**
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseMfhd(box, view) {
    box.details['sequence_number'] = { value: view.getUint32(12), offset: box.offset + 12, length: 4 };
}