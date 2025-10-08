/**
 * Parses an STD Descriptor.
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseStdDescriptor(view, baseOffset) {
    return {
        leak_valid_flag: {
            value: view.getUint8(0) & 1,
            offset: baseOffset,
            length: 0.125,
        },
    };
}
