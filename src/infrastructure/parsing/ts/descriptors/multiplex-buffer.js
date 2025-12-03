/**
 * Parses a MultiplexBuffer Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.52 & Table 2-79
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseMultiplexBufferDescriptor(view, baseOffset) {
    if (view.byteLength < 6) {
        return {
            error: {
                value: 'Payload too short',
                offset: baseOffset,
                length: view.byteLength,
            },
        };
    }

    const byte0 = view.getUint8(0);
    const byte1 = view.getUint8(1);
    const byte2 = view.getUint8(2);

    const byte3 = view.getUint8(3);
    const byte4 = view.getUint8(4);
    const byte5 = view.getUint8(5);

    // MB_buffer_size is 24 bits
    const mbBufferSize = (byte0 << 16) | (byte1 << 8) | byte2;

    // TB_leak_rate is 24 bits
    const tbLeakRate = (byte3 << 16) | (byte4 << 8) | byte5;

    return {
        MB_buffer_size: {
            value: `${mbBufferSize} bytes`,
            offset: baseOffset,
            length: 3,
        },
        TB_leak_rate: {
            value: `${tbLeakRate} units (400 bits/s)`,
            offset: baseOffset + 3,
            length: 3,
        },
    };
}
