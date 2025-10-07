/**
 * Parses an External ES_ID Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.46 & Table 2-76
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseExternalEsIdDescriptor(view, baseOffset) {
    return {
        External_ES_ID: {
            value: view.getUint16(0),
            offset: baseOffset,
            length: 2,
        },
    };
}
