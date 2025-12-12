import { BoxParser } from '../utils.js';

/**
 * Parses the 'hvcC' (HEVC Configuration) box.
 * This implementation correctly parses the configuration and constructs the
 * RFC 6381 compliant codec string needed by WebCodecs.
 * @param {import('@/types.js').Box} box
 * @param {DataView} view
 */
export function parseHvcC(box, view) {
    const p = new BoxParser(box, view);

    p.readUint8('configurationVersion');

    const profileByte = p.readUint8('profile_byte_raw');
    if (profileByte === null) {
        p.finalize();
        return;
    }
    box.details['profile_byte_raw'].internal = true;
    const general_profile_space = (profileByte >> 6) & 0x03;
    const general_tier_flag = (profileByte >> 5) & 0x01;
    const general_profile_idc = profileByte & 0x1f;

    box.details.general_profile_space = {
        value: general_profile_space,
        offset: box.details.profile_byte_raw.offset,
        length: 0.25,
    };
    box.details.general_tier_flag = {
        value: general_tier_flag,
        offset: box.details.profile_byte_raw.offset,
        length: 0.125,
    };
    box.details.general_profile_idc = {
        value: general_profile_idc,
        offset: box.details.profile_byte_raw.offset,
        length: 0.625,
    };

    const general_profile_compatibility_flags = p.readUint32(
        'general_profile_compatibility_flags'
    );
    p.readBytes(6, 'general_constraint_indicator_flags');
    const general_level_idc = p.readUint8('general_level_idc');

    p.readUint16('min_spatial_segmentation_idc');
    p.readUint8('parallelismType');
    p.readUint8('chroma_format_idc');
    p.readUint8('bit_depth_luma_minus8');
    p.readUint8('bit_depth_chroma_minus8');
    p.readUint16('avgFrameRate');
    p.readUint8('constantFrameRate');
    p.readUint8('numTemporalLayers');
    p.readUint8('temporalIdNested');
    p.readUint8('lengthSizeMinusOne');

    // --- Codec String Generation ---
    if (
        general_profile_compatibility_flags !== null &&
        general_level_idc !== null
    ) {
        const codecParts = ['hvc1'];
        // Profile Space
        if (general_profile_space > 0) {
            codecParts.push(
                String.fromCharCode(
                    'A'.charCodeAt(0) + general_profile_space - 1
                )
            );
        }
        // Profile IDC
        codecParts.push(String(general_profile_idc));
        // Profile Compatibility Flags (as hex, reversed byte order)
        let compatHex = general_profile_compatibility_flags
            .toString(16)
            .padStart(8, '0');
        let reversedCompat = '';
        for (let i = compatHex.length; i > 0; i -= 2) {
            reversedCompat += compatHex.substring(i - 2, i);
        }
        codecParts.push(reversedCompat);
        // Tier and Level
        codecParts.push((general_tier_flag ? 'H' : 'L') + general_level_idc);
        // Constraint Flags
        const constraintBytes =
            box.details.general_constraint_indicator_flags?.value;
        if (constraintBytes) {
            let constraintHex = Array.from(constraintBytes, (byte) =>
                byte.toString(16).padStart(2, '0')
            ).join('');
            while (constraintHex.endsWith('00')) {
                constraintHex = constraintHex.substring(
                    0,
                    constraintHex.length - 2
                );
            }
            if (constraintHex) {
                codecParts.push(constraintHex);
            }
        }

        box.details.codecString = {
            value: codecParts.join('.'),
            offset: 0,
            length: 0,
        };
    }
    // --- End Codec String Generation ---

    const numOfArrays = p.readUint8('numOfArrays');
    box.nal_unit_arrays = [];
    if (numOfArrays !== null) {
        for (let i = 0; i < numOfArrays; i++) {
            if (p.stopped) break;

            const arrayByte = p.readUint8(`nal_array_${i}_byte_raw`);
            if (arrayByte === null) break;
            box.details[`nal_array_${i}_byte_raw`].internal = true;

            const array_completeness = (arrayByte >> 7) & 1;
            const NAL_unit_type = arrayByte & 0x3f;

            const nalArray = {
                array_completeness,
                NAL_unit_type,
                nal_units: [],
            };

            const numNalus = p.readUint16(`nal_array_${i}_num_nalus`);
            if (numNalus === null) break;
            box.details[`nal_array_${i}_num_nalus`].internal = true;

            for (let j = 0; j < numNalus; j++) {
                if (p.stopped) break;
                const nalUnitLength = p.readUint16(`nal_${i}_${j}_length`);
                if (nalUnitLength === null) break;
                box.details[`nal_${i}_${j}_length`].internal = true;

                if (p.checkBounds(nalUnitLength)) {
                    const nalUnit = new Uint8Array(
                        p.view.buffer,
                        p.view.byteOffset + p.offset,
                        nalUnitLength
                    );
                    nalArray.nal_units.push({
                        length: nalUnitLength,
                        data: nalUnit,
                    });
                    p.skip(nalUnitLength, `nal_${i}_${j}_data`);
                    box.details[`nal_${i}_${j}_data`].internal = true;
                }
            }
            box.nal_unit_arrays.push(nalArray);
        }
    }

    p.finalize();
}

