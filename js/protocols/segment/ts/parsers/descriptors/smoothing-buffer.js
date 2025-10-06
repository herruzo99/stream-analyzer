/**
 * Parses a Smoothing Buffer Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.30 & Table 2-67
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseSmoothingBufferDescriptor(view, baseOffset) {
    if (view.byteLength < 6) {
        return { error: 'Payload too short for SmoothingBufferDescriptor' };
    }

    const byte0 = view.getUint8(0);
    const byte1 = view.getUint8(1);
    const byte2 = view.getUint8(2);
    const sb_leak_rate = ((byte0 & 0x3f) << 16) | (byte1 << 8) | byte2;

    const byte3 = view.getUint8(3);
    const byte4 = view.getUint8(4);
    const byte5 = view.getUint8(5);
    const sb_size = ((byte3 & 0x3f) << 16) | (byte4 << 8) | byte5;

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