/**
 * Parses an SVC (Scalable Video Coding) Extension Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.76 & Table 2-97
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseSvcExtensionDescriptor(view, baseOffset) {
    const byte8 = view.getUint8(8);
    const byte9 = view.getUint8(9);
    return {
        width: { value: view.getUint16(0), offset: baseOffset, length: 2 },
        height: { value: view.getUint16(2), offset: baseOffset + 2, length: 2 },
        frame_rate: {
            value: view.getUint16(4),
            offset: baseOffset + 4,
            length: 2,
        },
        average_bitrate: {
            value: view.getUint16(6),
            offset: baseOffset + 6,
            length: 2,
        },
        maximum_bitrate: {
            value: view.getUint16(8),
            offset: baseOffset + 8,
            length: 2,
        },
        dependency_id: {
            value: (byte8 >> 5) & 0x07,
            offset: baseOffset + 10,
            length: 0.375,
        },
        quality_id_start: {
            value: (byte8 >> 1) & 0x0f,
            offset: baseOffset + 10.5,
            length: 0.5,
        },
        quality_id_end: {
            value: ((byte8 & 1) << 3) | (byte9 >> 5),
            offset: baseOffset + 10.875,
            length: 0.5,
        },
        temporal_id_start: {
            value: (byte9 >> 2) & 0x07,
            offset: baseOffset + 11.375,
            length: 0.375,
        },
        temporal_id_end: {
            value: ((byte9 & 0x03) << 1) | (view.getUint8(10) >> 7),
            offset: baseOffset + 11.75,
            length: 0.375,
        },
        no_sei_nal_unit_present: {
            value: (view.getUint8(10) >> 6) & 1,
            offset: baseOffset + 12.125,
            length: 0.125,
        },
    };
}
