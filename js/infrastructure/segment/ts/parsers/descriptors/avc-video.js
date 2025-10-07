/**
 * Parses a single AVC Video Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.64 & Table 2-92
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed AVC video descriptor.
 */
export function parseAvcVideoDescriptor(view, baseOffset) {
    const byte1 = view.getUint8(1); // constraint flags byte
    const byte2 = view.getUint8(3); // presence flags byte
    return {
        profile_idc: { value: view.getUint8(0), offset: baseOffset, length: 1 },
        constraint_set0_flag: {
            value: (byte1 >> 7) & 1,
            offset: baseOffset + 1,
            length: 0.125,
        },
        constraint_set1_flag: {
            value: (byte1 >> 6) & 1,
            offset: baseOffset + 1,
            length: 0.125,
        },
        constraint_set2_flag: {
            value: (byte1 >> 5) & 1,
            offset: baseOffset + 1,
            length: 0.125,
        },
        constraint_set3_flag: {
            value: (byte1 >> 4) & 1,
            offset: baseOffset + 1,
            length: 0.125,
        },
        constraint_set4_flag: {
            value: (byte1 >> 3) & 1,
            offset: baseOffset + 1,
            length: 0.125,
        },
        constraint_set5_flag: {
            value: (byte1 >> 2) & 1,
            offset: baseOffset + 1,
            length: 0.125,
        },
        AVC_compatible_flags: {
            value: byte1 & 3,
            offset: baseOffset + 1,
            length: 0.25,
        },
        level_idc: {
            value: view.getUint8(2),
            offset: baseOffset + 2,
            length: 1,
        },
        AVC_still_present: {
            value: (byte2 >> 7) & 1,
            offset: baseOffset + 3,
            length: 0.125,
        },
        AVC_24_hour_picture_flag: {
            value: (byte2 >> 6) & 1,
            offset: baseOffset + 3,
            length: 0.125,
        },
        Frame_Packing_SEI_not_present_flag: {
            value: (byte2 >> 5) & 1,
            offset: baseOffset + 3,
            length: 0.125,
        },
    };
}
