/**
 * Parses an MPEG-4 Video Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.36 & Table 2-70
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseMpeg4VideoDescriptor(view, baseOffset) {
    const profileAndLevel = view.getUint8(0);
    return {
        MPEG4_visual_profile_and_level: {
            value: `0x${profileAndLevel.toString(16).padStart(2, '0')}`,
            offset: baseOffset,
            length: 1,
        },
    };
}
