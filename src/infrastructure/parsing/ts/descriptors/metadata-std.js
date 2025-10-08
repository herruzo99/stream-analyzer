/**
 * Parses a Metadata STD (System Target Decoder) Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.62 & Table 2-89
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseMetadataStdDescriptor(view, baseOffset) {
    const details = {};
    let offset = 0;

    const byte0 = view.getUint8(offset);
    const byte1 = view.getUint8(offset + 1);
    const byte2 = view.getUint8(offset + 2);
    details.metadata_input_leak_rate = {
        value: ((byte0 & 0x3f) << 16) | (byte1 << 8) | byte2,
        offset: baseOffset + offset,
        length: 3,
    };
    offset += 3;

    const byte3 = view.getUint8(offset);
    const byte4 = view.getUint8(offset + 1);
    const byte5 = view.getUint8(offset + 2);
    details.metadata_buffer_size = {
        value: ((byte3 & 0x3f) << 16) | (byte4 << 8) | byte5,
        offset: baseOffset + offset,
        length: 3,
    };
    offset += 3;

    const byte6 = view.getUint8(offset);
    const byte7 = view.getUint8(offset + 1);
    const byte8 = view.getUint8(offset + 2);
    details.metadata_output_leak_rate = {
        value: ((byte6 & 0x3f) << 16) | (byte7 << 8) | byte8,
        offset: baseOffset + offset,
        length: 3,
    };

    return details;
}
