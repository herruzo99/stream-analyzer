/**
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseTfdt(box, view) {
    const version = view.getUint8(8);
    box.details['version'] = { value: version, offset: box.offset + 8, length: 1 };
    if (version === 1) {
        box.details['baseMediaDecodeTime'] = { value: Number(view.getBigUint64(12)), offset: box.offset + 12, length: 8 };
    } else {
        box.details['baseMediaDecodeTime'] = { value: view.getUint32(12), offset: box.offset + 12, length: 4 };
    }
}