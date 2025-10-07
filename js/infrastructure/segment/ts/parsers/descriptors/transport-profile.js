/**
 * Parses a Transport_profile_descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.93 & Table 2-109
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseTransportProfileDescriptor(view, baseOffset) {
    const profile = view.getUint8(0);
    const profileMap = {
        0x01: 'Complete profile',
        0x02: 'Adaptive profile',
    };
    return {
        transport_profile: {
            value: profileMap[profile] || `Reserved/User-Private (${profile})`,
            offset: baseOffset,
            length: 1,
        },
    };
}
