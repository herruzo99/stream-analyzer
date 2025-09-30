/**
 * Parses a MultiplexBuffer Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.52 & Table 2-79
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseMultiplexBufferDescriptor(view, baseOffset) {
    return {
        MB_buffer_size: {
            value: view.getUint32(0) & 0x00ffffff,
            offset: baseOffset,
            length: 3,
        },
        TB_leak_rate: {
            value: view.getUint32(3) & 0x00ffffff,
            offset: baseOffset + 3,
            length: 3,
        },
    };
}
