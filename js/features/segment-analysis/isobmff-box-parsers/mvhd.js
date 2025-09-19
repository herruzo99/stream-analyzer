/**
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseMvhd(box, view) {
    const version = view.getUint8(8);
    box.details['version'] = { value: version, offset: box.offset + 8, length: 1 };
    if (version === 1) {
        box.details['creation_time'] = { value: new Date(Number(view.getBigUint64(12)) * 1000 - 2082844800000).toISOString(), offset: box.offset + 12, length: 8 };
        box.details['modification_time'] = { value: new Date(Number(view.getBigUint64(20)) * 1000 - 2082844800000).toISOString(), offset: box.offset + 20, length: 8 };
        box.details['timescale'] = { value: view.getUint32(28), offset: box.offset + 28, length: 4 };
        box.details['duration'] = { value: Number(view.getBigUint64(32)), offset: box.offset + 32, length: 8 };
    } else {
        box.details['creation_time'] = { value: new Date(view.getUint32(12) * 1000 - 2082844800000).toISOString(), offset: box.offset + 12, length: 4 };
        box.details['modification_time'] = { value: new Date(view.getUint32(16) * 1000 - 2082844800000).toISOString(), offset: box.offset + 16, length: 4 };
        box.details['timescale'] = { value: view.getUint32(20), offset: box.offset + 20, length: 4 };
        box.details['duration'] = { value: view.getUint32(24), offset: box.offset + 24, length: 4 };
    }
}