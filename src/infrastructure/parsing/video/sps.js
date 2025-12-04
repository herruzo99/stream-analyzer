import { appLog } from '@/shared/utils/debug.js';

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
            if (this.bytePosition >= this.buffer.length) {
                appLog(
                    'sps.js',
                    'warn',
                    'Attempted to read beyond buffer length.'
                );
                return 0;
            }
            const byte = this.buffer[this.bytePosition];
            const bit = (byte >> (7 - this.bitPosition)) & 1;
            // Use arithmetic multiplication to avoid 32-bit signed integer overflow
            result = result * 2 + bit;
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
        // Find the number of leading zero bits.
        while (
            this.bytePosition < this.buffer.length &&
            this.readBits(1) === 0
        ) {
            leadingZeroBits++;
            if (leadingZeroBits > 32) {
                // Protection against malformed data / infinite loops
                appLog(
                    'sps.js',
                    'error',
                    'Exceeded max leading zero bits in UE parsing.'
                );
                return null;
            }
        }
        if (leadingZeroBits === 0) {
            return 0; // The value is 0.
        }
        // Read the informational bits that follow.
        const codeNum = this.readBits(leadingZeroBits);
        if (codeNum === null) return null;
        return (1 << leadingZeroBits) - 1 + codeNum;
    }
}

/**
 * Parses HRD (Hypothetical Reference Decoder) parameters from the bitstream.
 * Returns the parameters needed for SEI parsing.
 * @param {BitReader} reader - The bit reader instance.
 */
function parseHRDParameters(reader) {
    const cpb_cnt_minus1 = reader.readUE();
    reader.readBits(4); // bit_rate_scale
    reader.readBits(4); // cpb_size_scale
    for (let i = 0; i <= cpb_cnt_minus1; i++) {
        reader.readUE(); // bit_rate_value_minus1[i]
        reader.readUE(); // cpb_size_value_minus1[i]
        reader.readBits(1); // cbr_flag[i]
    }
    const initial_cpb_removal_delay_length_minus1 = reader.readBits(5);
    const cpb_removal_delay_length_minus1 = reader.readBits(5);
    const dpb_output_delay_length_minus1 = reader.readBits(5);
    const time_offset_length = reader.readBits(5);

    return {
        initial_cpb_removal_delay_length_minus1,
        cpb_removal_delay_length_minus1,
        dpb_output_delay_length_minus1,
        time_offset_length,
    };
}

/**
 * Parses a raw H.264 Sequence Parameter Set (SPS) NAL unit.
 * Skips over many fields to extract the most critical information for analysis:
 * profile, level, resolution, frame rate, and HRD params.
 * @param {Uint8Array} spsNalUnit - The raw bytes of the SPS NAL unit.
 * @returns {object | null} An object with parsed SPS info, or null on error.
 */
