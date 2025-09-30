/**
 * Parses a Target Background Grid Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.12
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseTargetBackgroundGridDescriptor(view, baseOffset) {
    const word1 = view.getUint16(0);
    const word2 = view.getUint16(2);
    return {
        horizontal_size: {
            value: word1 >> 2,
            offset: baseOffset,
            length: 1.75,
        },
        vertical_size: {
            value: ((word1 & 0x03) << 12) | (word2 >> 4),
            offset: baseOffset + 1.75,
            length: 1.75,
        },
        aspect_ratio_information: {
            value: word2 & 0x0f,
            offset: baseOffset + 3.5,
            length: 0.5,
        },
    };
}
