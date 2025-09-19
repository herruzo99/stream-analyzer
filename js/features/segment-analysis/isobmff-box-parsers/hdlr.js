/**
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseHdlr(box, view) {
    const getString = (start, len) => String.fromCharCode.apply(null, new Uint8Array(view.buffer, view.byteOffset + start, len));
    box.details['handler_type'] = { value: getString(16, 4), offset: box.offset + 16, length: 4 };
    const nameLength = box.size - 32;
    box.details['name'] = { value: getString(32, nameLength).replace(/\0/g, ''), offset: box.offset + 32, length: nameLength };
}