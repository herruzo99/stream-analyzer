/**
 * Parses an MVC (Multi-view Video Coding) Extension Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.78 & Table 2-98
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseMvcExtensionDescriptor(view, baseOffset) {
    const flags = view.getUint8(4);
    return {
        average_bit_rate: {
            value: view.getUint16(0),
            offset: baseOffset,
            length: 2,
        },
        maximum_bitrate: {
            value: view.getUint16(2),
            offset: baseOffset + 2,
            length: 2,
        },
        view_association_not_present: {
            value: (flags >> 7) & 1,
            offset: baseOffset + 4,
            length: 0.125,
        },
        base_view_is_left_eyeview: {
            value: (flags >> 6) & 1,
            offset: baseOffset + 4,
            length: 0.125,
        },
        view_order_index_min: {
            value: view.getUint16(5) >> 6,
            offset: baseOffset + 5,
            length: 1.25,
        },
        view_order_index_max: {
            value:
                ((view.getUint16(6) & 0xfc00) >> 6) |
                ((view.getUint8(6) & 0x3f) << 4),
            offset: baseOffset + 6,
            length: 1.25,
        }, // Complex packing
        temporal_id_start: {
            value: (view.getUint8(8) >> 5) & 7,
            offset: baseOffset + 8,
            length: 0.375,
        },
        temporal_id_end: {
            value: (view.getUint8(8) >> 2) & 7,
            offset: baseOffset + 8,
            length: 0.375,
        },
        no_sei_nal_unit_present: {
            value: (view.getUint8(8) >> 1) & 1,
            offset: baseOffset + 8,
            length: 0.125,
        },
        no_prefix_nal_unit_present: {
            value: view.getUint8(8) & 1,
            offset: baseOffset + 8,
            length: 0.125,
        },
    };
}