export function parseSPS(spsNalUnit) {
    appLog('sps.js', 'info', 'Attempting to parse SPS NAL unit.', {
        nalUnit: Array.from(spsNalUnit),
    });
    if (spsNalUnit.length < 4) {
        return null; // Not a valid SPS
    }
    const reader = new BitReader(spsNalUnit);
    reader.readBits(8); // NAL header (forbidden_zero_bit, nal_ref_idc, nal_unit_type)

    const profile_idc = reader.readBits(8);
    reader.readBits(8); // profile_compatibility (constraint_set flags, etc.)
    const level_idc = reader.readBits(8);

    const seq_parameter_set_id = reader.readUE();

    let chroma_format_idc = 1; // Default to 4:2:0 for non-high profiles

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
        chroma_format_idc = reader.readUE();
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
                const seq_scaling_list_present_flag = reader.readBits(1);
                if (seq_scaling_list_present_flag) {
                    // This is complex, just skip for now by returning a partial result
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
        reader.readUE(); // offset_for_non_ref_pic
        reader.readUE(); // offset_for_top_to_bottom_field
        const num_ref_frames_in_pic_order_cnt_cycle = reader.readUE();
        for (let i = 0; i < num_ref_frames_in_pic_order_cnt_cycle; i++) {
            reader.readUE(); // offset_for_ref_frame (signed, but read as unsigned)
        }
    }
    reader.readUE(); // max_num_ref_frames
    reader.readBits(1); // gaps_in_frame_num_value_allowed_flag

    const pic_width_in_mbs_minus1 = reader.readUE();
    const pic_height_in_map_units_minus1 = reader.readUE();
    const frame_mbs_only_flag = reader.readBits(1);

    let width = (pic_width_in_mbs_minus1 + 1) * 16;
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

        const cropUnitX = chroma_format_idc === 1 ? 2 : 1; // 4:2:0 or 4:2:2
        const cropUnitY =
            (chroma_format_idc === 1 ? 2 : 1) * (2 - frame_mbs_only_flag);

        width -= (frame_crop_left_offset + frame_crop_right_offset) * cropUnitX;
        height -=
            (frame_crop_top_offset + frame_crop_bottom_offset) * cropUnitY;
    }

    const vui_parameters_present_flag = reader.readBits(1);
    let frame_rate = null;
    let fixed_frame_rate = null;
    let hrdParams = null;

    if (vui_parameters_present_flag) {
        const aspect_ratio_info_present_flag = reader.readBits(1);
        if (aspect_ratio_info_present_flag) {
            const aspect_ratio_idc = reader.readBits(8);
            if (aspect_ratio_idc === 255) {
                // Extended_SAR
                reader.readBits(16); // sar_width
                reader.readBits(16); // sar_height
            }
        }
        const overscan_info_present_flag = reader.readBits(1);
        if (overscan_info_present_flag) {
            reader.readBits(1); // overscan_appropriate_flag
        }
        const video_signal_type_present_flag = reader.readBits(1);
        if (video_signal_type_present_flag) {
            reader.readBits(3); // video_format
            reader.readBits(1); // video_full_range_flag
            const colour_description_present_flag = reader.readBits(1);
            if (colour_description_present_flag) {
                reader.readBits(8); // colour_primaries
                reader.readBits(8); // transfer_characteristics
                reader.readBits(8); // matrix_coefficients
            }
        }
        const chroma_loc_info_present_flag = reader.readBits(1);
        if (chroma_loc_info_present_flag) {
            reader.readUE(); // chroma_sample_loc_type_top_field
            reader.readUE(); // chroma_sample_loc_type_bottom_field
        }
        const timing_info_present_flag = reader.readBits(1);
        if (timing_info_present_flag) {
            const num_units_in_tick = reader.readBits(32);
            const time_scale = reader.readBits(32);
            const fixed_frame_rate_flag = reader.readBits(1);

            if (num_units_in_tick > 0 && time_scale > 0) {
                frame_rate = time_scale / (2 * num_units_in_tick);
                // Sanity check for unrealistic frame rates
                if (frame_rate > 240) {
                    appLog(
                        'sps.js',
                        'warn',
                        `Calculated frame rate ${frame_rate} exceeds 240fps. Ignoring.`
                    );
                    frame_rate = null;
                }
            }
            fixed_frame_rate = fixed_frame_rate_flag === 1;
        }
        const nal_hrd_parameters_present_flag = reader.readBits(1);
        if (nal_hrd_parameters_present_flag) {
            hrdParams = parseHRDParameters(reader);
        }
        const vcl_hrd_parameters_present_flag = reader.readBits(1);
        if (vcl_hrd_parameters_present_flag) {
            const vclHrdParams = parseHRDParameters(reader);
            if (!hrdParams) hrdParams = vclHrdParams; // Prefer NAL, fallback VCL
        }
        if (
            nal_hrd_parameters_present_flag ||
            vcl_hrd_parameters_present_flag
        ) {
            reader.readBits(1); // low_delay_hrd_flag
        }
        reader.readBits(1); // pic_struct_present_flag
        const bitstream_restriction_flag = reader.readBits(1);
        if (bitstream_restriction_flag) {
            reader.readBits(1); // motion_vectors_over_pic_boundaries_flag
            reader.readUE(); // max_bytes_per_pic_denom
            reader.readUE(); // max_bits_per_mb_denom
            reader.readUE(); // log2_max_mv_length_horizontal
            reader.readUE(); // log2_max_mv_length_vertical
            reader.readUE(); // max_num_reorder_frames
            reader.readUE(); // max_dec_frame_buffering
        }
    }

    const result = {
        seq_parameter_set_id, // Added
        profile_idc,
        level_idc,
        resolution: `${width}x${height}`,
        frame_rate,
        fixed_frame_rate,
        hrdParams,
    };

    appLog('sps.js', 'info', 'Successfully parsed SPS.', result);
    return result;
}
