/**
 * A bit-level reader for parsing H.264 structures like SPS.
 */
class BitReader {
    constructor(buffer) {
        this.buffer = buffer;
        this.bytePosition = 0;
        this.bitPosition = 0;
    }

    readBits(n) {
        let result = 0;
        for (let i = 0; i < n; i++) {
            const byte = this.buffer[this.bytePosition];
            const bit = (byte >> (7 - this.bitPosition)) & 1;
            result = (result << 1) | bit;
            this.bitPosition++;
            if (this.bitPosition === 8) {
                this.bitPosition = 0;
                this.bytePosition++;
            }
        }
        return result;
    }

    // Parses an unsigned exponential-Golomb coded integer.
    readUE() {
        let leadingZeroBits = 0;
        while (
            this.bytePosition < this.buffer.length &&
            this.readBits(1) === 0
        ) {
            leadingZeroBits++;
        }
        if (leadingZeroBits === 0) {
            return 0;
        }
        const codeNum = this.readBits(leadingZeroBits);
        return (1 << leadingZeroBits) - 1 + codeNum;
    }
}

/**
 * Parses a raw H.264 Sequence Parameter Set (SPS) NAL unit.
 * Skips over many fields to extract the most critical information for analysis:
 * profile, level, and resolution.
 * @param {Uint8Array} spsNalUnit - The raw bytes of the SPS NAL unit.
 * @returns {object | null} An object with parsed SPS info, or null on error.
 */
export function parseSPS(spsNalUnit) {
    if (spsNalUnit.length < 4) {
        return null; // Not a valid SPS
    }
    const reader = new BitReader(spsNalUnit);
    reader.readBits(8); // NAL header (forbidden_zero_bit, nal_ref_idc, nal_unit_type)

    const profile_idc = reader.readBits(8);
    reader.readBits(16); // constraint_set flags and reserved bits
    const level_idc = reader.readBits(8);

    reader.readUE(); // seq_parameter_set_id

    if (
        profile_idc === 100 ||
        profile_idc === 110 ||
        profile_idc === 122 ||
        profile_idc === 244 ||
        profile_idc === 44 ||
        profile_idc === 83 ||
        profile_idc === 86 ||
        profile_idc === 118 ||
        profile_idc === 128 ||
        profile_idc === 138
    ) {
        const chroma_format_idc = reader.readUE();
        if (chroma_format_idc === 3) {
            reader.readBits(1); // separate_colour_plane_flag
        }
        reader.readUE(); // bit_depth_luma_minus8
        reader.readUE(); // bit_depth_chroma_minus8
        reader.readBits(1); // qpprime_y_zero_transform_bypass_flag
        const seq_scaling_matrix_present_flag = reader.readBits(1);
        if (seq_scaling_matrix_present_flag) {
            const limit = chroma_format_idc !== 3 ? 8 : 12;
            for (let i = 0; i < limit; i++) {
                if (reader.readBits(1)) {
                    // seq_scaling_list_present_flag[i]
                    // This is complex, just skip for now
                    return {
                        profile_idc,
                        level_idc,
                        error: 'SPS with scaling matrix not fully parsed.',
                    };
                }
            }
        }
    }

    reader.readUE(); // log2_max_frame_num_minus4
    const pic_order_cnt_type = reader.readUE();
    if (pic_order_cnt_type === 0) {
        reader.readUE(); // log2_max_pic_order_cnt_lsb_minus4
    } else if (pic_order_cnt_type === 1) {
        reader.readBits(1); // delta_pic_order_always_zero_flag
        reader.readUE(); // offset_for_non_ref_pic (signed)
        reader.readUE(); // offset_for_top_to_bottom_field (signed)
        const num_ref_frames_in_pic_order_cnt_cycle = reader.readUE();
        for (let i = 0; i < num_ref_frames_in_pic_order_cnt_cycle; i++) {
            reader.readUE(); // offset_for_ref_frame (signed)
        }
    }
    reader.readUE(); // max_num_ref_frames
    reader.readBits(1); // gaps_in_frame_num_value_allowed_flag

    const pic_width_in_mbs_minus1 = reader.readUE();
    const pic_height_in_map_units_minus1 = reader.readUE();
    const frame_mbs_only_flag = reader.readBits(1);

    const width = (pic_width_in_mbs_minus1 + 1) * 16;
    let height =
        (2 - frame_mbs_only_flag) * (pic_height_in_map_units_minus1 + 1) * 16;

    if (frame_mbs_only_flag === 0) {
        reader.readBits(1); // mb_adaptive_frame_field_flag
    }

    reader.readBits(1); // direct_8x8_inference_flag
    const frame_cropping_flag = reader.readBits(1);
    if (frame_cropping_flag) {
        const frame_crop_left_offset = reader.readUE();
        const frame_crop_right_offset = reader.readUE();
        const frame_crop_top_offset = reader.readUE();
        const frame_crop_bottom_offset = reader.readUE();

        const cropUnitX = 1; // Assuming chroma_format_idc is not 4:2:2 or 4:4:4
        const cropUnitY = 2 - frame_mbs_only_flag; // Y multiplier for field coding

        const _croppedWidth =
            width -
            (frame_crop_left_offset + frame_crop_right_offset) * cropUnitX;
        const croppedHeight =
            height -
            (frame_crop_top_offset + frame_crop_bottom_offset) * cropUnitY;
        height = croppedHeight;
    }

    return {
        profile_idc,
        level_idc,
        resolution: `${width}x${height}`,
    };
}
