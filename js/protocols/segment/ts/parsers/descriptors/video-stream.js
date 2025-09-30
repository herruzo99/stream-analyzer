/**
 * Parses a single Video Stream Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.2 & Table 2-46
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed video descriptor.
 */
export function parseVideoStreamDescriptor(view, baseOffset) {
    const byte1 = view.getUint8(0);
    const details = {
        multiple_frame_rate_flag: {
            value: (byte1 >> 7) & 1,
            offset: baseOffset,
            length: 0.125,
        },
        frame_rate_code: {
            value: (byte1 >> 3) & 0x0f,
            offset: baseOffset,
            length: 0.5,
        },
        MPEG_1_only_flag: {
            value: (byte1 >> 2) & 1,
            offset: baseOffset,
            length: 0.125,
        },
        constrained_parameter_flag: {
            value: (byte1 >> 1) & 1,
            offset: baseOffset,
            length: 0.125,
        },
        still_picture_flag: {
            value: byte1 & 1,
            offset: baseOffset,
            length: 0.125,
        },
    };
    if (details.MPEG_1_only_flag.value === 0) {
        const byte2 = view.getUint8(1);
        details.profile_and_level_indication = {
            value: byte2,
            offset: baseOffset + 1,
            length: 1,
        };
        const byte3 = view.getUint8(2);
        details.chroma_format = {
            value: (byte3 >> 6) & 3,
            offset: baseOffset + 2,
            length: 0.25,
        };
        details.frame_rate_extension_flag = {
            value: (byte3 >> 5) & 1,
            offset: baseOffset + 2,
            length: 0.125,
        };
    }
    return details;
}
