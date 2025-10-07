/**
 * Parses a Stereoscopic_video_info_descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.88 & Table 2-105
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseStereoscopicVideoInfoDescriptor(view, baseOffset) {
    const byte = view.getUint8(0);
    const base_video_flag = byte & 1;
    const details = {
        base_video_flag: {
            value: base_video_flag,
            offset: baseOffset,
            length: 0.125,
        },
    };

    if (base_video_flag) {
        if (view.byteLength > 1) {
            const byte2 = view.getUint8(1);
            details.leftview_flag = {
                value: byte2 & 1,
                offset: baseOffset + 1,
                length: 0.125,
            };
        }
    } else {
        if (view.byteLength > 1) {
            const byte2 = view.getUint8(1);
            details.usable_as_2D = {
                value: (byte2 >> 7) & 1,
                offset: baseOffset + 1,
                length: 0.125,
            };
            details.horizontal_upsampling_factor = {
                value: (byte2 >> 3) & 0x0f,
                offset: baseOffset + 1,
                length: 0.5,
            };
            details.vertical_upsampling_factor = {
                value: ((byte2 & 7) << 1) | (view.getUint8(2) >> 7),
                offset: baseOffset + 1.625,
                length: 0.5,
            };
        }
    }
    return details;
}
