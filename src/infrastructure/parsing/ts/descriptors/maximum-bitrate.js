/**
 * Parses a Maximum Bitrate Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.26 & Table 2-65
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseMaximumBitrateDescriptor(view, baseOffset) {
    if (view.byteLength < 3) {
        return { error: 'Payload too short for MaximumBitrateDescriptor' };
    }
    const byte0 = view.getUint8(0);
    const byte1 = view.getUint8(1);
    const byte2 = view.getUint8(2);

    const maxBitrateValue = ((byte0 & 0x3f) << 16) | (byte1 << 8) | byte2;
    const rate = maxBitrateValue * 400; // Value is in units of 50 bytes/s -> 400 bps

    return {
        reserved: {
            value: (byte0 >> 6) & 0x03,
            offset: baseOffset,
            length: 0.25,
        },
        maximum_bitrate: {
            value: `${(rate / 1000000).toFixed(2)} Mbps`,
            offset: baseOffset,
            length: 3, // The entire field is 3 bytes (2 + 22 bits)
        },
    };
}
