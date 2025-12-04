/**
 * Parses an AC-3 Descriptor.
 * ETSI EN 300 468 / ATSC A/52
 * @param {DataView} view
 * @param {number} baseOffset
 */
export function parseAc3Descriptor(view, baseOffset) {
    const byte0 = view.getUint8(0);
    const ac3_type_flag = (byte0 >> 7) & 1;
    const bsid_flag = (byte0 >> 6) & 1;
    const mainid_flag = (byte0 >> 5) & 1;
    const asvc_flag = (byte0 >> 4) & 1;

    const details = {
        sample_rate_code: {
            value: (byte0 >> 5) & 7,
            offset: baseOffset,
            length: 0.375,
        }, // bits 5-7 in some specs, varies by standard version.
        // Simplified parsing for detection
        descriptor_flags: {
            value: `Type:${ac3_type_flag}, BSID:${bsid_flag}, MainID:${mainid_flag}, ASVC:${asvc_flag}`,
            offset: baseOffset,
            length: 1,
        },
    };
    return details;
}

/**
 * Parses an EC-3 (Dolby Digital Plus) Descriptor.
 * ETSI EN 300 468 / ATSC A/52:2012
 * @param {DataView} view
 * @param {number} baseOffset
 */
export function parseEc3Descriptor(view, baseOffset) {
    const details = {};
    let offset = 0;

    const descriptor_length = view.byteLength;
    const byte0 = view.getUint8(offset);
    const data_rate = byte0 >> 5;
    const num_streams = (byte0 & 0x0f) + 1;

    details.data_rate = { value: data_rate, offset: baseOffset, length: 0.375 };
    details.num_streams = {
        value: num_streams,
        offset: baseOffset,
        length: 0.5,
    };
    offset += 1;

    // Loop usually exists here for substreams, but we'll stop at high level
    if (offset < descriptor_length) {
        details.substream_data = {
            value: `${descriptor_length - offset} bytes of substream config`,
            offset: baseOffset + offset,
            length: descriptor_length - offset,
        };
    }

    return details;
}
