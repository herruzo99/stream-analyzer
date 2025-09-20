/**
 * @param {import('../../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseSidx(box, view) {
    let currentParseOffset = box.headerSize; // Start immediately after the standard box header

    const version = view.getUint8(currentParseOffset);
    box.details['version'] = { value: version, offset: box.offset + currentParseOffset, length: 1 };
    box.details['flags'] = { value: `0x${(view.getUint32(currentParseOffset) & 0x00ffffff).toString(16)}`, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4; // Skip version (1 byte) and flags (3 bytes)

    box.details['reference_ID'] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;
    box.details['timescale'] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;

    if (version === 1) {
        box.details['earliest_presentation_time'] = { value: Number(view.getBigUint64(currentParseOffset)), offset: box.offset + currentParseOffset, length: 8 };
        currentParseOffset += 8;
        box.details['first_offset'] = { value: Number(view.getBigUint64(currentParseOffset)), offset: box.offset + currentParseOffset, length: 8 };
        currentParseOffset += 8;
    } else {
        box.details['earliest_presentation_time'] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
        currentParseOffset += 4;
        box.details['first_offset'] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
        currentParseOffset += 4;
    }

    box.details['reserved'] = { value: '0', offset: box.offset + currentParseOffset, length: 2 };
    currentParseOffset += 2;
    const reference_count = view.getUint16(currentParseOffset);
    box.details['reference_count'] = { value: reference_count, offset: box.offset + currentParseOffset, length: 2 };
    currentParseOffset += 2;
    
    for (let i = 0; i < reference_count; i++) {
        if (currentParseOffset + 12 > box.size) break;
        const ref_type_and_size = view.getUint32(currentParseOffset);
        box.details[`reference_${i+1}_type`] = { value: (ref_type_and_size >> 31) === 1 ? 'sidx' : 'media', offset: box.offset + currentParseOffset, length: 4 };
        box.details[`reference_${i+1}_size`] = { value: ref_type_and_size & 0x7fffffff, offset: box.offset + currentParseOffset, length: 4 };
        currentParseOffset += 4;
        box.details[`reference_${i+1}_duration`] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
        currentParseOffset += 4;
        const sap_byte = view.getUint32(currentParseOffset);
        box.details[`reference_${i+1}_sap_info`] = { value: `0x${sap_byte.toString(16)}`, offset: box.offset + currentParseOffset, length: 4 };
        currentParseOffset += 4;
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