export const hvcCTooltip = {
    hvcC: {
        name: 'HEVC Decoder Configuration Record',
        text: 'HEVC Configuration Box (`hvcC`). Contains the essential Video Parameter Set (VPS), Sequence Parameter Set (SPS), and Picture Parameter Set (PPS) required by an H.265/HEVC decoder to initialize and decode the video stream.',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@codecString': {
        name: 'Codec String (RFC 6381)',
        text: 'A string representation of the codec profile, level, and constraints. Used by browsers to check for decoding support via the Media Source Extensions (MSE) API.',
        ref: 'RFC 6381',
    },
    'hvcC@configurationVersion': {
        text: 'The version of the hvcC record. Must be 1.',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@general_profile_space': {
        text: 'Specifies the context for the interpretation of general_profile_idc and other profile-related syntax elements.',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@general_tier_flag': {
        text: 'Specifies the tier context for the interpretation of general_level_idc. 0 for Main tier, 1 for High tier.',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@general_profile_idc': {
        text: 'Specifies the profile to which the bitstream conforms.',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@general_profile_compatibility_flags': {
        text: 'A bitfield indicating compatibility with a set of profiles.',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@general_constraint_indicator_flags': {
        text: 'A 48-bit field specifying constraints on the bitstream.',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@general_level_idc': {
        text: 'Specifies the level to which the bitstream conforms, defining limits on parameters like resolution and bitrate.',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@min_spatial_segmentation_idc': {
        text: 'Specifies the minimum spatial segmentation. A value of 0 indicates no constraint.',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@parallelismType': {
        text: 'Indicates the type of parallelism used in encoding (e.g., 0 for mixed-type, 1 for slice-based, 2 for tile-based).',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@chroma_format_idc': {
        text: 'The chroma sampling format (e.g., 1 for 4:2:0, 2 for 4:2:2, 3 for 4:4:4).',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@bit_depth_luma_minus8': {
        text: 'The bit depth of the luma samples minus 8 (e.g., 0 for 8-bit, 2 for 10-bit).',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@bit_depth_chroma_minus8': {
        text: 'The bit depth of the chroma samples minus 8.',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@avgFrameRate': {
        text: 'The average frame rate in frames per 256 seconds. A value of 0 indicates an unspecified frame rate.',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@constantFrameRate': {
        text: 'Indicates if the frame rate is constant (1), or variable (2).',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@numTemporalLayers': {
        text: 'The number of temporal layers present in the bitstream.',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@temporalIdNested': {
        text: 'Indicates if temporal sub-layer access is supported.',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@lengthSizeMinusOne': {
        text: 'The number of bytes used to specify the length of each NAL unit minus one (e.g., 3 for 4-byte length fields).',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@numOfArrays': {
        text: 'The number of arrays of NAL units that follow (e.g., one array for VPS, one for SPS, one for PPS).',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
};
