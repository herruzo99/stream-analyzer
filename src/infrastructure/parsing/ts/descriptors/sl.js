/**
 * Parses an SL (Sync Layer) Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.42
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseSlDescriptor(view, baseOffset) {
    const esId = view.getUint16(0);
    return {
        ES_ID: {
            value: esId,
            offset: baseOffset,
            length: 2,
        },
    };
}
