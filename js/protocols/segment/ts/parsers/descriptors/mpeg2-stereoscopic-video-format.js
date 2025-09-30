/**
 * Parses an MPEG2_stereoscopic_video_format_descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.84 & Table 2-102
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseMpeg2StereoscopicVideoFormatDescriptor(view, baseOffset) {
    const byte = view.getUint8(0);
    const present_flag = (byte >> 7) & 1;
    const details = {
        stereo_video_arrangement_type_present: {
            value: present_flag,
            offset: baseOffset,
            length: 0.125,
        },
    };
    if (present_flag) {
        details.arrangement_type = {
            value: byte & 0x7f,
            offset: baseOffset,
            length: 0.875,
        };
    }
    return details;
}
