/**
 * Parses a Stereoscopic_program_info_descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.86 & Table 2-103
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseStereoscopicProgramInfoDescriptor(view, baseOffset) {
    const byte = view.getUint8(0);
    const type = byte & 0x07;
    const typeMap = {
        1: '2D-only (monoscopic)',
        2: 'Frame-compatible stereoscopic 3D',
        3: 'Service-compatible stereoscopic 3D',
    };
    return {
        stereoscopic_service_type: {
            value: typeMap[type] || `Reserved (${type})`,
            offset: baseOffset,
            length: 0.375,
        },
    };
}
