/**
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseFtyp(box, view) {
    const getString = (start, len) => String.fromCharCode.apply(null, new Uint8Array(view.buffer, view.byteOffset + start, len));
    box.details['Major Brand'] = { value: getString(8, 4), offset: box.offset + 8, length: 4 };
    box.details['Minor Version'] = { value: view.getUint32(12), offset: box.offset + 12, length: 4 };
    let compatibleBrands = [];
    for (let i = 16; i < box.size; i += 4) {
        compatibleBrands.push(getString(i, 4));
    }
    box.details['Compatible Brands'] = { value: compatibleBrands.join(', '), offset: box.offset + 16, length: box.size - 16 };
}