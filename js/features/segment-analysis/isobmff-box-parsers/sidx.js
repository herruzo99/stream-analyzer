/**
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseSidx(box, view) {
    const version = view.getUint8(8);
    box.details['version'] = { value: version, offset: box.offset + 8, length: 1 };
    box.details['reference_ID'] = { value: view.getUint32(12), offset: box.offset + 12, length: 4 };
    box.details['timescale'] = { value: view.getUint32(16), offset: box.offset + 16, length: 4 };
    let currentOffset = 20;
    if (version === 1) {
        box.details['earliest_presentation_time'] = { value: Number(view.getBigUint64(currentOffset)), offset: box.offset + currentOffset, length: 8 };
        currentOffset += 8;
        box.details['first_offset'] = { value: Number(view.getBigUint64(currentOffset)), offset: box.offset + currentOffset, length: 8 };
        currentOffset += 8;
    } else {
        box.details['earliest_presentation_time'] = { value: view.getUint32(currentOffset), offset: box.offset + currentOffset, length: 4 };
        currentOffset += 4;
        box.details['first_offset'] = { value: view.getUint32(currentOffset), offset: box.offset + currentOffset, length: 4 };
        currentOffset += 4;
    }
    // reserved(16)
    currentOffset += 2;
    const reference_count = view.getUint16(currentOffset);
    box.details['reference_count'] = { value: reference_count, offset: box.offset + currentOffset, length: 2 };
    currentOffset += 2;
    
    // TODO: For simplicity, we only parse the first reference.
    if (reference_count > 0) {
        const ref_type = view.getUint8(currentOffset) >> 7;
        box.details['reference_type_1'] = { value: ref_type === 1 ? 'sidx' : 'media', offset: box.offset + currentOffset, length: 4 }; // This field is 4 bytes
        box.details['referenced_size_1'] = { value: view.getUint32(currentOffset) & 0x7fffffff, offset: box.offset + currentOffset, length: 4 };
        currentOffset += 4;
        box.details['subsegment_duration_1'] = { value: view.getUint32(currentOffset), offset: box.offset + currentOffset, length: 4 };
    }
}