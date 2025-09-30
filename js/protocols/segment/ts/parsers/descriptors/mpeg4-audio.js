/**
 * Parses an MPEG-4 Audio Descriptor.
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseMpeg4AudioDescriptor(view, baseOffset) {
    const profileAndLevel = view.getUint8(0);
    return {
        MPEG4_audio_profile_and_level: {
            value: `0x${profileAndLevel.toString(16).padStart(2, '0')}`,
            offset: baseOffset,
            length: 1,
        },
    };
}
