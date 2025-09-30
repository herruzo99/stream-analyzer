/**
 * Parses a Multiplex Buffer Utilization Descriptor.
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseMultiplexBufferUtilizationDescriptor(view, baseOffset) {
    const word1 = view.getUint16(0);
    const word2 = view.getUint16(2);
    return {
        bound_valid_flag: {
            value: (word1 >> 15) & 1,
            offset: baseOffset,
            length: 0.125,
        },
        LTW_offset_lower_bound: {
            value: word1 & 0x7fff,
            offset: baseOffset,
            length: 1.875,
        },
        LTW_offset_upper_bound: {
            value: word2 & 0x7fff,
            offset: baseOffset + 2,
            length: 1.875,
        },
    };
}
