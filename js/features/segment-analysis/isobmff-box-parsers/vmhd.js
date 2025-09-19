/**
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseVmhd(box, view) {
    const flags = view.getUint32(8) & 0x00ffffff;
    box.details['version'] = { value: view.getUint8(8), offset: box.offset + 8, length: 1 };
    box.details['flags'] = { value: `0x${flags.toString(16).padStart(6, '0')}`, offset: box.offset + 8, length: 4 };
    box.details['graphicsmode'] = { value: view.getUint16(12), offset: box.offset + 12, length: 2 };
    box.details['opcolor'] = { value: `R:${view.getUint16(14)}, G:${view.getUint16(16)}, B:${view.getUint16(18)}`, offset: box.offset + 14, length: 6 };
}