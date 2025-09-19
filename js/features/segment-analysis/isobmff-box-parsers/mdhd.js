/**
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseMdhd(box, view) {
    const version = view.getUint8(8);
    box.details['version'] = { value: version, offset: box.offset + 8, length: 1 };

    const tsOffset = version === 1 ? 20 : 12;
    const durationLength = version === 1 ? 8 : 4;
    box.details['timescale'] = { value: view.getUint32(tsOffset), offset: box.offset + tsOffset, length: 4 };
    box.details['duration'] = { value: version === 1 ? Number(view.getBigUint64(tsOffset + 4)) : view.getUint32(tsOffset + 4), offset: box.offset + tsOffset + 4, length: durationLength };

    const langOffset = tsOffset + durationLength + 4; // 4 bytes for duration + 4 for padding/pre_defined
    const lang = view.getUint16(langOffset);
    const langValue = String.fromCharCode(((lang >> 10) & 0x1f) + 0x60, ((lang >> 5) & 0x1f) + 0x60, (lang & 0x1f) + 0x60);
    box.details['language'] = { value: langValue, offset: box.offset + langOffset, length: 2 };
}