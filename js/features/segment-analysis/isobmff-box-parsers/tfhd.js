/**
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseTfhd(box, view) {
    let offset = 12;
    const flags = view.getUint32(8) & 0x00ffffff;
    box.details['track_ID'] = { value: view.getUint32(offset), offset: box.offset + offset, length: 4 };
    offset += 4;
    if (flags & 0x000001) { // base_data_offset
        box.details['base_data_offset'] = { value: Number(view.getBigUint64(offset)), offset: box.offset + offset, length: 8 };
        offset += 8;
    }
    if (flags & 0x000002) { // sample_description_index
        box.details['sample_description_index'] = { value: view.getUint32(offset), offset: box.offset + offset, length: 4 };
        offset += 4;
    }
    if (flags & 0x000008) { // default_sample_duration
        box.details['default_sample_duration'] = { value: view.getUint32(offset), offset: box.offset + offset, length: 4 };
        offset += 4;
    }
    if (flags & 0x000010) { // default_sample_size
        box.details['default_sample_size'] = { value: view.getUint32(offset), offset: box.offset + offset, length: 4 };
        offset += 4;
    }
    if (flags & 0x000020) { // default_sample_flags
        box.details['default_sample_flags'] = { value: `0x${view.getUint32(offset).toString(16)}`, offset: box.offset + offset, length: 4 };
    }
}