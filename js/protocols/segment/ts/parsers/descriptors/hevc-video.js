/**
 * Parses an HEVC Video Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.95 & Table 2-111
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed HEVC video descriptor.
 */
export function parseHevcVideoDescriptor(view, baseOffset) {
    const details = {};
    let offset = 0;

    const byte0 = view.getUint8(offset);
    details.profile_space = {
        value: (byte0 >> 6) & 0x03,
        offset: baseOffset + offset,
        length: 0.25,
    };
    details.tier_flag = {
        value: (byte0 >> 5) & 1,
        offset: baseOffset + offset,
        length: 0.125,
    };
    details.profile_idc = {
        value: byte0 & 0x1f,
        offset: baseOffset + offset,
        length: 0.625,
    };
    offset += 1;

    details.profile_compatibility_indication = {
        value: `0x${view.getUint32(offset).toString(16).padStart(8, '0')}`,
        offset: baseOffset + offset,
        length: 4,
    };
    offset += 4;

    const byte5 = view.getUint8(offset);
    details.progressive_source_flag = {
        value: (byte5 >> 7) & 1,
        offset: baseOffset + offset,
        length: 0.125,
    };
    details.interlaced_source_flag = {
        value: (byte5 >> 6) & 1,
        offset: baseOffset + offset,
        length: 0.125,
    };
    details.non_packed_constraint_flag = {
        value: (byte5 >> 5) & 1,
        offset: baseOffset + offset,
        length: 0.125,
    };
    details.frame_only_constraint_flag = {
        value: (byte5 >> 4) & 1,
        offset: baseOffset + offset,
        length: 0.125,
    };
    offset += 1;

    // copied_44bits are skipped for brevity but would be parsed here
    offset += 6; // 44 bits is ~6 bytes

    details.level_idc = {
        value: view.getUint8(offset),
        offset: baseOffset + offset,
        length: 1,
    };
    offset += 1;

    if (offset < view.byteLength) {
        const flags = view.getUint8(offset);
        const temporal_layer_subset_flag = (flags >> 7) & 1;
        details.temporal_layer_subset_flag = {
            value: temporal_layer_subset_flag,
            offset: baseOffset + offset,
            length: 0.125,
        };
        details.HEVC_still_present_flag = {
            value: (flags >> 6) & 1,
            offset: baseOffset + offset,
            length: 0.125,
        };
        details.HEVC_24hr_picture_present_flag = {
            value: (flags >> 5) & 1,
            offset: baseOffset + offset,
            length: 0.125,
        };
        details.sub_pic_hrd_params_not_present_flag = {
            value: (flags >> 4) & 1,
            offset: baseOffset + offset,
            length: 0.125,
        };
        details.HDR_WCG_idc = {
            value: flags & 0x03,
            offset: baseOffset + offset,
            length: 0.25,
        };
        offset += 1;

        if (temporal_layer_subset_flag) {
            const temporal_ids = view.getUint8(offset);
            details.temporal_id_min = {
                value: (temporal_ids >> 5) & 0x07,
                offset: baseOffset + offset,
                length: 0.375,
            };
            details.temporal_id_max = {
                value: temporal_ids & 0x07,
                offset: baseOffset + offset,
                length: 0.375,
            };
        }
    }

    return details;
}
