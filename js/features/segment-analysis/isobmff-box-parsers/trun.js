/**
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseTrun(box, view) {
     let offset = 12;
     const flags = view.getUint32(8) & 0x00ffffff;
     box.details['sample_count'] = { value: view.getUint32(offset), offset: box.offset + offset, length: 4 };
     offset += 4;
     if (flags & 0x000001) { // data_offset
        box.details['data_offset'] = { value: view.getInt32(offset), offset: box.offset + offset, length: 4 };
        offset += 4;
     }
     if (flags & 0x000004) { // first_sample_flags
        box.details['first_sample_flags'] = { value: `0x${view.getUint32(offset).toString(16)}`, offset: box.offset + offset, length: 4 };
        offset += 4;
     }
     // TODO: Individual sample parsing is complex and omitted for this refactoring,
     // but this is where it would live.
}