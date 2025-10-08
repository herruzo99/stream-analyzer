/**
 * Parses an IPMP (Intellectual Property Management and Protection) Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6, Tag 0x29
 * The structure is defined in ISO/IEC 13818-11.
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseIpmpDescriptor(view, baseOffset) {
    return {
        ipmp_data: {
            value: `${view.byteLength} bytes of IPMP data`,
            offset: baseOffset,
            length: view.byteLength,
        },
    };
}
