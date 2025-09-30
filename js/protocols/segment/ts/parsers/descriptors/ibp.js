/**
 * Parses an IBP Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.34 & Table 2-69
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed IBP descriptor.
 */
export function parseIbpDescriptor(view, baseOffset) {
    const word = view.getUint16(0);
    return {
        closed_gop_flag: {
            value: (word >> 15) & 1,
            offset: baseOffset,
            length: 0.125,
        },
        identical_gop_flag: {
            value: (word >> 14) & 1,
            offset: baseOffset,
            length: 0.125,
        },
        max_gop_length: {
            value: word & 0x3fff,
            offset: baseOffset,
            length: 1.75,
        },
    };
}
