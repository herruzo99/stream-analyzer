/**
 * Parses a Smoothing Buffer Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.30 & Table 2-67
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseSmoothingBufferDescriptor(view, baseOffset) {
    const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    // sb_leak_rate is 22 bits, spanning from bit 2 of byte 0 to bit 7 of byte 2
    const sb_leak_rate =
        ((bytes[0] & 0x03) << 20) |
        (bytes[1] << 12) |
        (bytes[2] << 4) |
        (bytes[3] >> 4);
    // sb_size is 22 bits, spanning from bit 2 of byte 3 to bit 7 of byte 5
    const sb_size =
        ((bytes[3] & 0x03) << 20) |
        (bytes[4] << 12) |
        (bytes[5] << 4) |
        (view.getUint8(6) >> 4);

    return {
        sb_leak_rate: {
            value: `${sb_leak_rate * 400} bps`,
            offset: baseOffset,
            length: 3,
        },
        sb_size: {
            value: `${sb_size} bytes`,
            offset: baseOffset + 3,
            length: 3,
        },
    };
}
