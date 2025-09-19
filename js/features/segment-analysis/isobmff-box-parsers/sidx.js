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

export const sidxTooltip = {
        sidx: {
        name: 'Segment Index',
        text: 'Provides a compact index of media stream chunks within a segment.',
        ref: 'ISO/IEC 14496-12, 8.16.3',
    },
    'sidx@version': {
        text: 'Version of this box (0 or 1). Affects the size of time and offset fields.',
        ref: 'ISO/IEC 14496-12, 8.16.3.2',
    },
    'sidx@reference_ID': {
        text: 'The stream ID for the reference stream (typically the track ID).',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    'sidx@timescale': {
        text: 'The timescale for time and duration fields in this box, in ticks per second.',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    'sidx@earliest_presentation_time': {
        text: 'The earliest presentation time of any access unit in the first subsegment.',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    'sidx@first_offset': {
        text: 'The byte offset from the end of this box to the first byte of the indexed material.',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    'sidx@reference_count': {
        text: 'The number of subsegment references that follow.',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    'sidx@reference_type_1': {
        text: 'The type of the first reference (0 = media, 1 = sidx box).',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    'sidx@referenced_size_1': {
        text: 'The size in bytes of the referenced item.',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    'sidx@subsegment_duration_1': {
        text: 'The duration of the referenced subsegment in the timescale.',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
}